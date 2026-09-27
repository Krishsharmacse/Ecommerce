'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Heart, ShoppingBag, Package, Star, Truck } from 'lucide-react';
import { Product } from '@/lib/products';

interface ProductCardProps {
    product: Product;
    index?: number;
    onEdit?: (product: Product | null) => void;
    onDelete?: (id: string) => void;
    isAdmin?: boolean;
}

function addToCartLocal(product: Product): boolean {
    try {
        const CART_KEY = 'shopvault_cart';
        const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        const existing = cart.find((c: { _id: string }) => c._id === product._id);
        if (existing) {
            existing.quantity = Math.min(existing.quantity + 1, product.stock);
        } else {
            cart.push({
                _id: product._id,
                name: product.name || product.productName || 'Product',
                price: product.price,
                image: product.image,
                category: product.category,
                stock: product.stock,
                quantity: 1,
            });
        }
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        window.dispatchEvent(new Event('cart-updated'));
        return true;
    } catch { return false; }
}

export default function ProductCard({ product, onEdit, onDelete, isAdmin }: ProductCardProps) {
    const [adding, setAdding] = useState(false);
    const [isWishlisted, setIsWishlisted] = useState(false);

    const displayName = product.name || product.productName || 'Product';
    const isInStock = (product.stock ?? 0) > 0;
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const imageUrl = product.image
        ? (product.image.startsWith('http') ? product.image : `${backendBase}${product.image}`)
        : null;

    // Only show discount if real data exists — no fabricated prices
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount
        ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
        : null;

    // Only show rating if real data exists
    const hasRating = typeof product.rating === 'number' && product.rating > 0;
    const ratingCount = product.ratingCount ?? null;

    useEffect(() => {
        let isMounted = true;
        const check = () => {
            try {
                const list: string[] = JSON.parse(localStorage.getItem('shopvault_wishlist') || '[]');
                if (isMounted) setIsWishlisted(list.includes(product._id));
            } catch { /* ignore */ }
        };
        check();
        window.addEventListener('wishlist-updated', check);
        return () => { isMounted = false; window.removeEventListener('wishlist-updated', check); };
    }, [product._id]);

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (!isInStock || adding) return;
        setAdding(true);
        if (addToCartLocal(product)) {
            toast.success(`${displayName} added to cart!`);
        } else {
            toast.error('Could not add to cart.');
        }
        setTimeout(() => setAdding(false), 400);
    };

    const toggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        try {
            const list: string[] = JSON.parse(localStorage.getItem('shopvault_wishlist') || '[]');
            const updated = list.includes(product._id)
                ? list.filter(id => id !== product._id)
                : [...list, product._id];
            const nowWishlisted = updated.includes(product._id);
            setIsWishlisted(nowWishlisted);
            localStorage.setItem('shopvault_wishlist', JSON.stringify(updated));
            window.dispatchEvent(new Event('wishlist-updated'));
            if (nowWishlisted) toast.success('Saved to wishlist');
            else toast('Removed from wishlist', { icon: '🤍' });
        } catch { /* ignore */ }
    };

    return (
        <article className="product-card group relative flex flex-col"
            style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                transition: 'border-color var(--dur-base), box-shadow var(--dur-base), transform var(--dur-base)',
            }}>

            {/* Image Container */}
            <div className="product-card__media relative w-full overflow-hidden flex-shrink-0"
                style={{ aspectRatio: '4/3', background: 'var(--surface-sunken)' }}>
                <Link href={`/shop/${product._id}`} className="block w-full h-full" tabIndex={-1} aria-hidden="true">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={displayName}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center"
                            style={{ background: 'var(--surface-elevated)' }}>
                            <Package className="w-10 h-10" style={{ color: 'var(--foreground-muted)', opacity: 0.4 }} />
                        </div>
                    )}
                </Link>

                {/* Stock Badge */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                    {!isInStock ? (
                        <span className="badge badge--neutral text-[10px]">Out of Stock</span>
                    ) : product.stock <= 5 ? (
                        <span className="badge badge--warning text-[10px]">Only {product.stock} left</span>
                    ) : null}
                    {hasDiscount && (
                        <span className="badge badge--success text-[10px]">{discountPercent}% off</span>
                    )}
                </div>

                {/* Wishlist Button */}
                <button type="button" onClick={toggleWishlist}
                    aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    aria-pressed={isWishlisted}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 opacity-0 group-hover:opacity-100"
                    style={{
                        background: 'rgba(0,0,0,0.55)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                    <Heart
                        className="w-4 h-4"
                        fill={isWishlisted ? '#ef4444' : 'none'}
                        stroke={isWishlisted ? '#ef4444' : '#fff'}
                        strokeWidth={2}
                    />
                </button>

                {/* Quick Add — slide up on hover (desktop) */}
                {!isAdmin && isInStock && (
                    <button type="button" onClick={handleAddToCart} disabled={adding}
                        className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-2 py-2.5 text-white text-xs font-semibold tracking-wide transition-all duration-200 translate-y-full group-hover:translate-y-0"
                        style={{ background: adding ? 'var(--primary-hover)' : 'var(--primary)' }}>
                        <ShoppingBag className="w-3.5 h-3.5" />
                        {adding ? 'Adding...' : 'Add to Cart'}
                    </button>
                )}

                {/* Admin controls */}
                {isAdmin && (
                    <div className="absolute inset-x-2 bottom-2 flex gap-1.5 z-10 p-1.5 rounded-lg"
                        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                        {onEdit && (
                            <button type="button" onClick={() => onEdit(product)}
                                className="btn btn--secondary btn--sm flex-1 text-xs">
                                Edit
                            </button>
                        )}
                        {onDelete && (
                            <button type="button" onClick={() => onDelete(product._id)}
                                className="btn btn--danger btn--sm flex-1 text-xs">
                                Delete
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col flex-1 justify-between p-3.5 gap-2">
                <div>
                    {/* Category */}
                    {product.category && (
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                            style={{ color: 'var(--foreground-muted)' }}>
                            {product.category}
                        </div>
                    )}

                    {/* Product Name */}
                    <Link href={`/shop/${product._id}`}>
                        <h3 className="text-sm font-semibold leading-snug line-clamp-2 hover:text-blue-400 transition-colors"
                            style={{ color: 'var(--foreground)' }}>
                            {displayName}
                        </h3>
                    </Link>

                    {/* Rating — only shown if real data */}
                    {hasRating && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold"
                                style={{ background: '#059669', color: '#fff' }}>
                                <Star className="w-2.5 h-2.5" fill="#fff" stroke="none" />
                                {product.rating!.toFixed(1)}
                            </span>
                            {ratingCount && (
                                <span className="text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
                                    ({ratingCount.toLocaleString('en-IN')})
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Price section */}
                <div className="pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                            ₹{product.price.toLocaleString('en-IN')}
                        </span>
                        {hasDiscount && (
                            <>
                                <span className="text-xs line-through" style={{ color: 'var(--foreground-muted)' }}>
                                    ₹{product.originalPrice!.toLocaleString('en-IN')}
                                </span>
                                <span className="text-xs font-bold text-emerald-500">
                                    {discountPercent}% off
                                </span>
                            </>
                        )}
                    </div>

                    {/* Show stock-based delivery message only if in stock */}
                    {isInStock && (
                        <div className="flex items-center gap-1 mt-1">
                            <Truck className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--foreground-muted)' }} />
                            <span className="text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
                                Free delivery available
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}
