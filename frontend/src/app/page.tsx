'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight, ChevronLeft, Zap, Shield, RefreshCcw, BadgeCheck,
  Cpu, Shirt, Watch, Home, Dumbbell, Sparkles, ShoppingBag, Package, Clock,
  ArrowRight, ShieldCheck, Truck, Star,
} from 'lucide-react';
import { productService, Product } from '@/lib/products';
import ProductCard from '@/components/ProductCard';

const CATEGORIES = [
  { name: 'Electronics', slug: 'Electronics', icon: Cpu, color: '#3b82f6' },
  { name: 'Clothing', slug: 'Clothing', icon: Shirt, color: '#8b5cf6' },
  { name: 'Footwear', slug: 'Footwear', icon: ShoppingBag, color: '#f59e0b' },
  { name: 'Home & Living', slug: 'Home & Living', icon: Home, color: '#10b981' },
  { name: 'Health', slug: 'Health & Wellness', icon: Sparkles, color: '#ec4899' },
  { name: 'Sports', slug: 'Sports & Outdoors', icon: Dumbbell, color: '#f97316' },
];

const HERO_SLIDES = [
  {
    tag: 'Big Sale — Up to 45% Off',
    title: 'Premium Tech & Flagship Audio',
    desc: 'Studio headphones, mechanical keyboards, and verified workstation peripherals.',
    cta: 'Shop Electronics',
    href: '/shop?category=Electronics',
    gradient: 'from-blue-950 to-indigo-950',
  },
  {
    tag: 'Handcrafted Collection',
    title: 'Autumn Tailored Silhouettes',
    desc: 'Organic wool overcoats, raw selvedge denim, and premium sneakers from verified makers.',
    cta: 'Shop Clothing',
    href: '/shop?category=Clothing',
    gradient: 'from-purple-950 to-slate-950',
  },
  {
    tag: 'Limited Time',
    title: 'Horology & Leather Objects',
    desc: 'Automatic movements and vegetable-tanned Italian leather goods.',
    cta: 'Browse Lifestyle',
    href: '/shop?category=Footwear',
    gradient: 'from-emerald-950 to-zinc-950',
  },
];

const TRUST_ITEMS = [
  { icon: Truck, label: 'Free Delivery', sub: 'On orders over ₹999' },
  { icon: ShieldCheck, label: 'Secure Checkout', sub: '100% payment protection' },
  { icon: RefreshCcw, label: '7-Day Returns', sub: 'Hassle-free replacements' },
  { icon: BadgeCheck, label: 'Verified Sellers', sub: 'Strict quality standards' },
];

