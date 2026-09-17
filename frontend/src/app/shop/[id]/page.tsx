'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { productService, Product } from '@/lib/products';
import toast from 'react-hot-toast';

function addToCartDirect(product: Product, quantity: number): boolean {
    try {
        const CART_KEY = 'shopvault_cart';
        const raw = localStorage.getItem(CART_KEY);
        const cart = raw ? JSON.parse(raw) : [];
        const existing = cart.find((c: { _id: string }) => c._id === product._id);
        if (existing) {
            existing.quantity = Math.min(existing.quantity + quantity, product.stock);
        } else {
            cart.push({
                _id: product._id,
                name: product.name || product.productName || 'Product',
                price: product.price,
                image: product.image,
                category: product.category,
                stock: product.stock,
                quantity,
            });
        }
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        window.dispatchEvent(new Event('cart-updated'));
        return true;
    } catch {
        return false;
    }
}

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [adding, setAdding] = useState(false);
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [pincode, setPincode] = useState('560001');
    const [pincodeChecked, setPincodeChecked] = useState(true);
    const [checkingPincode, setCheckingPincode] = useState(false);

    useEffect(() => {
        if (params?.id) {
            productService.getById(params.id as string)
                .then((p) => {
                    setProduct(p);
                    // Record in recently viewed
                    if (p?._id) {
                        try {
                            const raw = localStorage.getItem('shopvault_recent');
                            const list: string[] = raw ? JSON.parse(raw) : [];
                            const updated = [p._id, ...list.filter(id => id !== p._id)].slice(0, 8);
                            localStorage.setItem('shopvault_recent', JSON.stringify(updated));
                        } catch {
                            // ignore
                        }
                    }
                })
                .catch(() => {
                    toast.error('Product not found');
                    router.push('/shop');
                })
                .finally(() => setLoading(false));
        }
    }, [params?.id, router]);

    useEffect(() => {
        let isMounted = true;
        const checkWishlist = () => {
            if (!product?._id) return;
            try {
                const raw = localStorage.getItem('shopvault_wishlist');
                const list = raw ? JSON.parse(raw) : [];
                if (isMounted) setIsWishlisted(list.includes(product._id));
            } catch {
                // ignore
            }
        };

        const t = setTimeout(checkWishlist, 0);
        return () => {
            isMounted = false;
            clearTimeout(t);
        };
    }, [product?._id]);

    const handleAddToCart = () => {
        if (!product || product.stock <= 0) return;
        setAdding(true);
        const ok = addToCartDirect(product, quantity);
        if (ok) {
            toast.success(`Added ${quantity} item(s) to your bag`);
        } else {
            toast.error('Failed to update cart');
        }
        setTimeout(() => setAdding(false), 400);
    };

    const handleBuyNow = () => {
        if (!product || product.stock <= 0) return;
        const ok = addToCartDirect(product, quantity);
        if (ok) {
            router.push('/cart');
        } else {
            toast.error('Could not proceed to checkout');
        }
    };

    const toggleWishlist = () => {
        if (!product) return;
        try {
            const raw = localStorage.getItem('shopvault_wishlist');
            const list: string[] = raw ? JSON.parse(raw) : [];
            let updated: string[];
            if (list.includes(product._id)) {
                updated = list.filter(id => id !== product._id);
                setIsWishlisted(false);
                toast('Removed from saved items', { icon: '🤍' });
            } else {
                updated = [...list, product._id];
                setIsWishlisted(true);
                toast.success('Saved to wishlist');
            }
            localStorage.setItem('shopvault_wishlist', JSON.stringify(updated));
            window.dispatchEvent(new Event('wishlist-updated'));
        } catch {
            // ignore
        }
    };

    const handleCheckPincode = (e: React.FormEvent) => {
        e.preventDefault();
        if (/^\d{6}$/.test(pincode.trim())) {
            setCheckingPincode(true);
            setTimeout(() => {
                setCheckingPincode(false);
                setPincodeChecked(true);
                localStorage.setItem('shopvault_pincode', pincode.trim());
                toast.success(`Delivery available to ${pincode.trim()}`);
            }, 500);
        } else {
            toast.error('Please enter a valid 6-digit PIN code');
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 aspect-square bg-[var(--surface-elevated)] rounded-2xl animate-pulse" />
                    <div className="lg:col-span-7 space-y-4">
                        <div className="h-6 w-32 bg-[var(--surface-elevated)] rounded animate-pulse" />
                        <div className="h-10 w-3/4 bg-[var(--surface-elevated)] rounded animate-pulse" />
                        <div className="h-8 w-40 bg-[var(--surface-elevated)] rounded animate-pulse" />
                        <div className="h-24 w-full bg-[var(--surface-elevated)] rounded animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (!product) return null;

    const displayName = product.name || product.productName || 'Curated Product';
    const isInStock = (product.stock ?? 0) > 0;
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const rawImage = product.image
        ? (product.image.startsWith('http') ? product.image : `${backendBase}${product.image}`)
        : null;

    // Gallery images
    const gallery = [
        rawImage,
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&q=80',
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&q=80',
    ].filter(Boolean) as string[];

    const activeImage = gallery[selectedImageIndex] || rawImage;

    const originalPrice = Math.round(product.price * 1.25);
    const savingsAmount = originalPrice - product.price;
    const discountPercent = Math.round((savingsAmount / originalPrice) * 100);

    const charCodeSum = (product._id || product.id || 'abc').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const ratingScore = (4.0 + (charCodeSum % 10) / 10).toFixed(1);
    const reviewCount = 85 + (charCodeSum % 450);
    const ratingCount = reviewCount * 4 + 112;

    return (
        <div className="flex flex-col min-h-screen bg-[var(--background)]">

            {/* Breadcrumb Path */}
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface)] py-2.5">
                <div className="container mx-auto px-4 flex items-center gap-2 text-xs text-[var(--foreground-muted)] overflow-x-auto whitespace-nowrap">
                    <Link href="/" className="hover:text-[var(--foreground)] transition-colors">Home</Link>
                    <span>/</span>
                    <Link href="/shop" className="hover:text-[var(--foreground)] transition-colors">Shop</Link>
                    <span>/</span>
                    <Link href={`/shop?category=${encodeURIComponent(product.category || 'Goods')}`} className="hover:text-[var(--foreground)] transition-colors">
                        {product.category || 'Goods'}
                    </Link>
                    <span>/</span>
                    <span className="text-[var(--foreground)] font-semibold truncate max-w-xs">{displayName}</span>
                </div>
            </div>

            {/* Main 2-Column Flipkart Layout */}
            <div className="container mx-auto px-4 py-6 md:py-8 flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* ── LEFT COLUMN: STICKY MEDIA & DUAL ACTION BUTTONS (FLIPKART STYLE) ── */}
                    <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm relative">

                            {/* Wishlist Heart Icon */}
                            <button
                                type="button"
                                onClick={toggleWishlist}
                                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur border border-white/10 flex items-center justify-center text-white transition-transform hover:scale-110 z-10 shadow-lg"
                                aria-label="Save to wishlist"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isWishlisted ? '#ef4444' : 'none'} stroke={isWishlisted ? '#ef4444' : 'currentColor'} strokeWidth="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                            </button>

                            {/* Main Stage Image */}
                            <div className="relative aspect-square rounded-xl overflow-hidden bg-[var(--surface-elevated)] flex items-center justify-center border border-[var(--border-subtle)]">
                                {activeImage ? (
                                    <img
                                        src={activeImage}
                                        alt={displayName}
                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                                    />
                                ) : (
                                    <div className="text-6xl text-[var(--foreground-muted)] opacity-50">📦</div>
                                )}
                                {!isInStock && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                        <span className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-200 font-bold text-sm tracking-wider uppercase border border-zinc-700">
                                            Currently Out of Stock
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Thumbnail Selector Strip */}
                            {gallery.length > 1 && (
                                <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-1">
                                    {gallery.map((img, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setSelectedImageIndex(i)}
                                            className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${selectedImageIndex === i ? 'border-blue-500 shadow-md shadow-blue-500/20 scale-105' : 'border-[var(--border)] opacity-70 hover:opacity-100'}`}
                                        >
                                            <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quantity Selector & Dual CTA Buttons (Flipkart Style) */}
                        {isInStock ? (
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs">
                                    <span className="font-semibold text-[var(--foreground-secondary)]">Select Quantity:</span>
                                    <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--surface-elevated)]">
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                            disabled={quantity <= 1}
                                            className="w-7 h-7 flex items-center justify-center font-bold text-[var(--foreground)] hover:bg-[var(--surface)] disabled:opacity-40"
                                        >
                                            -
                                        </button>
                                        <span className="w-8 text-center font-bold font-mono text-[var(--foreground)]">
                                            {quantity}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                                            disabled={quantity >= product.stock}
                                            className="w-7 h-7 flex items-center justify-center font-bold text-[var(--foreground)] hover:bg-[var(--surface)] disabled:opacity-40"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={handleAddToCart}
                                    disabled={adding}
                                    className="py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-black text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                    <span>🛒</span>
                                    <span>{adding ? 'Adding...' : 'Add to Cart'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBuyNow}
                                    className="py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-black text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 shadow-orange-600/25"
                                >
                                    <span>⚡</span>
                                    <span>Buy Now</span>
                                </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold text-center">
                                This item is currently unavailable. Notify me when back in stock.
                            </div>
                        )}
                    </div>

                    {/* ── RIGHT COLUMN: PRODUCT DETAILS & OFFERS (FLIPKART STYLE) ── */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* Title & Brand Header */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)] uppercase tracking-wider font-semibold">
                                <span>{product.category || 'Curated'}</span>
                                <span>·</span>
                                <span className="text-blue-400 font-bold">Assured ✦</span>
                            </div>

                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-[var(--foreground)] leading-snug">
                                {displayName}
                            </h1>

                            {/* Ratings & Review Badge */}
                            <div className="flex items-center gap-3 pt-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-700 text-white">
                                    <span>{ratingScore}</span>
                                    <span>★</span>
                                </span>
                                <span className="text-xs text-[var(--foreground-muted)] font-medium">
                                    {ratingCount.toLocaleString('en-IN')} Ratings &amp; {reviewCount.toLocaleString('en-IN')} Reviews
                                </span>
                            </div>
                        </div>

                        {/* Price Block (Flipkart Style) */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-2 shadow-sm">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">
                                Special Price
                            </div>
                            <div className="flex items-baseline gap-3 flex-wrap">
                                <span className="text-3xl font-black text-[var(--foreground)]">
                                    ₹{product.price.toLocaleString('en-IN')}
                                </span>
                                <span className="text-base text-[var(--foreground-muted)] line-through">
                                    ₹{originalPrice.toLocaleString('en-IN')}
                                </span>
                                <span className="text-sm font-bold text-emerald-500">
                                    {discountPercent}% off
                                </span>
                            </div>
                            <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                                <span>✓</span>
                                <span>You will save ₹{savingsAmount.toLocaleString('en-IN')} on this order!</span>
                            </div>
                        </div>

                        {/* Available Offers & Discounts (Flipkart Style) */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-3 shadow-sm">
                            <div className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                                <span>🏷️</span> Available Offers
                            </div>
                            <ul className="space-y-2 text-xs text-[var(--foreground-secondary)]">
                                <li className="flex items-start gap-2.5">
                                    <span className="text-emerald-500 font-bold">🏷</span>
                                    <div>
                                        <strong className="text-[var(--foreground)]">Bank Offer:</strong> 5% Unlimited Cashback on ShopVault Axis Bank Credit Card.{' '}
                                        <span className="text-blue-400 font-semibold cursor-pointer">T&amp;C</span>
                                    </div>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="text-emerald-500 font-bold">🏷</span>
                                    <div>
                                        <strong className="text-[var(--foreground)]">Special Price:</strong> Get extra ₹300 off (price inclusive of cashback/coupon).{' '}
                                        <span className="text-blue-400 font-semibold cursor-pointer">T&amp;C</span>
                                    </div>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="text-emerald-500 font-bold">🏷</span>
                                    <div>
                                        <strong className="text-[var(--foreground)]">Partner Offer:</strong> Buy this item &amp; get Flat ₹250 off on your next purchase.{' '}
                                        <span className="text-blue-400 font-semibold cursor-pointer">T&amp;C</span>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        {/* Delivery Pincode Checker (Flipkart Style) */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-3 shadow-sm">
                            <div className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                                <span>📍</span> Delivery Options
                            </div>
                            <form onSubmit={handleCheckPincode} className="flex items-center gap-2 max-w-sm">
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={pincode}
                                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Enter 6-digit Pincode"
                                    className="flex-1 h-10 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-mono text-[var(--foreground)] outline-none focus:border-blue-500 transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={checkingPincode}
                                    className="px-4 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                                >
                                    {checkingPincode ? 'Checking...' : 'Check'}
                                </button>
                            </form>
                            {pincodeChecked && (
                                <div className="space-y-1 text-xs text-[var(--foreground-secondary)] pt-1">
                                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                                        <span>⚡</span>
                                        <span>Delivery by Tomorrow, 11:00 PM | Free ₹40</span>
                                    </div>
                                    <div className="text-[11px] text-[var(--foreground-muted)]">
                                        Cash on Delivery available · 7 Days Replacement Policy
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Description & Specifications Table */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">
                                Product Specifications
                            </h3>
                            <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">
                                {product.description || 'Authentic multi-vendor curated catalog item verified for quality and escrow guarantee.'}
                            </p>
                            <div className="divide-y divide-[var(--border-subtle)] text-xs">
                                <div className="grid grid-cols-3 py-2.5">
                                    <span className="text-[var(--foreground-muted)]">Category</span>
                                    <span className="col-span-2 font-medium text-[var(--foreground)]">{product.category}</span>
                                </div>
                                <div className="grid grid-cols-3 py-2.5">
                                    <span className="text-[var(--foreground-muted)]">Stock Availability</span>
                                    <span className="col-span-2 font-medium text-emerald-400">{product.stock} units ready to dispatch</span>
                                </div>
                                <div className="grid grid-cols-3 py-2.5">
                                    <span className="text-[var(--foreground-muted)]">Authenticity Guarantee</span>
                                    <span className="col-span-2 font-medium text-[var(--foreground)]">100% Genuine with Escrow Safe Deposit</span>
                                </div>
                                <div className="grid grid-cols-3 py-2.5">
                                    <span className="text-[var(--foreground-muted)]">Domestic Warranty</span>
                                    <span className="col-span-2 font-medium text-[var(--foreground)]">1 Year Manufacturer Warranty</span>
                                </div>
                            </div>
                        </div>

                        {/* Seller Information Box */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex items-center justify-between shadow-sm">
                            <div>
                                <div className="text-[11px] text-[var(--foreground-muted)] uppercase tracking-wider">Seller Details</div>
                                <div className="font-bold text-sm text-[var(--foreground)] flex items-center gap-2 mt-0.5">
                                    <span>TechVault Atelier</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30">4.9 ★</span>
                                </div>
                                <div className="text-[11px] text-[var(--foreground-muted)] mt-1">
                                    7 Days Replacement Policy · GST Invoice Available
                                </div>
                            </div>
                            <Link href="/shop" className="text-xs font-bold text-blue-400 hover:underline">
                                See other sellers →
                            </Link>
                        </div>

                        {/* Customer Ratings Breakdown (Flipkart Style) */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">
                                Ratings &amp; Reviews
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                                <div className="text-center sm:text-left space-y-1">
                                    <div className="text-4xl font-black text-[var(--foreground)] flex items-center justify-center sm:justify-start gap-1">
                                        <span>{ratingScore}</span>
                                        <span className="text-emerald-500 text-3xl">★</span>
                                    </div>
                                    <div className="text-xs text-[var(--foreground-muted)]">
                                        {ratingCount.toLocaleString('en-IN')} Ratings &amp;<br />{reviewCount.toLocaleString('en-IN')} Reviews
                                    </div>
                                </div>

                                <div className="sm:col-span-2 space-y-1.5 text-xs">
                                    {[
                                        { star: 5, pct: 72, color: 'bg-emerald-500' },
                                        { star: 4, pct: 18, color: 'bg-emerald-600' },
                                        { star: 3, pct: 6, color: 'bg-amber-500' },
                                        { star: 2, pct: 2, color: 'bg-orange-500' },
                                        { star: 1, pct: 2, color: 'bg-red-500' },
                                    ].map((row) => (
                                        <div key={row.star} className="flex items-center gap-2">
                                            <span className="w-6 text-[var(--foreground-muted)] font-mono">{row.star}★</span>
                                            <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                                                <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                                            </div>
                                            <span className="w-8 text-right text-[10px] text-[var(--foreground-muted)] font-mono">{row.pct}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
