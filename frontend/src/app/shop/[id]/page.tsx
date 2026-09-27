'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { productService, Product } from '@/lib/products';
import toast from 'react-hot-toast';
import {
    Heart, ShoppingBag, Zap, Check, Tag, MapPin, ShieldCheck,
    Award, Star, Truck, ArrowRight, Package, Clock
} from 'lucide-react';

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
                toast.success('Removed from wishlist');
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
            }, 400);
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
    
    // Build real gallery from product
    const gallery: string[] = [];
    if (product.image) {
        const url = product.image.startsWith('http') ? product.image : `${backendBase}${product.image}`;
        gallery.push(url);
    }
    if (Array.isArray(product.images)) {
        for (const item of product.images as unknown[]) {
            const rawUrl = typeof item === 'string' ? item : (item as { url?: string })?.url;
            if (rawUrl && typeof rawUrl === 'string') {
                const url = rawUrl.startsWith('http') ? rawUrl : `${backendBase}${rawUrl}`;
                if (!gallery.includes(url)) gallery.push(url);
            }
        }
    }

    const activeImage = gallery[selectedImageIndex] || gallery[0] || null;
    const originalPrice = product.originalPrice || Math.round(product.price * 1.25);
    const hasDiscount = originalPrice > product.price;
    const savingsAmount = originalPrice - product.price;
    const discountPercent = hasDiscount ? Math.round((savingsAmount / originalPrice) * 100) : 0;

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
                                <Heart className={`w-5 h-5 transition-colors ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-white'}`} />
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
                                    <div className="flex flex-col items-center gap-2 text-[var(--foreground-muted)] opacity-50">
                                        <Package className="w-16 h-16 stroke-[1.2]" />
                                        <span className="text-xs font-mono uppercase tracking-wider">No Image</span>
                                    </div>
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

                        {/* Quantity Selector & Dual CTA Buttons */}
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
                                        <ShoppingBag className="w-4 h-4" />
                                        <span>{adding ? 'Adding...' : 'Add to Cart'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleBuyNow}
                                        className="py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-black text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 shadow-orange-600/25"
                                    >
                                        <Zap className="w-4 h-4 fill-white" />
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

                    {/* ── RIGHT COLUMN: PRODUCT DETAILS & OFFERS ── */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* Title & Brand Header */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)] uppercase tracking-wider font-semibold">
                                <span>{product.category || 'Curated'}</span>
                                <span>·</span>
                                <span className="text-blue-400 font-bold inline-flex items-center gap-1">
                                    <Award className="w-3.5 h-3.5" /> Assured
                                </span>
                            </div>

                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-[var(--foreground)] leading-snug">
                                {displayName}
                            </h1>

                            {/* Ratings & Review Badge */}
                            {product.rating ? (
                                <div className="flex items-center gap-3 pt-1">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-700 text-white">
                                        <span>{product.rating}</span>
                                        <Star className="w-3 h-3 fill-white" />
                                    </span>
                                    {product.ratingCount && (
                                        <span className="text-xs text-[var(--foreground-muted)] font-medium">
                                            {product.ratingCount.toLocaleString('en-IN')} Ratings
                                        </span>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        {/* Price Block */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-2 shadow-sm">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">
                                Special Price
                            </div>
                            <div className="flex items-baseline gap-3 flex-wrap">
                                <span className="text-3xl font-black text-[var(--foreground)]">
                                    ₹{product.price.toLocaleString('en-IN')}
                                </span>
                                {hasDiscount && (
                                    <>
                                        <span className="text-base text-[var(--foreground-muted)] line-through">
                                            ₹{originalPrice.toLocaleString('en-IN')}
                                        </span>
                                        <span className="text-sm font-bold text-emerald-500">
                                            {discountPercent}% off
                                        </span>
                                    </>
                                )}
                            </div>
                            {hasDiscount && (
                                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" />
                                    <span>You save ₹{savingsAmount.toLocaleString('en-IN')} on this order!</span>
                                </div>
                            )}
                        </div>

                        {/* Available Offers & Discounts */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-3 shadow-sm">
                            <div className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                                <Tag className="w-3.5 h-3.5 text-blue-500" /> Available Offers
                            </div>
                            <ul className="space-y-2 text-xs text-[var(--foreground-secondary)]">
                                <li className="flex items-start gap-2.5">
                                    <Tag className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="text-[var(--foreground)]">Bank Offer:</strong> 5% Unlimited Cashback on ShopVault Axis Bank Credit Card.{' '}
                                        <span className="text-blue-400 font-semibold cursor-pointer">T&amp;C</span>
                                    </div>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <Tag className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="text-[var(--foreground)]">Special Price:</strong> Get extra ₹300 off (price inclusive of cashback/coupon).{' '}
                                        <span className="text-blue-400 font-semibold cursor-pointer">T&amp;C</span>
                                    </div>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <Tag className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="text-[var(--foreground)]">Partner Offer:</strong> Buy this item &amp; get Flat ₹250 off on your next purchase.{' '}
                                        <span className="text-blue-400 font-semibold cursor-pointer">T&amp;C</span>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        {/* Delivery Pincode Checker */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-3 shadow-sm">
                            <div className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-blue-500" /> Delivery Options
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
                                        <Truck className="w-3.5 h-3.5" />
                                        <span>Delivery by Tomorrow, 11:00 PM | Free Delivery</span>
                                    </div>
                                    <div className="text-[11px] text-[var(--foreground-muted)] flex items-center gap-2">
                                        <span>Cash on Delivery available</span>
                                        <span>·</span>
                                        <span>7 Days Replacement Policy</span>
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
                                    <span className="col-span-2 font-medium text-[var(--foreground)] inline-flex items-center gap-1.5">
                                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> 100% Genuine with Escrow Safe Deposit
                                    </span>
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
                                    <span>Verified Atelier</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30 inline-flex items-center gap-0.5">
                                        4.9 <Star className="w-2.5 h-2.5 fill-blue-400" />
                                    </span>
                                </div>
                                <div className="text-[11px] text-[var(--foreground-muted)] mt-1">
                                    7 Days Replacement Policy · GST Invoice Available
                                </div>
                            </div>
                            <Link href="/shop" className="text-xs font-bold text-blue-400 hover:underline inline-flex items-center gap-1">
                                See all items <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
