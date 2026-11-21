'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { productService, Product } from '@/lib/products';
import toast from 'react-hot-toast';
import {
  Search, ShoppingBag, Heart, User, ChevronDown, LogOut,
  Package, Store, LayoutDashboard, Menu, X,
} from 'lucide-react';

const CATEGORIES = [
  { label: 'All Products', href: '/shop' },
  { label: 'Electronics', href: '/shop?category=Electronics' },
  { label: 'Clothing', href: '/shop?category=Clothing' },
  { label: 'Footwear', href: '/shop?category=Footwear' },
  { label: 'Home & Living', href: '/shop?category=Home+%26+Living' },
  { label: 'Health & Wellness', href: '/shop?category=Health+%26+Wellness' },
  { label: 'Sports', href: '/shop?category=Sports+%26+Outdoors' },
  { label: 'Top Deals', href: '/shop?deals=true', highlight: true },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartBump, setCartBump] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [scrolled, setScrolled] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoggedIn, isAdmin, isVendor, logout } = useAuth();

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      setMenuOpen(false);
      setDropdownOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Sync cart & wishlist counts
  useEffect(() => {
    const updateCounts = () => {
      try {
        const cartItems = JSON.parse(localStorage.getItem('shopvault_cart') || '[]');
        const total = cartItems.reduce((s: number, i: { quantity?: number }) => s + (i.quantity || 1), 0);
        setCartCount(total);
        setCartBump(true);
        setTimeout(() => setCartBump(false), 350);
        const wishItems = JSON.parse(localStorage.getItem('shopvault_wishlist') || '[]');
        setWishlistCount(wishItems.length);
      } catch {
        setCartCount(0); setWishlistCount(0);
      }
    };
    updateCounts();
    window.addEventListener('cart-updated', updateCounts);
    window.addEventListener('wishlist-updated', updateCounts);
    return () => {
      window.removeEventListener('cart-updated', updateCounts);
      window.removeEventListener('wishlist-updated', updateCounts);
    };
  }, []);

  // Product search suggestions
  useEffect(() => {
    productService.getAll().then(d => setAllProducts(d || [])).catch(() => setAllProducts([]));
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length >= 2) {
      const matches = allProducts.filter(p =>
        p.name.toLowerCase().includes(val.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(val.toLowerCase())
      ).slice(0, 6);
      setSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setSuggestions([]); setShowSuggestions(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    router.push(searchQuery.trim() ? `/shop?q=${encodeURIComponent(searchQuery.trim())}` : '/shop');
  };

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    router.push('/');
    setDropdownOpen(false);
  };

  const userInitial = user?.firstname?.[0]?.toUpperCase() || 'U';
  const userName = user?.firstname || 'Account';

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-200 ${scrolled ? 'shadow-lg' : ''}`}
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>

      {/* ── Main Bar ── */}
      <div className="container mx-auto px-4 h-16 flex items-center gap-3 md:gap-4">

        {/* Brand */}
        <Link href="/" aria-label="ShopVault Home"
          className="flex items-center gap-2.5 flex-shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-blue-600 group-hover:bg-blue-500 transition-colors flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-extrabold text-[15px] tracking-tight" style={{ color: 'var(--foreground)' }}>
              ShopVault
            </span>
            <span className="text-[9px] font-semibold text-blue-500 tracking-widest uppercase">Marketplace</span>
          </div>
        </Link>

        {/* Search */}
        <div ref={searchRef} className="relative flex-1 max-w-xl mx-2 hidden sm:block">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 pointer-events-none" style={{ color: 'var(--foreground-muted)' }} />
            <input
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              placeholder="Search products, brands and categories..."
              aria-label="Search products"
              className="w-full h-9.5 pl-9 pr-20 rounded-xl text-xs md:text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            />
            <button type="submit"
              className="absolute right-1 px-3 h-7 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95"
              aria-label="Submit search">
              Search
            </button>
          </form>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-12 left-0 right-0 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-zinc-200 dark:divide-zinc-800"
              style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--foreground-muted)', background: 'var(--surface-sunken)' }}>
                Suggestions
              </div>
              {suggestions.map(item => (
                <button key={item._id} type="button"
                  onClick={() => { setShowSuggestions(false); setSearchQuery(''); router.push(`/shop/${item._id}`); }}
                  className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-blue-500/5 transition-colors">
                  <div className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border-subtle)' }}>
                    {item.image
                      ? <img src={item.image.startsWith('http') ? item.image : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}${item.image}`}
                          alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-4 h-4" style={{ color: 'var(--foreground-muted)' }} />
                        </div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: 'var(--foreground)' }}>{item.name}</div>
                    <div className="text-[11px]" style={{ color: 'var(--foreground-muted)' }}>{item.category}</div>
                  </div>
                  <div className="text-xs font-bold font-mono" style={{ color: 'var(--foreground)' }}>
                    ₹{item.price.toLocaleString('en-IN')}
                  </div>
                </button>
              ))}
              <button type="button" onClick={handleSearchSubmit}
                className="w-full py-2.5 text-center text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                style={{ background: 'var(--surface-sunken)' }}>
                View all results for &quot;{searchQuery}&quot; →
              </button>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 ml-auto sm:ml-0">

          {/* Become a Seller — only for guests or customers (not vendors/admins) */}
          {(!isLoggedIn || (!isVendor && !isAdmin)) && (
            <Link href={isLoggedIn ? '/dashboard/vendor' : '/register'}
              className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ color: 'var(--foreground-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--foreground-secondary)')}>
              <Store className="w-3.5 h-3.5" />
              <span>Sell on ShopVault</span>
            </Link>
          )}

          {/* Account Section */}
          {isLoggedIn ? (
            <div ref={dropdownRef} className="relative">
              <button type="button" onClick={() => setDropdownOpen(d => !d)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
                aria-expanded={dropdownOpen} aria-haspopup="true"
                aria-label="Account menu">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {userInitial}
                </div>
                <span className="hidden md:inline text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  {userName}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform hidden md:block ${dropdownOpen ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--foreground-muted)' }} />
              </button>

              {/* Account Dropdown — role-aware, no duplicates */}
              {dropdownOpen && (
                <div className="absolute top-12 right-0 w-56 rounded-xl z-50 overflow-hidden shadow-2xl"
                  style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                  {/* User info */}
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                      {user?.firstname} {user?.lastname || ''}
                    </div>
                    <div className="text-xs truncate mt-0.5" style={{ color: 'var(--foreground-muted)' }}>{user?.email}</div>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                      style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                      {user?.role?.toUpperCase() || 'CUSTOMER'}
                    </span>
                  </div>

                  {/* Customer links */}
                  <div className="py-1">
                    <Link href="/dashboard/customer" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-[var(--surface)] transition-colors"
                      style={{ color: 'var(--foreground)' }}>
                      <User className="w-4 h-4" style={{ color: 'var(--foreground-muted)' }} />
                      My Account
                    </Link>
                    <Link href="/dashboard/customer?tab=orders" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-[var(--surface)] transition-colors"
                      style={{ color: 'var(--foreground)' }}>
                      <Package className="w-4 h-4" style={{ color: 'var(--foreground-muted)' }} />
                      My Orders
                    </Link>
                    <Link href="/dashboard/customer?tab=wishlist" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-[var(--surface)] transition-colors"
                      style={{ color: 'var(--foreground)' }}>
                      <Heart className="w-4 h-4" style={{ color: 'var(--foreground-muted)' }} />
                      <span>Wishlist</span>
                      {wishlistCount > 0 && (
                        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">
                          {wishlistCount}
                        </span>
                      )}
                    </Link>
                  </div>

                  {/* Vendor — only for vendor role */}
                  {isVendor && !isAdmin && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)' }} className="py-1">
                      <Link href="/dashboard/vendor" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-[var(--surface)] transition-colors"
                        style={{ color: '#f59e0b' }}>
                        <Store className="w-4 h-4" />
                        Vendor Dashboard
                      </Link>
                    </div>
                  )}

                  {/* Admin — only for admin role */}
                  {isAdmin && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)' }} className="py-1">
                      <Link href="/dashboard/admin" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-[var(--surface)] transition-colors"
                        style={{ color: '#a855f7' }}>
                        <LayoutDashboard className="w-4 h-4" />
                        Admin Panel
                      </Link>
                    </div>
                  )}

                  {/* Logout */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)' }} className="py-1">
                    <button type="button" onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-red-500/5 transition-colors text-left"
                      style={{ color: '#ef4444' }}>
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Guest: Login + Register */
            <div className="flex items-center gap-2">
              <Link href={`/login?redirect=${encodeURIComponent(pathname)}`}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs md:text-sm font-bold shadow-sm shadow-blue-500/25 transition-all"
                aria-label="Sign in to your account">
                Sign In
              </Link>
              <Link href="/register"
                className="hidden md:inline px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all hover:bg-[var(--surface-elevated)] border border-[var(--border)] active:scale-95"
                style={{ color: 'var(--foreground)' }}
                aria-label="Create an account">
                Register
              </Link>
            </div>
          )}

          {/* Wishlist — only shown when logged in */}
          {isLoggedIn && (
            <Link href="/dashboard/customer?tab=wishlist"
              className="relative p-2 rounded-xl hover:bg-[var(--surface-elevated)] transition-colors hidden sm:block"
              aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} items` : ''}`}>
              <Heart className="w-5 h-5" style={{ color: 'var(--foreground-secondary)' }} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>
          )}

          {/* Cart — always shown */}
          <Link href="/cart"
            className="relative flex items-center gap-2 p-2 rounded-xl hover:bg-[var(--surface-elevated)] transition-colors"
            aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}>
            <div className="relative flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" style={{ color: 'var(--foreground-secondary)' }} />
              {cartCount > 0 && (
                <span className={`absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[9px] font-extrabold flex items-center justify-center ring-2 ring-[var(--surface)] transition-transform ${cartBump ? 'scale-125' : 'scale-100'}`}>
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden lg:block text-xs font-bold" style={{ color: 'var(--foreground)' }}>
              Cart
            </span>
          </Link>

          {/* Mobile hamburger */}
          <button type="button" onClick={() => setMenuOpen(m => !m)}
            className="p-2 rounded-xl sm:hidden hover:bg-[var(--surface-elevated)] transition-colors"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}>
            {menuOpen
              ? <X className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
              : <Menu className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
            }
          </button>
        </div>
      </div>

      {/* ── Category Ribbon ── */}
      <div className="hidden md:block" style={{ background: 'var(--surface-elevated)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="container mx-auto px-4 flex items-center gap-6 h-10 overflow-x-auto scrollbar-none">
          {CATEGORIES.map(cat => {
            const isActive = pathname === cat.href || (cat.href !== '/shop' && pathname.startsWith(cat.href.split('?')[0]));
            return (
              <Link key={cat.label} href={cat.href}
                className={`whitespace-nowrap text-xs font-medium transition-all py-1.5 border-b-2 flex-shrink-0 ${
                  isActive
                    ? 'text-blue-500 border-blue-500 font-bold'
                    : cat.highlight
                      ? 'text-amber-400 border-transparent hover:text-amber-300 hover:border-amber-400/50'
                      : 'border-transparent hover:text-blue-400 hover:border-blue-400/50'
                }`}
                style={{ color: isActive ? '#3b82f6' : cat.highlight ? '#f59e0b' : 'var(--foreground-secondary)' }}>
                {cat.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      {menuOpen && (
        <div className="md:hidden border-t p-4 space-y-3"
          style={{ background: 'var(--surface-elevated)', borderColor: 'var(--border)' }}>

          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 pointer-events-none" style={{ color: 'var(--foreground-muted)' }} />
            <input type="search" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              aria-label="Search"
              className="w-full h-10 pl-9 pr-3 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
          </form>

          {/* Mobile Categories */}
          <div className="grid grid-cols-2 gap-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {CATEGORIES.map(cat => (
              <Link key={cat.label} href={cat.href} onClick={() => setMenuOpen(false)}
                className="py-2 px-3 rounded-lg text-xs font-medium text-center transition-colors"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: cat.highlight ? '#f59e0b' : 'var(--foreground)',
                }}>
                {cat.label}
              </Link>
            ))}
          </div>

          {/* Mobile Auth */}
          <div className="pt-2 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {isLoggedIn ? (
              <>
                <Link href="/dashboard/customer" onClick={() => setMenuOpen(false)}
                  className="py-2 rounded-lg text-sm font-semibold text-center text-white bg-blue-600 hover:bg-blue-500 transition-colors">
                  My Account
                </Link>
                {isVendor && (
                  <Link href="/dashboard/vendor" onClick={() => setMenuOpen(false)}
                    className="py-2 rounded-lg text-sm font-semibold text-center transition-colors"
                    style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                    Vendor Dashboard
                  </Link>
                )}
                {isAdmin && (
                  <Link href="/dashboard/admin" onClick={() => setMenuOpen(false)}
                    className="py-2 rounded-lg text-sm font-semibold text-center transition-colors"
                    style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}>
                    Admin Panel
                  </Link>
                )}
                <button type="button" onClick={handleLogout}
                  className="py-2 rounded-lg text-sm font-semibold text-center transition-colors"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" onClick={() => setMenuOpen(false)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-center text-white bg-blue-600 hover:bg-blue-500 transition-colors">
                  Sign In
                </Link>
                <Link href="/register" onClick={() => setMenuOpen(false)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-center transition-colors"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
