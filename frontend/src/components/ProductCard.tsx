'use client';
import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Product } from '@/lib/products';

interface ProductCardProps {
    product: Product;
    index?: number;
    onEdit?: (product: Product) => void;
    onDelete?: (id: string) => void;
    isAdmin?: boolean;
}

// Cart helpers — kept local to avoid SSR issues with the cart page module
function addToCartLocal(product: Product) {
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

export default function ProductCard({ product, index = 0, onEdit, onDelete, isAdmin }: ProductCardProps) {
    const [adding, setAdding] = useState(false);
    const displayName = product.name || product.productName || 'Unnamed Product';
    const isInStock = (product.stock ?? 0) > 0;
    const imageUrl = product.image
        ? (product.image.startsWith('http') ? product.image : `http://localhost:8000${product.image}`)
        : null;

    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!isInStock) return;
        setAdding(true);
        const ok = addToCartLocal(product);
        if (ok) {
            toast.success(`${displayName} added to cart! 🛒`);
        } else {
            toast.error('Could not add to cart.');
        }
        setTimeout(() => setAdding(false), 600);
    };

    return (
        <div
            className="product-card"
            style={{ animation: `fadeInUp 0.5s ease ${index * 0.07}s both` }}
        >
            {/* Image */}
            <div className="product-card-image">
                {imageUrl ? (
                    <img src={imageUrl} alt={displayName} loading="lazy" />
                ) : (
                    <div className="product-card-no-image">🛍️</div>
                )}
                <span className={`product-card-badge ${!isInStock ? 'out-of-stock' : ''}`}>
                    {isInStock ? `In Stock (${product.stock})` : 'Out of Stock'}
                </span>
                {/* Hover Overlay */}
                <div className="product-card-overlay">
                    <Link href={`/shop/${product._id}`} className="btn btn-primary btn-sm">
                        View Details
                    </Link>
                    {!isAdmin && isInStock && (
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleAddToCart}
                            disabled={adding}
                        >
                            {adding ? '✓ Added!' : '🛒 Add to Cart'}
                        </button>
                    )}
                    {isAdmin && (
                        <>
                            {onEdit && (
                                <button className="btn btn-secondary btn-sm" onClick={() => onEdit(product)}>
                                    ✏️ Edit
                                </button>
                            )}
                            {onDelete && (
                                <button className="btn btn-danger btn-sm" onClick={() => onDelete(product._id)}>
                                    🗑
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="product-card-body">
                <div className="product-card-category">{product.category}</div>
                <div className="product-card-name">{displayName}</div>
                <div className="product-card-description">{product.description}</div>
                <div className="product-card-footer">
                    <div className="product-price">₹{product.price.toLocaleString('en-IN')}</div>
                    {isInStock ? (
                        <button
                            className={`btn btn-primary btn-sm ${adding ? 'btn-loading' : ''}`}
                            onClick={handleAddToCart}
                            disabled={adding}
                            id={`add-to-cart-${product._id}`}
                        >
                            {adding ? '✓' : '🛒 Add'}
                        </button>
                    ) : (
                        <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600 }}>Out of Stock</span>
                    )}
                </div>
            </div>
        </div>
    );
}