// Product skeleton loader
function ProductSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="animate-pulse" style={{ aspectRatio: '4/3', background: 'var(--surface-elevated)' }} />
      <div className="p-3.5 space-y-2">
        <div className="h-3 w-1/3 rounded animate-pulse" style={{ background: 'var(--surface-elevated)' }} />
        <div className="h-4 w-4/5 rounded animate-pulse" style={{ background: 'var(--surface-elevated)' }} />
        <div className="h-4 w-1/2 rounded animate-pulse" style={{ background: 'var(--surface-elevated)' }} />
        <div className="h-3 w-2/3 rounded animate-pulse" style={{ background: 'var(--surface-elevated)' }} />
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, href }: { title: string; sub?: string; href: string }) {
  return (
    <div className="flex items-end justify-between mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div>
        <h2 className="text-lg md:text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
          {title}
        </h2>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--foreground-muted)' }}>{sub}</p>}
      </div>
      <Link href={href} className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
        View All <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    productService.getAll()
      .then((data) => {
        setProducts(data || []);
        try {
          const recentIds: string[] = JSON.parse(localStorage.getItem('shopvault_recent') || '[]');
          const matches = (data || []).filter(p => recentIds.includes(p._id));
          setRecentlyViewed(matches.slice(0, 4));
        } catch { /* ignore */ }
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  // Auto-advance hero
  useEffect(() => {
    const t = setInterval(() => setActiveSlide(s => (s + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const featured = products.slice(0, 8);
  const trending = products.slice(4, 12);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--background)' }}>

      {/* ── Category Strip ── */}
      <section style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        className="py-3 overflow-x-auto scrollbar-none">
        <div className="container mx-auto px-4 flex items-center gap-6 md:gap-10 min-w-max md:min-w-0 md:justify-center">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <Link key={cat.slug} href={`/shop?category=${encodeURIComponent(cat.slug)}`}
                className="flex flex-col items-center gap-1.5 group transition-transform hover:-translate-y-0.5">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all"
                  style={{ background: `${cat.color}15`, border: `1.5px solid ${cat.color}30` }}>
                  <Icon className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:scale-110"
                    style={{ color: cat.color }} strokeWidth={1.5} />
                </div>
                <span className="text-[11px] font-semibold whitespace-nowrap"
                  style={{ color: 'var(--foreground-secondary)' }}>
                  {cat.name}
                </span>
              </Link>
            );
          })}
          <Link href="/shop" className="flex flex-col items-center gap-1.5 group transition-transform hover:-translate-y-0.5">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1.5px solid rgba(59,130,246,0.2)' }}>
              <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:scale-110 text-blue-400" strokeWidth={1.5} />
            </div>
            <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: 'var(--foreground-secondary)' }}>
              All Products
            </span>
          </Link>
        </div>
      </section>

      {/* ── Hero Banner ── */}
      <section className="container mx-auto px-4 py-4 md:py-6">
        <div className={`relative rounded-2xl md:rounded-3xl overflow-hidden bg-gradient-to-r ${HERO_SLIDES[activeSlide].gradient} border border-white/8 shadow-2xl p-7 sm:p-10 md:p-14 text-white min-h-[300px] md:min-h-[360px] flex flex-col justify-between transition-all duration-700`}>
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" aria-hidden="true" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border"
              style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }}>
              <Zap className="w-3 h-3" fill="currentColor" />
              {HERO_SLIDES[activeSlide].tag}
            </span>

            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight leading-tight">
              {HERO_SLIDES[activeSlide].title}
            </h1>
            <p className="text-sm md:text-base leading-relaxed max-w-xl" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {HERO_SLIDES[activeSlide].desc}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href={HERO_SLIDES[activeSlide].href}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/25">
                {HERO_SLIDES[activeSlide].cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/shop"
                className="px-5 py-3 rounded-xl text-white font-semibold text-sm transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                Browse All
              </Link>
            </div>
          </div>

          {/* Slide controls */}
          <div className="relative z-10 flex items-center justify-between pt-5 mt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex gap-2" role="tablist" aria-label="Hero slides">
              {HERO_SLIDES.map((slide, idx) => (
                <button key={idx} type="button"
                  role="tab" aria-selected={activeSlide === idx}
                  onClick={() => setActiveSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}: ${slide.title}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${activeSlide === idx ? 'w-8 bg-blue-400' : 'w-1.5 bg-white/25 hover:bg-white/40'}`} />
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" aria-label="Previous slide"
                onClick={() => setActiveSlide(s => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button type="button" aria-label="Next slide"
                onClick={() => setActiveSlide(s => (s + 1) % HERO_SLIDES.length)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Bar ── */}
      <section className="container mx-auto px-4 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-2xl p-4 md:p-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {TRUST_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 p-1">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(59,130,246,0.08)' }}>
                  <Icon className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>{item.label}</div>
                  <div className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>{item.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="container mx-auto px-4 py-4">
        <div className="rounded-2xl p-5 md:p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <SectionHeader title="Featured Products" sub="Curated picks from verified sellers" href="/shop" />
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featured.map(p => <ProductCard key={p._id} product={p} />)}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--foreground-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>No products available yet.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--foreground-muted)' }}>Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Promo Cards ── */}
      <section className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative rounded-2xl overflow-hidden p-7 flex flex-col justify-between min-h-[200px]"
            style={{ background: 'linear-gradient(135deg, #1e3a8a, #1e1b4b)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-300">New In Tech</span>
              <h3 className="text-2xl font-black text-white leading-tight">Studio Audio &amp; Smart Gadgets</h3>
              <p className="text-sm text-blue-200/60 max-w-xs">Noise cancellation, mechanical keyboards, and pro-grade peripherals.</p>
            </div>
            <Link href="/shop?category=Electronics"
              className="inline-flex items-center gap-2 mt-5 text-xs font-bold text-white px-4 py-2 rounded-lg w-max transition-colors"
              style={{ background: '#2563eb' }}>
              Explore Electronics <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="relative rounded-2xl overflow-hidden p-7 flex flex-col justify-between min-h-[200px]"
            style={{ background: 'linear-gradient(135deg, #4c1d95, #831843)', border: '1px solid rgba(168,85,247,0.2)' }}>
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-200">Trending Fashion</span>
              <h3 className="text-2xl font-black text-white leading-tight">Timeless Wear &amp; Accessories</h3>
              <p className="text-sm text-purple-200/60 max-w-xs">Handcrafted leather goods, premium outerwear, and curated footwear.</p>
            </div>
            <Link href="/shop?category=Clothing"
              className="inline-flex items-center gap-2 mt-5 text-xs font-bold text-white px-4 py-2 rounded-lg w-max transition-colors"
              style={{ background: '#7c3aed' }}>
              Shop Fashion <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trending Products ── */}
      {trending.length > 0 && (
        <section className="container mx-auto px-4 py-4">
          <div className="rounded-2xl p-5 md:p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <SectionHeader title="Trending Now" sub="Popular products right now" href="/shop" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {trending.map(p => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Recently Viewed ── */}
      {recentlyViewed.length > 0 && (
        <section className="container mx-auto px-4 py-4">
          <div className="rounded-2xl p-5 md:p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <SectionHeader title="Recently Viewed" sub="Products you checked out" href="/shop" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentlyViewed.map(p => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="mt-auto py-12" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-sunken)' }}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <span className="font-extrabold text-base tracking-tight" style={{ color: 'var(--foreground)' }}>
                  ShopVault
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                India&apos;s premier multi-vendor marketplace with verified seller storefronts and purchase protection.
              </p>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--foreground-muted)' }}>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>256-bit SSL Encrypted &amp; Secure</span>
              </div>
            </div>

            {/* Shop */}
            <div>
              <div className="text-sm font-bold mb-3" style={{ color: 'var(--foreground)' }}>Shop</div>
              <ul className="space-y-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>
                {[
                  ['All Products', '/shop'],
                  ['Electronics', '/shop?category=Electronics'],
                  ['Clothing', '/shop?category=Clothing'],
                  ['Top Deals', '/shop?deals=true'],
                ].map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="hover:text-blue-400 transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account */}
            <div>
              <div className="text-sm font-bold mb-3" style={{ color: 'var(--foreground)' }}>Account</div>
              <ul className="space-y-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>
                {[
                  ['Sign In', '/login'],
                  ['Register', '/register'],
                  ['My Orders', '/dashboard/customer'],
                  ['Sell on ShopVault', '/dashboard/vendor'],
                ].map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="hover:text-blue-400 transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <div className="text-sm font-bold mb-3" style={{ color: 'var(--foreground)' }}>Support</div>
              <ul className="space-y-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>
                {[
                  ['Track Order', '/dashboard/customer'],
                  ['Returns & Refunds', '/dashboard/customer'],
                  ['Contact Us', '/shop'],
                  ['FAQ', '/shop'],
                ].map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="hover:text-blue-400 transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
            style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--foreground-muted)' }}>
            <span>© {new Date().getFullYear()} ShopVault. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" /> Privacy Policy
              </span>
              <span>Terms of Use</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
