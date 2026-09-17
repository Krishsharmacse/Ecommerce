'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { productService, Product } from '@/lib/products';
import toast from 'react-hot-toast';

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [guestMenuOpen, setGuestMenuOpen] = useState(false);
    const [pincodeModalOpen, setPincodeModalOpen] = useState(false);
    const [pincode, setPincode] = useState('560001');
    const [tempPincode, setTempPincode] = useState('');
    const [cartCount, setCartCount] = useState(0);
    const [cartSubtotal, setCartSubtotal] = useState(0);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [cartBump, setCartBump] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Product[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [allProducts, setAllProducts] = useState<Product[]>([]);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const guestDropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const router = useRouter();
    const { user, isLoggedIn, isAdmin, isVendor, logout } = useAuth();

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
            if (guestDropdownRef.current && !guestDropdownRef.current.contains(e.target as Node)) {
                setGuestMenuOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync cart, wishlist and pincode
    useEffect(() => {
        const updateCounts = () => {
            try {
                const rawCart = localStorage.getItem('shopvault_cart');
                const cartItems = rawCart ? JSON.parse(rawCart) : [];
                const totalCart = cartItems.reduce((sum: number, i: { quantity?: number }) => sum + (i.quantity || 1), 0);
                const sub = cartItems.reduce((sum: number, i: { price?: number; quantity?: number }) => sum + ((i.price || 0) * (i.quantity || 1)), 0);
                setCartCount(totalCart);
                setCartSubtotal(sub);
                setCartBump(true);
                setTimeout(() => setCartBump(false), 350);

                const rawWishlist = localStorage.getItem('shopvault_wishlist');
                const wishItems = rawWishlist ? JSON.parse(rawWishlist) : [];
                setWishlistCount(wishItems.length);

                const savedPin = localStorage.getItem('shopvault_pincode');
                if (savedPin) setPincode(savedPin);
            } catch {
                setCartCount(0);
                setWishlistCount(0);
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

    // Fetch product catalog for search suggestions
    useEffect(() => {
        productService.getAll()
            .then(data => setAllProducts(data || []))
            .catch(() => setAllProducts([]));
    }, []);

    // Handle search input changes
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchQuery(val);
        if (val.trim().length >= 2) {
            const matches = allProducts.filter(p =>
                p.name.toLowerCase().includes(val.toLowerCase()) ||
                p.category.toLowerCase().includes(val.toLowerCase())
            ).slice(0, 6);
            setSuggestions(matches);
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowSuggestions(false);
        if (searchQuery.trim()) {
            router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
        } else {
            router.push('/shop');
        }
    };

    const handleSelectSuggestion = (productId: string) => {
        setShowSuggestions(false);
        setSearchQuery('');
        router.push(`/shop/${productId}`);
    };

    const handleLogout = () => {
        logout();
        toast.success('Signed out successfully');
        router.push('/');
        setDropdownOpen(false);
    };

    const handleSavePincode = (e: React.FormEvent) => {
        e.preventDefault();
        if (/^\d{6}$/.test(tempPincode.trim())) {
            setPincode(tempPincode.trim());
            localStorage.setItem('shopvault_pincode', tempPincode.trim());
            setPincodeModalOpen(false);
            setTempPincode('');
            toast.success(`Delivery location set to ${tempPincode.trim()}`);
        } else {
            toast.error('Please enter a valid 6-digit PIN code');
        }
    };

    const categories = [
        { label: 'All Products', href: '/shop', icon: '🛍️' },
        { label: 'Electronics', href: '/shop?category=Electronics', icon: '💻' },
        { label: 'Apparel', href: '/shop?category=Apparel', icon: '👕' },
        { label: 'Lifestyle', href: '/shop?category=Lifestyle', icon: '⌚' },
        { label: 'Home & Living', href: '/shop?category=Home', icon: '🛋️' },
        { label: 'Top Deals', href: '/shop?deals=true', icon: '🔥', highlight: true },
    ];

    const currentUrlEncoded = typeof window !== 'undefined'
        ? encodeURIComponent(pathname)
        : '';

    return (
        <header className="sticky top-0 z-50 w-full bg-[var(--surface)] border-b border-[var(--border)] shadow-md transition-colors">
            {/* Top Primary Bar (Flipkart Style Header) */}
            <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3 md:gap-6">

                {/* Brand Logo & Tagline */}
                <Link href="/" className="flex items-center gap-2 text-decoration-none flex-shrink-0 group">
                    <span className="w-9 h-9 rounded-xl bg-blue-600 group-hover:bg-blue-500 text-white font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20 transition-all">
                        S
                    </span>
                    <div className="flex flex-col leading-none">
                        <span className="font-extrabold text-base md:text-lg tracking-tight text-[var(--foreground)]">
                            SHOPVAULT
                        </span>
                        <span className="text-[10px] font-semibold text-blue-500 tracking-wider uppercase flex items-center gap-1">
                            <span>Explore</span>
                            <span className="text-amber-400 font-bold">Plus ✦</span>
                        </span>
                    </div>
                </Link>

                {/* Flipkart-Style Delivery Pincode Selector */}
                <button
                    type="button"
                    onClick={() => { setTempPincode(pincode); setPincodeModalOpen(true); }}
                    className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-transparent hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] transition-all text-left flex-shrink-0"
                    title="Change delivery location"
                >
                    <span className="text-sm">📍</span>
                    <div className="leading-tight">
                        <div className="text-[10px] font-medium text-[var(--foreground-muted)]">Deliver to</div>
                        <div className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1">
                            <span>{pincode}</span>
                            <span className="text-[10px] text-blue-400">Update</span>
                        </div>
                    </div>
                </button>

                {/* Flipkart-Style Wide Search Bar */}
                <div ref={searchRef} className="relative flex-1 max-w-2xl mx-2 hidden sm:block">
                    <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                            placeholder="Search for products, brands, tech drops & apparel..."
                            className="w-full h-10 pl-10 pr-24 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] focus:border-blue-500 text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] outline-none transition-all shadow-inner"
                        />
                        <div className="absolute left-3 text-[var(--foreground-muted)] pointer-events-none">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="11" cy="11" r="8" strokeWidth="2" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" />
                            </svg>
                        </div>
                        <button
                            type="submit"
                            className="absolute right-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors shadow-sm"
                        >
                            Search
                        </button>
                    </form>

                    {/* Auto-suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-11 left-0 right-0 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-[var(--border-subtle)] animate-fade-up">
                            <div className="p-2 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] bg-[var(--surface-sunken)] flex items-center justify-between">
                                <span>Trending Suggestions</span>
                                <span className="text-blue-400">Escrow Protected</span>
                            </div>
                            {suggestions.map((item) => (
                                <button
                                    key={item._id}
                                    type="button"
                                    onClick={() => handleSelectSuggestion(item._id)}
                                    className="w-full p-2.5 flex items-center gap-3 text-left hover:bg-[var(--surface)] transition-colors"
                                >
                                    <div className="w-10 h-10 rounded bg-[var(--surface)] flex-shrink-0 flex items-center justify-center overflow-hidden border border-[var(--border-subtle)]">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-sm">📦</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-semibold text-[var(--foreground)] truncate">
                                            {item.name}
                                        </div>
                                        <div className="text-[11px] text-[var(--foreground-muted)] flex items-center gap-2">
                                            <span>in <strong className="text-blue-400 font-medium">{item.category}</strong></span>
                                            <span>·</span>
                                            <span className="text-emerald-500 font-semibold">Free Delivery</span>
                                        </div>
                                    </div>
                                    <div className="text-xs font-bold text-[var(--foreground)] font-mono">
                                        ₹{item.price.toLocaleString('en-IN')}
                                    </div>
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={handleSearchSubmit}
                                className="w-full py-2.5 text-center text-xs font-bold text-blue-400 hover:text-blue-300 bg-[var(--surface-sunken)] transition-colors"
                            >
                                View all matching results for &quot;{searchQuery}&quot; →
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Action Icons: Become a Seller, Account, Wishlist, Cart */}
                <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">

                    {/* Become a Seller Link (Flipkart Style) */}
                    <Link
                        href={isLoggedIn ? (isVendor ? '/dashboard/vendor' : '/dashboard/vendor') : '/register'}
                        className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--foreground)] hover:text-blue-400 hover:bg-[var(--surface-elevated)] transition-colors"
                    >
                        <span>🏪</span>
                        <span>Become a Seller</span>
                    </Link>

                    {/* Account Section */}
                    {isLoggedIn ? (
                        <div ref={dropdownRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--surface-elevated)] text-[var(--foreground)] text-sm font-semibold transition-colors"
                                aria-expanded={dropdownOpen}
                            >
                                <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                                    {user?.firstname?.[0]?.toUpperCase() || 'U'}
                                </span>
                                <span className="hidden md:inline text-sm">
                                    Hi, {user?.firstname || 'Account'}
                                </span>
                                <svg className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <polyline points="6 9 12 15 18 9" strokeWidth="2" />
                                </svg>
                            </button>

                            {/* Flipkart-Style Account Dropdown */}
                            {dropdownOpen && (
                                <div className="absolute top-12 right-0 w-64 rounded-xl p-1.5 z-50 bg-[var(--surface-elevated)] border border-[var(--border)] shadow-2xl animate-fade-up divide-y divide-[var(--border-subtle)]">
                                    <div className="p-3">
                                        <div className="font-bold text-sm text-[var(--foreground)]">
                                            {user?.firstname} {user?.lastname || ''}
                                        </div>
                                        <div className="text-xs text-[var(--foreground-muted)] truncate">
                                            {user?.email}
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-1.5">
                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                {user?.role ? user.role.toUpperCase() : 'CUSTOMER'}
                                            </span>
                                            <span className="text-[10px] font-semibold text-amber-400">Plus Member ✦</span>
                                        </div>
                                    </div>

                                    <div className="py-1">
                                        <Link
                                            href="/dashboard/customer"
                                            onClick={() => setDropdownOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface)] rounded-lg transition-colors"
                                        >
                                            <span>👤</span> My Profile
                                        </Link>
                                        <Link
                                            href="/dashboard/customer"
                                            onClick={() => setDropdownOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface)] rounded-lg transition-colors"
                                        >
                                            <span>📦</span> Orders & Returns
                                        </Link>
                                        <Link
                                            href="/dashboard/customer"
                                            onClick={() => setDropdownOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface)] rounded-lg transition-colors"
                                        >
                                            <span>📍</span> Delivery Addresses
                                        </Link>
                                        <Link
                                            href="/shop"
                                            onClick={() => setDropdownOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface)] rounded-lg transition-colors"
                                        >
                                            <span>🤍</span> My Wishlist ({wishlistCount})
                                        </Link>
                                        {isVendor && (
                                            <Link
                                                href="/dashboard/vendor"
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-amber-400 hover:bg-[var(--surface)] rounded-lg transition-colors"
                                            >
                                                <span>🏪</span> Vendor Workspace
                                            </Link>
                                        )}
                                        {isAdmin && (
                                            <Link
                                                href="/dashboard/admin"
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-purple-400 hover:bg-[var(--surface)] rounded-lg transition-colors"
                                            >
                                                <span>👑</span> Admin Control Panel
                                            </Link>
                                        )}
                                    </div>

                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                                        >
                                            <span>⎋</span> Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div ref={guestDropdownRef} className="relative">
                            <div className="flex items-center gap-2">
                                <Link
                                    href={currentUrlEncoded ? `/login?redirect=${currentUrlEncoded}` : '/login'}
                                    onMouseEnter={() => setGuestMenuOpen(true)}
                                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs md:text-sm font-semibold transition-colors shadow-sm flex items-center gap-1.5"
                                >
                                    <span>👤</span>
                                    <span>Login</span>
                                </Link>
                                <Link
                                    href="/register"
                                    className="hidden md:inline px-3 py-1.5 rounded-lg border border-[var(--border-strong)] hover:border-blue-400 text-xs font-semibold text-[var(--foreground)] transition-colors"
                                >
                                    Sign Up
                                </Link>
                            </div>

                            {/* Flipkart-Style Guest Login Preview Flyout */}
                            {guestMenuOpen && (
                                <div
                                    onMouseLeave={() => setGuestMenuOpen(false)}
                                    className="absolute top-11 right-0 w-60 rounded-xl p-2 z-50 bg-[var(--surface-elevated)] border border-[var(--border)] shadow-2xl animate-fade-up divide-y divide-[var(--border-subtle)]"
                                >
                                    <div className="p-2.5 flex items-center justify-between">
                                        <span className="text-xs text-[var(--foreground-muted)]">New customer?</span>
                                        <Link href="/register" className="text-xs font-bold text-blue-400 hover:underline">
                                            Sign Up
                                        </Link>
                                    </div>
                                    <div className="py-1">
                                        <Link href="/login?redirect=/dashboard/customer" className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--surface)] rounded-lg transition-colors">
                                            <span>👤</span> My Profile
                                        </Link>
                                        <Link href="/login?redirect=/dashboard/customer" className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--surface)] rounded-lg transition-colors">
                                            <span>📦</span> Orders
                                        </Link>
                                        <Link href="/login?redirect=/shop" className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--surface)] rounded-lg transition-colors">
                                            <span>🤍</span> Wishlist
                                        </Link>
                                        <Link href="/login?redirect=/dashboard/vendor" className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-amber-400 hover:bg-[var(--surface)] rounded-lg transition-colors">
                                            <span>🏪</span> Seller Hub
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Wishlist Icon with Badge */}
                    <Link
                        href={isLoggedIn ? "/dashboard/customer" : "/login?redirect=/dashboard/customer"}
                        className="relative p-2 rounded-lg hover:bg-[var(--surface-elevated)] text-[var(--foreground)] transition-colors hidden sm:block"
                        title="Wishlist"
                        aria-label="Wishlist"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeWidth="2" />
                        </svg>
                        {wishlistCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
                                {wishlistCount}
                            </span>
                        )}
                    </Link>

                    {/* Cart Link with Badge and Subtotal preview */}
                    <Link
                        href="/cart"
                        className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--surface-elevated)] text-[var(--foreground)] transition-colors"
                        aria-label={`Cart (${cartCount} items)`}
                    >
                        <div className="relative">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" strokeWidth="2" />
                                <line x1="3" y1="6" x2="21" y2="6" strokeWidth="2" />
                                <path d="M16 10a4 4 0 0 1-8 0" strokeWidth="2" />
                            </svg>
                            {cartCount > 0 && (
                                <span className={`absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow ${cartBump ? 'scale-125' : ''} transition-transform`}>
                                    {cartCount}
                                </span>
                            )}
                        </div>
                        <div className="hidden lg:flex flex-col text-left leading-none">
                            <span className="text-xs font-bold">Cart</span>
                            {cartSubtotal > 0 && (
                                <span className="text-[10px] text-blue-400 font-mono font-semibold">₹{cartSubtotal.toLocaleString('en-IN')}</span>
                            )}
                        </div>
                    </Link>

                    {/* Mobile Hamburger Button */}
                    <button
                        type="button"
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-2 rounded-lg md:hidden text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                        aria-label="Toggle navigation"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {menuOpen ? (
                                <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
                            ) : (
                                <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Secondary Category Ribbon (Flipkart Style) */}
            <div className="hidden md:block bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
                <div className="container mx-auto px-4 flex items-center gap-6 lg:gap-8 h-10 overflow-x-auto text-xs font-medium text-[var(--foreground-secondary)] scrollbar-none">
                    {categories.map((c) => {
                        const isActive = pathname === c.href;
                        return (
                            <Link
                                key={c.label}
                                href={c.href}
                                className={`whitespace-nowrap transition-colors hover:text-blue-400 py-1 border-b-2 flex items-center gap-1.5 ${isActive ? 'text-blue-500 border-blue-500 font-bold' : 'border-transparent'} ${c.highlight ? 'text-amber-400 font-semibold' : ''}`}
                            >
                                <span>{c.icon}</span>
                                <span>{c.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Mobile Expandable Menu */}
            {menuOpen && (
                <div className="md:hidden bg-[var(--surface-elevated)] border-t border-[var(--border)] p-4 space-y-3 animate-fade-up">
                    {/* Mobile Location bar */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface)] text-xs text-[var(--foreground)] border border-[var(--border-subtle)]">
                        <div className="flex items-center gap-2">
                            <span>📍</span>
                            <span>Deliver to <strong>{pincode}</strong></span>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setTempPincode(pincode); setPincodeModalOpen(true); }}
                            className="text-blue-400 font-bold"
                        >
                            Change
                        </button>
                    </div>

                    {/* Mobile Search Bar */}
                    <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search products..."
                            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] outline-none"
                        />
                        <div className="absolute left-3 text-[var(--foreground-muted)]">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="11" cy="11" r="8" strokeWidth="2" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" />
                            </svg>
                        </div>
                    </form>

                    {/* Mobile Category Links */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                        {categories.map((c) => (
                            <Link
                                key={c.label}
                                href={c.href}
                                onClick={() => setMenuOpen(false)}
                                className="p-2 rounded-lg bg-[var(--surface)] text-xs text-[var(--foreground)] font-medium text-center flex items-center justify-center gap-1"
                            >
                                <span>{c.icon}</span>
                                <span>{c.label}</span>
                            </Link>
                        ))}
                    </div>

                    {/* Mobile User Actions */}
                    <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-col gap-2">
                        {isLoggedIn ? (
                            <>
                                <Link
                                    href="/dashboard/customer"
                                    onClick={() => setMenuOpen(false)}
                                    className="p-2 rounded-lg bg-blue-600 text-white text-xs font-semibold text-center"
                                >
                                    My Account & Orders
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="p-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold text-center"
                                >
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <div className="flex gap-2">
                                <Link
                                    href="/login"
                                    onClick={() => setMenuOpen(false)}
                                    className="flex-1 p-2 rounded-lg bg-blue-600 text-white text-xs font-semibold text-center"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/register"
                                    onClick={() => setMenuOpen(false)}
                                    className="flex-1 p-2 rounded-lg bg-[var(--surface)] text-[var(--foreground)] text-xs font-semibold text-center border border-[var(--border)]"
                                >
                                    Register
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Flipkart-Style Pincode Modal */}
            {pincodeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-up">
                    <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                                <span>📍</span> Choose Delivery Location
                            </h3>
                            <button
                                type="button"
                                onClick={() => setPincodeModalOpen(false)}
                                className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] text-lg"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                            Enter your 6-digit postal code to see real-time product availability and express delivery dates.
                        </p>
                        <form onSubmit={handleSavePincode} className="space-y-3">
                            <input
                                type="text"
                                maxLength={6}
                                value={tempPincode}
                                onChange={(e) => setTempPincode(e.target.value.replace(/\D/g, ''))}
                                placeholder="Enter 6-digit PIN code (e.g. 560001)"
                                className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-sm font-mono text-[var(--foreground)] outline-none focus:border-blue-500 transition-colors"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPincodeModalOpen(false)}
                                    className="flex-1 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-md shadow-blue-500/20"
                                >
                                    Apply
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </header>
    );
}
