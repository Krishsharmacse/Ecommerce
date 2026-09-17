'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { productService, Product } from '@/lib/products';
import ProductCard from '@/components/ProductCard';

const CATEGORIES = [
  {
    name: 'Electronics',
    slug: 'Electronics',
    tagline: 'Audio, peripherals & tech',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
    icon: '💻',
  },
  {
    name: 'Apparel',
    slug: 'Apparel',
    tagline: 'Tailored knitwear & jackets',
    image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&q=80',
    icon: '👕',
  },
  {
    name: 'Lifestyle',
    slug: 'Lifestyle',
    tagline: 'Watches, bags & eyewear',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
    icon: '⌚',
  },
  {
    name: 'Home & Living',
    slug: 'Home',
    tagline: 'Ceramics, coffee & decor',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&q=80',
    icon: '🛋️',
  },
];

const HERO_SLIDES = [
  {
    tag: '⚡ ShopVault Big Freedom Sale',
    title: 'Precision Tech & Flagship Audio Drops',
    desc: 'Up to 45% off on studio headphones, mechanical keyboards, and verified workstation peripherals with zero deposit escrow.',
    cta: 'Shop Tech Deals',
    href: '/shop?category=Electronics',
    bgGradient: 'from-blue-950 via-indigo-950 to-zinc-950',
    accentColor: '#3b82f6',
  },
  {
    tag: '✦ Handcrafted Atelier Wear',
    title: 'Autumn Tailored Silhouettes & Outerwear',
    desc: 'Discover heavy-weight organic wool overcoats, raw selvedge denim, and minimal minimalist sneakers directly from verified makers.',
    cta: 'Explore Apparel',
    href: '/shop?category=Apparel',
    bgGradient: 'from-purple-950 via-slate-950 to-zinc-950',
    accentColor: '#8b5cf6',
  },
  {
    tag: '⏱ Limited Time Flash Event',
    title: 'Horology & Handcrafted Leather Objects',
    desc: 'Automatic Swiss movements and vegetable-tanned Italian leather goods backed by tamper-proof authentication certificates.',
    cta: 'Browse Lifestyle',
    href: '/shop?category=Lifestyle',
    bgGradient: 'from-emerald-950 via-zinc-950 to-slate-950',
    accentColor: '#10b981',
  },
];

