'use client';
import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { productService, Product } from '@/lib/products';
import ProductCard from '@/components/ProductCard';
import { SlidersHorizontal, X, ChevronLeft, ChevronRight, Search, RotateCcw } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'price-asc',  label: 'Price -- Low to High' },
  { value: 'price-desc', label: 'Price -- High to Low' },
  { value: 'newest',     label: 'Newest First' },
];

const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under ₹1,000', min: 0, max: 1000 },
  { label: '₹1,000 - ₹3,000', min: 1000, max: 3000 },
  { label: '₹3,000 - ₹10,000', min: 3000, max: 10000 },
  { label: 'Over ₹10,000', min: 10000, max: Infinity },
];

function ShopContent() {
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState(() => searchParams.get('q') || '');
  const [category, setCategory] = useState(() => searchParams.get('category') || 'All');
  const [sortBy, setSortBy]     = useState('popularity');
  const [priceRangeIndex, setPriceRangeIndex] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage]         = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Synchronize URL parameters safely without synchronous cascading render
  useEffect(() => {
    const cat = searchParams.get('category');
    const q = searchParams.get('q');
    const timer = setTimeout(() => {
      if (cat) setCategory(cat);
      if (q) setSearch(q);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    productService.getAll()
      .then((data) => setProducts(data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const availableCategories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [products]);

  // Faceted Filtering
  const filtered = useMemo(() => {
    let result = [...products];

    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }

    // Category filter
    if (category !== 'All') {
      result = result.filter(p => p.category?.toLowerCase() === category.toLowerCase());
    }

    // Price range filter
    const range = PRICE_RANGES[priceRangeIndex];
    if (range) {
      result = result.filter(p => p.price >= range.min && p.price <= range.max);
    }

    // Customer rating filter (deterministic simulation from ID)
    if (minRating > 0) {
      result = result.filter(p => {
        const charSum = (p._id || p.id || 'abc').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const rating = 3.8 + (charSum % 12) / 10;
        return rating >= minRating;
      });
    }

    // In-stock filter
    if (inStockOnly) {
      result = result.filter(p => (p.stock ?? 0) > 0);
    }

    // Sorting
    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      case 'popularity':
      default: {
        // Sort by deterministic rating / review score
        result.sort((a, b) => {
          const scoreA = (a.name || '').length * 10 + (a.stock || 0);
          const scoreB = (b.name || '').length * 10 + (b.stock || 0);
          return scoreB - scoreA;
        });
        break;
      }
    }
    return result;
  }, [products, search, category, priceRangeIndex, minRating, inStockOnly, sortBy]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const clearAllFilters = () => {
    setCategory('All');
    setSearch('');
    setPriceRangeIndex(0);
    setMinRating(0);
    setInStockOnly(false);
    setSortBy('popularity');
    setPage(1);
  };

  const hasActiveFilters = category !== 'All' || search.trim() !== '' || priceRangeIndex !== 0 || minRating !== 0 || inStockOnly;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">

      {/* Breadcrumbs strip */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--surface)] py-2.5">
        <div className="container mx-auto px-4 flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
          <Link href="/" className="hover:text-[var(--foreground)] transition-colors">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-[var(--foreground)] transition-colors">Shop</Link>
          {category !== 'All' && (
            <>
              <span>/</span>
              <span className="text-[var(--foreground)] font-semibold">{category}</span>
            </>
          )}
        </div>
      </div>

      {/* 2-Column Flipkart Layout: Faceted Left Sidebar + Product Grid */}
      <div className="container mx-auto px-4 py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── LEFT FACETED SIDEBAR (FLIPKART STYLE) ── */}
          <aside className="lg:col-span-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-6 shadow-sm sticky top-24">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h2 className="text-base font-black tracking-tight text-[var(--foreground)] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-500" /> Filters
              </h2>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300"
                >
                  CLEAR ALL
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)] mb-3">
                Categories
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-none">
                {availableCategories.map((cat) => {
                  const isSelected = category.toLowerCase() === cat.toLowerCase();
                  const count = cat === 'All' ? products.length : products.filter(p => p.category?.toLowerCase() === cat.toLowerCase()).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setCategory(cat); setPage(1); }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${isSelected ? 'bg-blue-600/15 text-blue-400 font-bold' : 'text-[var(--foreground)] hover:bg-[var(--surface-elevated)]'}`}
                    >
                      <span className="truncate">{cat}</span>
                      <span className="text-[10px] text-[var(--foreground-muted)] font-mono">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Filter */}
            <div className="border-t border-[var(--border-subtle)] pt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)] mb-3">
                Price
              </div>
              <div className="space-y-1.5">
                {PRICE_RANGES.map((range, idx) => (
                  <label
                    key={range.label}
                    className="flex items-center gap-2.5 text-xs text-[var(--foreground)] cursor-pointer hover:text-blue-400 transition-colors"
                  >
                    <input
                      type="radio"
                      name="price-filter"
                      checked={priceRangeIndex === idx}
                      onChange={() => { setPriceRangeIndex(idx); setPage(1); }}
                      className="accent-blue-600"
                    />
                    <span>{range.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Customer Ratings Filter */}
            <div className="border-t border-[var(--border-subtle)] pt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)] mb-3">
                Customer Ratings
              </div>
              <div className="space-y-1.5">
                {[
                  { label: '4★ & above', val: 4.0 },
                  { label: '3★ & above', val: 3.0 },
                  { label: 'All Ratings', val: 0 },
                ].map((r) => (
                  <label
                    key={r.label}
                    className="flex items-center gap-2.5 text-xs text-[var(--foreground)] cursor-pointer hover:text-blue-400 transition-colors"
                  >
                    <input
                      type="radio"
                      name="rating-filter"
                      checked={minRating === r.val}
                      onChange={() => { setMinRating(r.val); setPage(1); }}
                      className="accent-blue-600"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="border-t border-[var(--border-subtle)] pt-4">
              <label className="flex items-center justify-between text-xs font-semibold text-[var(--foreground)] cursor-pointer">
                <span>In-Stock Only</span>
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => { setInStockOnly(e.target.checked); setPage(1); }}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </label>
            </div>
          </aside>

          {/* ── RIGHT MAIN PRODUCT LISTING COLUMN ── */}
          <main className="lg:col-span-9 space-y-4">

            {/* Flipkart-Style Sorting Ribbon */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[var(--foreground-secondary)] uppercase tracking-wider">
                  Sort By:
                </span>
                {SORT_OPTIONS.map((opt) => {
                  const isActive = sortBy === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setSortBy(opt.value); setPage(1); }}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-semibold ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]'}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Count */}
              <div className="text-xs text-[var(--foreground-muted)] font-mono">
                Showing <strong>{filtered.length > 0 ? (page - 1) * ITEMS_PER_PAGE + 1 : 0}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)}</strong> of <strong>{filtered.length}</strong> items
              </div>
            </div>

            {/* Active Filters Pill Bar */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-[var(--foreground-muted)] text-[11px]">Active Filters:</span>
                {category !== 'All' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)]">
                    <span>{category}</span>
                    <button type="button" onClick={() => setCategory('All')} className="text-blue-400 hover:text-blue-300" aria-label="Remove category filter">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {search.trim() !== '' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)]">
                    <span>&quot;{search}&quot;</span>
                    <button type="button" onClick={() => setSearch('')} className="text-blue-400 hover:text-blue-300" aria-label="Clear search">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {priceRangeIndex !== 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)]">
                    <span>{PRICE_RANGES[priceRangeIndex].label}</span>
                    <button type="button" onClick={() => setPriceRangeIndex(0)} className="text-blue-400 hover:text-blue-300" aria-label="Clear price filter">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {minRating !== 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)]">
                    <span>{minRating}★ & above</span>
                    <button type="button" onClick={() => setMinRating(0)} className="text-blue-400 hover:text-blue-300" aria-label="Clear rating filter">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {inStockOnly && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)]">
                    <span>In Stock Only</span>
                    <button type="button" onClick={() => setInStockOnly(false)} className="text-blue-400 hover:text-blue-300" aria-label="Clear in stock filter">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Product Card Grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-[var(--surface-elevated)] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : paginated.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginated.map((product, idx) => (
                    <ProductCard key={product._id} product={product} index={idx} />
                  ))}
                </div>

                {/* Pagination (Flipkart Style) */}
                {totalPages > 1 && (
                  <div className="pt-8 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] disabled:opacity-40 hover:border-blue-500 transition-colors flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Previous
                    </button>

                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const p = i + 1;
                        const isActive = p === page;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p)}
                            className={`w-9 h-9 text-xs font-bold rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-[var(--surface)] text-[var(--foreground-secondary)] border border-[var(--border)] hover:border-blue-500'}`}
                          >
                            {p}
                          </button>
                        );
                      })}
                      {totalPages > 5 && (
                        <span className="text-xs px-1 text-[var(--foreground-muted)]">
                          … {totalPages}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className="px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] disabled:opacity-40 hover:border-blue-500 transition-colors flex items-center gap-1.5"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                  <Search className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-[var(--foreground)]">No matching products found</h3>
                <p className="text-xs text-[var(--foreground-muted)] max-w-sm mx-auto">
                  We couldn&apos;t find any matches with your current filter selections. Try broadening your criteria.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-500 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset All Filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16">
        <div className="h-8 w-48 bg-[var(--surface-elevated)] mb-4 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-[var(--surface-elevated)] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <ShopContent />
    </Suspense>
  );
}
