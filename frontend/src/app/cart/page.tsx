'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface CartItem {
    _id: string;
    name: string;
    price: number;
    image?: string;
    category: string;
    quantity: number;
    stock: number;
}

const CART_KEY = 'shopvault_cart';

export function getCart(): CartItem[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch {
        return [];
    }
}

export function saveCart(cart: CartItem[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function addToCart(item: Omit<CartItem, 'quantity'>) {
    const cart = getCart();
    const existing = cart.find(c => c._id === item._id);
    if (existing) {
        existing.quantity = Math.min(existing.quantity + 1, item.stock);
    } else {
        cart.push({ ...item, quantity: 1 });
    }
    saveCart(cart);
    window.dispatchEvent(new Event('cart-updated'));
}

export default function CartPage() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { isLoggedIn } = useAuth();
    const router = useRouter();

    const refreshCart = () => {
        setCart(getCart());
        setLoading(false);
    };

    useEffect(() => {
        refreshCart();
        window.addEventListener('cart-updated', refreshCart);
        return () => window.removeEventListener('cart-updated', refreshCart);
    }, []);

    const updateQty = (id: string, delta: number) => {
        const updated = cart.map(item => {
            if (item._id !== id) return item;
            const newQty = Math.max(1, Math.min(item.quantity + delta, item.stock));
            return { ...item, quantity: newQty };
        });
        saveCart(updated);
        setCart(updated);
    };

    const removeItem = (id: string) => {
        const updated = cart.filter(item => item._id !== id);
        saveCart(updated);
        setCart(updated);
        toast.success('Item removed from cart');
    };

    const clearCart = () => {
        saveCart([]);
        setCart([]);
        toast.success('Cart cleared');
    };

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal > 0 ? (subtotal > 500 ? 0 : 49) : 0;
    const total = subtotal + shipping;

    const handleCheckout = () => {
        if (!isLoggedIn) {
            toast.error('Please login to checkout');
            router.push('/login');
            return;
        }
        toast.success('Checkout coming soon! 🚀', { duration: 3000 });
    };

    if (loading) {
        return (
            <div style={{ paddingTop: '100px', minHeight: '100vh' }}>
                <div className="container" style={{ maxWidth: '900px', padding: '2rem 1.5rem' }}>
                    <div className="skeleton" style={{ height: '40px', width: '200px', marginBottom: '2rem' }} />
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton" style={{ height: '100px', marginBottom: '1rem', borderRadius: '16px' }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ paddingTop: '90px', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--glass-border)', padding: '2.5rem 0 2rem' }}>
                <div className="container">
                    <div className="section-tag">🛒 Shopping Cart</div>
                    <h1 className="section-title" style={{ marginTop: '0.5rem' }}>
                        Your <span className="text-gradient">Cart</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {cart.length === 0 ? 'Your cart is empty' : `${cart.length} item${cart.length !== 1 ? 's' : ''} in your cart`}
                    </p>
                </div>
            </div>

            <div className="container" style={{ padding: '2rem 1.5rem' }}>
                {cart.length === 0 ? (
                    <div className="empty-state" style={{ marginTop: '3rem' }}>
                        <div className="empty-icon">🛒</div>
                        <div className="empty-title">Your cart is empty</div>
                        <div className="empty-description">
                            Browse our products and add items to your cart.
                        </div>
                        <Link href="/shop" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
                            Browse Products
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr min(360px, 100%)', gap: '2rem', alignItems: 'start' }}>
                        {/* Cart Items */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Cart Items</span>
                                <button
                                    onClick={clearCart}
                                    style={{ fontSize: '0.8rem', color: '#f87171', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Clear All
                                </button>
                            </div>

                            {cart.map(item => (
                                <div
                                    key={item._id}
                                    className="card-glass"
                                    style={{ display: 'flex', gap: '1.25rem', padding: '1.25rem', alignItems: 'center' }}
                                >
                                    {/* Image */}
                                    <div style={{
                                        width: '80px', height: '80px', borderRadius: '12px', flexShrink: 0,
                                        background: item.image ? `url(http://localhost:8000${item.image}) center/cover` : 'var(--glass-bg)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '2rem', border: '1px solid var(--glass-border)',
                                    }}>
                                        {!item.image && '📦'}
                                    </div>

                                    {/* Details */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.name}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                            {item.category}
                                        </div>
                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
                                            ₹{item.price.toLocaleString()}
                                        </div>
                                    </div>

                                    {/* Qty controls */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                        <button
                                            onClick={() => updateQty(item._id, -1)}
                                            disabled={item.quantity <= 1}
                                            style={{
                                                width: '32px', height: '32px', borderRadius: '8px', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                                                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                                                cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer', opacity: item.quantity <= 1 ? 0.5 : 1,
                                                fontSize: '1.1rem',
                                            }}
                                        >−</button>
                                        <span style={{ minWidth: '28px', textAlign: 'center', fontWeight: 700, fontSize: '0.95rem' }}>
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => updateQty(item._id, 1)}
                                            disabled={item.quantity >= item.stock}
                                            style={{
                                                width: '32px', height: '32px', borderRadius: '8px', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                                                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                                                cursor: item.quantity >= item.stock ? 'not-allowed' : 'pointer',
                                                opacity: item.quantity >= item.stock ? 0.5 : 1, fontSize: '1.1rem',
                                            }}
                                        >+</button>
                                    </div>

                                    {/* Item total */}
                                    <div style={{ fontWeight: 800, minWidth: '80px', textAlign: 'right', color: 'var(--text-primary)', flexShrink: 0 }}>
                                        ₹{(item.price * item.quantity).toLocaleString()}
                                    </div>

                                    {/* Remove */}
                                    <button
                                        onClick={() => removeItem(item._id)}
                                        style={{ color: '#f87171', fontWeight: 700, cursor: 'pointer', fontSize: '1.1rem', flexShrink: 0 }}
                                        title="Remove item"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Order Summary */}
                        <div className="card-glass" style={{ padding: '1.75rem', position: 'sticky', top: '88px' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1.5rem' }}>Order Summary</div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                                    <span>₹{subtotal.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    <span>Shipping</span>
                                    <span style={{ color: shipping === 0 ? '#10b981' : 'inherit' }}>
                                        {shipping === 0 ? 'FREE' : `₹${shipping}`}
                                    </span>
                                </div>
                                {shipping > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--glass-bg)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                                        💡 Add ₹{(500 - subtotal).toLocaleString()} more for FREE shipping!
                                    </div>
                                )}
                                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem' }}>
                                    <span>Total</span>
                                    <span className="text-gradient">₹{total.toLocaleString()}</span>
                                </div>
                            </div>

                            <button
                                id="checkout-btn"
                                className="btn btn-primary w-full btn-lg"
                                onClick={handleCheckout}
                            >
                                {isLoggedIn ? '🚀 Proceed to Checkout' : '🔑 Login to Checkout'}
                            </button>

                            <Link href="/shop" className="btn btn-secondary w-full" style={{ marginTop: '0.75rem', textAlign: 'center', display: 'block' }}>
                                ← Continue Shopping
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
