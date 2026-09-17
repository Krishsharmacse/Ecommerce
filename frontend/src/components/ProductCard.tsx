'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Product } from '@/lib/products';

interface ProductCardProps {
    product: Product;
    index?: number;
    onEdit?: (product: Product) => void;
    onDelete?: (id: string) => void;
    isAdmin?: boolean;
}

function addToCartLocal(product: Product): boolean {
    try {
        const CART_KEY = 'shopvault_cart';
        const raw = localStorage.getItem(CART_KEY);
        const cart = raw ? JSON.parse(raw) : [];
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
    } catch {
        return false;
    }
}

export default function ProductCard({ product, onEdit, onDelete, isAdmin }: ProductCardProps) {
    const [adding, setAdding] = useState(false);
    const [isWishlisted, setIsWishlisted] = useState(false);

    const displayName = product.name || product.productName || 'Curated Product';
    const isInStock = (product.stock ?? 0) > 0;
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const imageUrl = product.image
        ? (product.image.startsWith('http') ? product.image : `${backendBase}${product.image}`)
        : null;

    const originalPrice = Math.round(product.price * 1.25);
    const discountPercent = Math.round(((originalPrice - product.price) / originalPrice) * 100);
    // Deterministic rating based on product ID character code for realistic preview
    const charCodeSum = (product._id || product.id || 'abc').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const ratingScore = (3.8 + (charCodeSum % 12) / 10).toFixed(1);
    const reviewCount = 20 + (charCodeSum % 230);

    useEffect(() => {
        let isMounted = true;
        const checkWishlist = async () => {
            try {
                const raw = localStorage.getItem('shopvault_wishlist');
                if (raw && isMounted) {
                    const list: string[] = JSON.parse(raw);
                    setIsWishlisted(list.includes(product._id));
                }
            } catch {
                // ignore
            }
        };

        void checkWishlist();

        const handleWishlistUpdated = () => {
            void checkWishlist();
        };

        window.addEventListener('wishlist-updated', handleWishlistUpdated);
        return () => {
            isMounted = false;
            window.removeEventListener('wishlist-updated', handleWishlistUpdated);
        };
    }, [product._id]);

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isInStock || adding) return;
        setAdding(true);
        const ok = addToCartLocal(product);
        if (ok) {
            toast.success(`${displayName} added to bag!`);
        } else {
            toast.error('Could not add to cart.');
        }
        setTimeout(() => setAdding(false), 400);
    };

    const toggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
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

    return (
        <article className="product-card group relative flex flex-col justify-between bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent-500)] rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg">
            {/* Visual Media Showcase */}
            <div className="product-card__media relative w-full aspect-square bg-[var(--surface-elevated)] overflow-hidden flex items-center justify-center">
                <Link href={`/shop/${product._id}`} className="block w-full h-full">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={displayName}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl opacity-40">
                            📦
                        </div>
                    )}
                </Link>

                {/* Badges */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                    {!isInStock ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">Out of Stock</span>
                    ) : product.stock < 5 ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Only {product.stock} left</span>
                    ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">Assured</span>
                    )}
                </div>

                {/* Wishlist Icon */}
                <button
                    type="button"
                    onClick={toggleWishlist}
                    aria-label="Save to wishlist"
                    aria-pressed={isWishlisted}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur border border-white/10 flex items-center justify-center text-white transition-transform hover:scale-110 z-10"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isWishlisted ? '#ef4444' : 'none'} stroke={isWishlisted ? '#ef4444' : 'currentColor'} strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                </button>

                {/* Quick Add Slide-up Action */}
                {!isAdmin && isInStock && (
                    <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={adding}
                        className="absolute inset-x-2 bottom-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs tracking-wide shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-1.5 z-10"
                    >
                        <span>{adding ? 'Adding...' : 'Add to Bag'}</span>
                        <span className="text-sm leading-none">+</span>
                    </button>
                )}

                {/* Admin controls */}
                {isAdmin && (
                    <div className="absolute inset-x-2 bottom-2 flex gap-1.5 z-10 bg-black/80 p-1.5 rounded-lg backdrop-blur">
                        {onEdit && (
                            <button
                                type="button"
                                onClick={() => onEdit(product)}
                                className="btn btn--secondary btn--sm flex-1 text-xs"
                            >
                                Edit
                            </button>
                        )}
                        {onDelete && (
                            <button
                                type="button"
                                onClick={() => onDelete(product._id)}
                                className="btn btn--danger btn--sm flex-1 text-xs"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Product Meta */}
            <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
                <div>
                    <div className="text-[11px] font-medium tracking-wide uppercase text-[var(--foreground-muted)] mb-0.5">
                        {product.category || 'Curated'}
                    </div>

                    <Link href={`/shop/${product._id}`}>
                        <h3 className="font-semibold text-sm text-[var(--foreground)] line-clamp-2 hover:text-blue-400 transition-colors leading-snug">
                            {displayName}
                        </h3>
                    </Link>

                    {/* Rating Pill */}
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-700 text-white leading-none">
                            {ratingScore} <span>★</span>
                        </span>
                        <span className="text-[11px] text-[var(--foreground-muted)]">
                            ({reviewCount})
                        </span>
                    </div>
                </div>

                {/* Price and Delivery Section */}
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-base font-bold text-[var(--foreground)]">
                            ₹{product.price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-[var(--foreground-muted)] line-through">
                            ₹{originalPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs font-bold text-emerald-500">
                            {discountPercent}% off
                        </span>
                    </div>
                    <div className="text-[11px] text-[var(--foreground-secondary)] mt-0.5 flex items-center gap-1">
                        <span>⚡</span>
                        <span>Free Delivery by Tomorrow</span>
                    </div>
                </div>
            </div>
        </article>
    );
}
