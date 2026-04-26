'use client';
import { useEffect, useState, useMemo } from 'react';
import { productService, Product } from '@/lib/products';
import ProductCard from '@/components/ProductCard';

const CATEGORIES = ['All', 'Electronics', 'Clothing', 'Food', 'Books', 'Sports', 'Health', 'Other'];

export default function ShopPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 12;

    useEffect(() => {
        productService.getAll()
            .then(setProducts)
            .catch(() => setProducts([]))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        let result = [...products];

        // Search
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(p =>
                (p.name || '').toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q) ||
                (p.category || '').toLowerCase().includes(q)
            );
        }

        // Category
        if (category !== 'All') {
            result = result.filter(p => p.category?.toLowerCase() === category.toLowerCase());
        }

        // Sort
        switch (sortBy) {
            case 'price-asc': result.sort((a, b) => a.price - b.price); break;
            case 'price-desc': result.sort((a, b) => b.price - a.price); break;
            case 'name': result.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
            case 'newest': result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()); break;
        }

        return result;
    }, [products, search, category, sortBy]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    // Get available categories from products
    const availableCategories = useMemo(() => {
        const cats = new Set(products.map(p => p.category).filter(Boolean));
        return ['All', ...Array.from(cats)];
    }, [products]);

    return (
        <div style={{ paddingTop: '70px', minHeight: '100vh' }}>
            {/* Page Header */}
            <div
                style={{
                    background: 'var(--bg-surface)',
                    borderBottom: '1px solid var(--glass-border)',
                    padding: '3rem 0 2rem',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(ellipse at 50% 100%, rgba(108,99,255,0.08) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }}
                />
                <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                    <div className="section-tag">🛍 Collection</div>
                    <h1 className="section-title" style={{ marginTop: '0.5rem' }}>
                        All <span className="text-gradient">Products</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {loading ? 'Loading...' : `${filtered.length} product${filtered.length !== 1 ? 's' : ''} found`}
                    </p>
                </div>
            </div>

            <div className="container" style={{ padding: '2rem 1.5rem' }}>
                {/* Filters Bar */}
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        alignItems: 'center',
                        marginBottom: '2rem',
                    }}
                >
                    {/* Search */}
                    <div className="search-bar" style={{ flex: '1', minWidth: '250px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            id="shop-search"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                style={{ color: 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Sort */}
                    <select
                        id="shop-sort"
                        value={sortBy}
                        onChange={e => { setSortBy(e.target.value); setPage(1); }}
                        style={{
                            padding: '0.625rem 1rem',
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem',
                            outline: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <option value="newest">Newest First</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                        <option value="name">Name A-Z</option>
                    </select>
                </div>

                {/* Category Chips */}
                <div className="filter-chips" style={{ marginBottom: '2rem' }}>
                    {availableCategories.map(cat => (
                        <button
                            key={cat}
                            className={`filter-chip ${category === cat ? 'active' : ''}`}
                            onClick={() => { setCategory(cat); setPage(1); }}
                            id={`filter-${cat.toLowerCase()}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Products */}
                {loading ? (
                    <div className="products-grid">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="card" style={{ height: '360px' }}>
                                <div className="skeleton" style={{ height: '220px', borderRadius: '0' }} />
                                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div className="skeleton" style={{ height: '12px', width: '60%' }} />
                                    <div className="skeleton" style={{ height: '16px', width: '80%' }} />
                                    <div className="skeleton" style={{ height: '12px', width: '90%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : paginated.length > 0 ? (
                    <>
                        <div className="products-grid">
                            {paginated.map((product, i) => (
                                <ProductCard key={product._id} product={product} index={i} />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination" style={{ marginTop: '3rem' }}>
                                <button
                                    className="page-btn"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    ←
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        className={`page-btn ${page === i + 1 ? 'active' : ''}`}
                                        onClick={() => setPage(i + 1)}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    className="page-btn"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    →
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">🔍</div>
                        <div className="empty-title">No products found</div>
                        <div className="empty-description">
                            {search || category !== 'All'
                                ? 'Try adjusting your search or filters.'
                                : 'Check back soon — products will be added shortly.'}
                        </div>
                        {(search || category !== 'All') && (
                            <button
                                className="btn btn-secondary"
                                onClick={() => { setSearch(''); setCategory('All'); }}
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