const TRUST_METRICS = [
  { label: 'Free Delivery', sub: 'On orders over ₹999', icon: '⚡' },
  { label: 'Escrow Guarantee', sub: '100% money back safety', icon: '🛡️' },
  { label: '7-Day Replacement', sub: 'No-questions-asked swap', icon: '🔄' },
  { label: 'Verified Sellers', sub: 'Strict quality inspection', icon: '✦' },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [countdown, setCountdown] = useState({ hours: 5, minutes: 42, seconds: 19 });

  useEffect(() => {
    productService.getAll()
      .then((data) => {
        setProducts(data || []);
        try {
          const rawRecent = localStorage.getItem('shopvault_recent');
          if (rawRecent && data) {
            const recentIds: string[] = JSON.parse(rawRecent);
            const matches = data.filter(p => recentIds.includes(p._id));
            setRecentlyViewed(matches.slice(0, 4));
          }
        } catch {
          // ignore
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  // Slide rotation timer
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Flash deal countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 6, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const dealsOfTheDay = products.slice(0, 4);
  const featured = products.slice(2, 6);
  const trending = products.slice(4, 8);

  const formatTimer = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">

      {/* ── FLIPKART-STYLE CATEGORY CIRCLES STRIP ── */}
      <section className="bg-[var(--surface)] border-b border-[var(--border)] py-4 overflow-x-auto scrollbar-none">
        <div className="container mx-auto px-4 flex items-center justify-between min-w-max gap-8 md:justify-center md:gap-14">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/shop?category=${encodeURIComponent(cat.slug)}`}
              className="flex flex-col items-center gap-2 group transition-transform hover:-translate-y-1"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full p-1 bg-gradient-to-tr from-blue-600/30 to-purple-600/30 border border-[var(--border)] group-hover:border-blue-500 overflow-hidden shadow-sm">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <span className="text-xs font-semibold text-[var(--foreground)] group-hover:text-blue-400 text-center">
                {cat.name}
              </span>
            </Link>
          ))}
          <Link
            href="/shop"
            className="flex flex-col items-center gap-2 group transition-transform hover:-translate-y-1"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-blue-600/10 border border-blue-500/30 group-hover:border-blue-500 flex items-center justify-center text-blue-400 font-bold text-lg shadow-sm">
              ✦
            </div>
            <span className="text-xs font-semibold text-[var(--foreground)] group-hover:text-blue-400 text-center">
              All Offers
            </span>
          </Link>
        </div>
      </section>

      {/* ── PROMOTIONAL HERO BANNER SLIDER ── */}
      <section className="container mx-auto px-4 py-4 md:py-6">
        <div className={`relative rounded-2xl md:rounded-3xl overflow-hidden bg-gradient-to-r ${HERO_SLIDES[activeSlide].bgGradient} border border-white/10 shadow-2xl p-6 sm:p-10 md:p-14 text-white min-h-[340px] md:min-h-[380px] flex flex-col justify-between transition-all duration-700`}>
          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 border border-white/20 text-white backdrop-blur">
              {HERO_SLIDES[activeSlide].tag}
            </span>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              {HERO_SLIDES[activeSlide].title}
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-zinc-300 leading-relaxed max-w-xl">
              {HERO_SLIDES[activeSlide].desc}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={HERO_SLIDES[activeSlide].href}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2"
              >
                <span>{HERO_SLIDES[activeSlide].cta}</span>
                <span>→</span>
              </Link>
              <Link
                href="/shop"
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm transition-all backdrop-blur"
              >
                Browse All
              </Link>
            </div>
          </div>

          {/* Slide Indicators and Controls */}
          <div className="relative z-10 flex items-center justify-between pt-6 border-t border-white/10 mt-4">
            <div className="flex items-center gap-2">
              {HERO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${activeSlide === idx ? 'w-8 bg-blue-500' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSlide(prev => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs backdrop-blur"
                aria-label="Previous slide"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setActiveSlide(prev => (prev + 1) % HERO_SLIDES.length)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs backdrop-blur"
                aria-label="Next slide"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST HIGHLIGHTS BAR ── */}
      <section className="container mx-auto px-4 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-sm">
          {TRUST_METRICS.map((m) => (
            <div key={m.label} className="flex items-center gap-3 p-2">
              <span className="text-2xl">{m.icon}</span>
              <div>
                <div className="text-xs md:text-sm font-bold text-[var(--foreground)]">{m.label}</div>
                <div className="text-[11px] text-[var(--foreground-muted)]">{m.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DEALS OF THE DAY (FLIPKART STYLE WITH LIVE TIMER) ── */}
      <section className="container mx-auto px-4 py-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 md:p-6 shadow-sm">
          {/* Section Header with Countdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg md:text-xl font-black tracking-tight text-[var(--foreground)] flex items-center gap-2">
                <span>🔥</span> Deals of the Day
              </h2>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Ends in {formatTimer(countdown.hours)}h : {formatTimer(countdown.minutes)}m : {formatTimer(countdown.seconds)}s</span>
              </div>
            </div>
            <Link
              href="/shop"
              className="text-xs md:text-sm font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1"
            >
              <span>View All Deals</span>
              <span>→</span>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-[var(--surface-elevated)] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : dealsOfTheDay.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dealsOfTheDay.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--foreground-muted)] text-center py-8">
              Deals updating soon...
            </p>
          )}
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ── */}
      <section className="container mx-auto px-4 py-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 md:p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 mb-6">
            <div>
              <h2 className="text-lg md:text-xl font-black tracking-tight text-[var(--foreground)]">
                ⭐ Featured Collection
              </h2>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                Top rated and most frequently reviewed products
              </p>
            </div>
            <Link
              href="/shop"
              className="text-xs md:text-sm font-bold text-blue-500 hover:text-blue-400"
            >
              Browse Catalog →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-[var(--surface-elevated)] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featured.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* ── TRENDING OFFERS ── */}
      {trending.length > 0 && (
        <section className="container mx-auto px-4 py-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 mb-6">
              <div>
                <h2 className="text-lg md:text-xl font-black tracking-tight text-[var(--foreground)]">
                  ⚡ Trending Offers &amp; Best Sellers
                </h2>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                  Popular products searched and added to bags right now
                </p>
              </div>
              <Link
                href="/shop?deals=true"
                className="text-xs md:text-sm font-bold text-blue-500 hover:text-blue-400"
              >
                View Trending →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {trending.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RECENTLY VIEWED (FLIPKART RECOMMENDATION STRIP) ── */}
      {recentlyViewed.length > 0 && (
        <section className="container mx-auto px-4 py-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 mb-6">
              <h2 className="text-lg md:text-xl font-black tracking-tight text-[var(--foreground)] flex items-center gap-2">
                <span>🕒</span> Recently Viewed by You
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentlyViewed.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TRENDING CATEGORIES SHOWCASE ── */}
      <section className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tech card */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-900 to-indigo-900 border border-blue-500/30 p-8 flex flex-col justify-between min-h-[220px]">
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-300">New In Tech</span>
              <h3 className="text-2xl font-black text-white">Studio Audio & Gadgets</h3>
              <p className="text-xs text-zinc-300 max-w-xs">Anodized aluminum interfaces, active noise cancellation, and mechanical keyboards.</p>
            </div>
            <Link href="/shop?category=Electronics" className="inline-block mt-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg w-max transition-colors">
              Explore Tech Drops →
            </Link>
          </div>

          {/* Lifestyle card */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-900 to-pink-900 border border-purple-500/30 p-8 flex flex-col justify-between min-h-[220px]">
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-pink-300">Modern Living</span>
              <h3 className="text-2xl font-black text-white">Timeless Wear & Objects</h3>
              <p className="text-xs text-zinc-300 max-w-xs">Handcrafted leather goods, Swiss movement chronographs, and organic merino wool.</p>
            </div>
            <Link href="/shop?category=Apparel" className="inline-block mt-4 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg w-max transition-colors">
              Explore Lifestyle →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface-sunken)] py-12 text-xs text-[var(--foreground-muted)]">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-sm flex items-center justify-center">S</span>
              <span className="font-black text-base text-[var(--foreground)] tracking-tight">SHOPVAULT</span>
            </div>
            <p className="leading-relaxed">
              India&apos;s premier multi-vendor curated ecommerce destination with escrow purchase protection and verified seller storefronts.
            </p>
          </div>

          <div>
            <div className="font-bold text-sm text-[var(--foreground)] mb-3">About</div>
            <ul className="space-y-2">
              <li><Link href="/shop" className="hover:text-[var(--foreground)] transition-colors">About Us</Link></li>
              <li><Link href="/shop" className="hover:text-[var(--foreground)] transition-colors">Merchant Guidelines</Link></li>
              <li><Link href="/shop" className="hover:text-[var(--foreground)] transition-colors">Escrow Security</Link></li>
              <li><Link href="/shop" className="hover:text-[var(--foreground)] transition-colors">Careers</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-sm text-[var(--foreground)] mb-3">Help & Support</div>
            <ul className="space-y-2">
              <li><Link href="/dashboard/customer" className="hover:text-[var(--foreground)] transition-colors">Track Order</Link></li>
              <li><Link href="/dashboard/customer" className="hover:text-[var(--foreground)] transition-colors">Returns & Refunds</Link></li>
              <li><Link href="/cart" className="hover:text-[var(--foreground)] transition-colors">Shipping Rates</Link></li>
              <li><Link href="/dashboard/customer" className="hover:text-[var(--foreground)] transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-sm text-[var(--foreground)] mb-3">Policy</div>
            <ul className="space-y-2">
              <li><span className="hover:text-[var(--foreground)] cursor-pointer">Terms of Use</span></li>
              <li><span className="hover:text-[var(--foreground)] cursor-pointer">Security & Encryption</span></li>
              <li><span className="hover:text-[var(--foreground)] cursor-pointer">Privacy Notice</span></li>
              <li><span className="hover:text-[var(--foreground)] cursor-pointer">Grievance Officer</span></li>
            </ul>
          </div>
        </div>

        <div className="container mx-auto px-4 pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} ShopVault Internet Private Limited. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span>🔒 256-Bit SSL Encrypted</span>
            <span>⚡ Escrow Protected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
