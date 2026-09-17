'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
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

interface Address {
    id?: string;
    _id?: string;
    label?: string;
    fullName: string;
    phone: string;
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    isDefault?: boolean;
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

export default function CartPage() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkingOut, setCheckingOut] = useState(false);
    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1); // 1: Address, 2: Summary, 3: Payment
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'COD'>('RAZORPAY');
    const [pincode, setPincode] = useState('560001');

    // New address fields
    const [addressForm, setAddressForm] = useState<Address>({
        fullName: '',
        phone: '',
        line1: '',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'IN',
    });

    const { user, isLoggedIn } = useAuth();
    const router = useRouter();

    const refreshCart = () => {
        setCart(getCart());
        setLoading(false);
        const savedPin = localStorage.getItem('shopvault_pincode');
        if (savedPin) setPincode(savedPin);
    };

    useEffect(() => {
        refreshCart();
        window.addEventListener('cart-updated', refreshCart);
        return () => window.removeEventListener('cart-updated', refreshCart);
    }, []);

    // Fetch user addresses if logged in
    useEffect(() => {
        if (isLoggedIn) {
            api.get('/users/me/addresses')
                .then((res) => {
                    const addrs: Address[] = res.data.addresses || [];
                    setAddresses(addrs);
                    if (addrs.length > 0 && addrs[0].postalCode) {
                        setPincode(addrs[0].postalCode);
                    }
                })
                .catch(() => setAddresses([]));
        }
    }, [isLoggedIn]);

    const updateQty = (id: string, delta: number) => {
        const updated = cart.map(item => {
            if (item._id !== id) return item;
            const newQty = Math.max(1, Math.min(item.quantity + delta, item.stock));
            return { ...item, quantity: newQty };
        });
        saveCart(updated);
        setCart(updated);
        window.dispatchEvent(new Event('cart-updated'));
    };

    const removeItem = (id: string) => {
        const updated = cart.filter(item => item._id !== id);
        saveCart(updated);
        setCart(updated);
        window.dispatchEvent(new Event('cart-updated'));
        toast('Item removed from cart', { icon: '🗑️' });
    };

    const saveForLater = (id: string) => {
        const item = cart.find(i => i._id === id);
        if (item) {
            try {
                const raw = localStorage.getItem('shopvault_wishlist');
                const list: string[] = raw ? JSON.parse(raw) : [];
                if (!list.includes(id)) {
                    localStorage.setItem('shopvault_wishlist', JSON.stringify([...list, id]));
                    window.dispatchEvent(new Event('wishlist-updated'));
                }
                removeItem(id);
                toast.success('Moved to wishlist');
            } catch {
                removeItem(id);
            }
        }
    };

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const originalSubtotal = Math.round(subtotal * 1.25);
    const discountAmount = originalSubtotal - subtotal;
    const deliveryCharge = 0; // Free delivery
    const totalAmount = subtotal + deliveryCharge;

    const handleOpenCheckout = () => {
        if (!isLoggedIn) {
            toast.error('Please sign in to place order');
            router.push('/login?redirect=/cart');
            return;
        }
        if (addresses.length === 0) {
            setAddressForm({
                fullName: `${user?.firstname || ''} ${user?.lastname || ''}`.trim() || 'Valued Customer',
                phone: '9876543210',
                line1: '100 Innovation Park, Tech Hub',
                city: 'Bengaluru',
                state: 'Karnataka',
                postalCode: pincode,
                country: 'IN',
            });
        }
        setCheckoutModalOpen(true);
    };

    const handleFinalOrder = async () => {
        setCheckingOut(true);
        try {
            // First sync cart items to backend cart
            await api.delete('/cart');
            for (const item of cart) {
                await api.post('/cart/items', {
                    productId: item._id,
                    quantity: item.quantity,
                });
            }

            // Determine address
            let targetAddress = addresses[selectedAddressIndex];
            if (!targetAddress) {
                const res = await api.post('/users/me/addresses', {
                    ...addressForm,
                    label: 'Primary Delivery',
                    isDefault: true,
                });
                targetAddress = res.data.address;
            }

            // Create order on backend
            const orderRes = await api.post('/orders', {
                shippingAddress: {
                    fullName: targetAddress.fullName,
                    phone: targetAddress.phone,
                    line1: targetAddress.line1,
                    city: targetAddress.city,
                    state: targetAddress.state,
                    postalCode: targetAddress.postalCode,
                    country: targetAddress.country || 'IN',
                },
                paymentMethod,
            });

            const order = orderRes.data.order;

            // Trigger payment gateway order creation if Razorpay
            if (paymentMethod === 'RAZORPAY') {
                try {
                    await api.post('/payments/create-order', { orderId: order.id });
                } catch {
                    // Gateway simulation fallback
                }
            }

            // Clear local cart
            saveCart([]);
            setCart([]);
            window.dispatchEvent(new Event('cart-updated'));

            toast.success(`Order #${order.id.slice(-6).toUpperCase()} placed successfully!`);
            setCheckoutModalOpen(false);
            setTimeout(() => {
                router.push('/dashboard/customer');
            }, 1200);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Checkout failed. Please verify stock.');
        } finally {
            setCheckingOut(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-16">
                <div className="h-8 w-48 bg-[var(--surface-elevated)] rounded-xl mb-8 animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-4">
                        <div className="h-32 bg-[var(--surface-elevated)] rounded-2xl animate-pulse" />
                        <div className="h-32 bg-[var(--surface-elevated)] rounded-2xl animate-pulse" />
                    </div>
                    <div className="lg:col-span-4 h-64 bg-[var(--surface-elevated)] rounded-2xl animate-pulse" />
                </div>
            </div>
        );
    }

    if (cart.length === 0) {
        return (
            <div className="container mx-auto px-4 py-20 flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 rounded-3xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-5xl mb-6 shadow-xl">
                    🛍️
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--foreground)] mb-2">
                    Your shopping cart is empty
                </h1>
                <p className="text-sm text-[var(--foreground-muted)] max-w-sm mb-6">
                    Explore our curated catalog for precision electronics, apparel, and lifestyle drops.
                </p>
                <Link
                    href="/shop"
                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/25"
                >
                    Explore Deals Now
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[var(--background)]">

            {/* Breadcrumb strip */}
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface)] py-2.5">
                <div className="container mx-auto px-4 flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                    <Link href="/" className="hover:text-[var(--foreground)] transition-colors">Home</Link>
                    <span>/</span>
                    <span className="text-[var(--foreground)] font-semibold">Shopping Cart ({totalItems})</span>
                </div>
            </div>

            {/* Main Flipkart-Style 2-Column Cart Layout */}
            <div className="container mx-auto px-4 py-6 md:py-8 flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* ── LEFT COLUMN: DELIVERY ADDRESS BAR + CART ITEMS (FLIPKART STYLE) ── */}
                    <div className="lg:col-span-8 space-y-4">

                        {/* Flipkart-Style Deliver To Card */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">📍</span>
                                <div>
                                    <div className="text-xs text-[var(--foreground-muted)] font-medium">
                                        Deliver to: <strong className="text-[var(--foreground)]">{user?.firstname || 'Valued Customer'}, {pincode}</strong>
                                    </div>
                                    <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                                        Express Delivery available for items in your cart
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleOpenCheckout}
                                className="px-3.5 py-1.5 rounded-xl border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs font-bold transition-colors whitespace-nowrap self-start sm:self-center"
                            >
                                Change
                            </button>
                        </div>

                        {/* Cart Item Cards */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border-subtle)] overflow-hidden shadow-sm">
                            {cart.map((item) => {
                                const originalItemPrice = Math.round(item.price * 1.25);
                                const discountPct = Math.round(((originalItemPrice - item.price) / originalItemPrice) * 100);
                                const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
                                const imgUrl = item.image
                                    ? (item.image.startsWith('http') ? item.image : `${backendBase}${item.image}`)
                                    : null;

                                return (
                                    <div key={item._id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start">
                                        {/* Product Thumbnail */}
                                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                                            {imgUrl ? (
                                                <img src={imgUrl} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-3xl">📦</span>
                                            )}
                                        </div>

                                        {/* Product Details */}
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">{item.category}</span>
                                                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">Assured ✦</span>
                                            </div>

                                            <Link href={`/shop/${item._id}`} className="block">
                                                <h3 className="text-sm sm:text-base font-bold text-[var(--foreground)] hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                                                    {item.name}
                                                </h3>
                                            </Link>

                                            <div className="text-xs text-[var(--foreground-muted)]">
                                                Seller: <span className="font-semibold text-[var(--foreground-secondary)]">TechVault Retail</span>
                                            </div>

                                            {/* Price Line (Flipkart Style) */}
                                            <div className="flex items-baseline gap-2.5 pt-1">
                                                <span className="text-lg font-black text-[var(--foreground)]">
                                                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                                                </span>
                                                <span className="text-xs text-[var(--foreground-muted)] line-through">
                                                    ₹{(originalItemPrice * item.quantity).toLocaleString('en-IN')}
                                                </span>
                                                <span className="text-xs font-bold text-emerald-500">
                                                    {discountPct}% off
                                                </span>
                                            </div>

                                            <div className="text-[11px] text-emerald-400 font-medium">
                                                ⚡ Free Delivery by Tomorrow
                                            </div>

                                            {/* Actions: Stepper + Save for Later + Remove */}
                                            <div className="flex flex-wrap items-center gap-4 pt-3">
                                                {/* Quantity Stepper */}
                                                <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--surface-elevated)]">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQty(item._id, -1)}
                                                        disabled={item.quantity <= 1}
                                                        className="w-8 h-8 flex items-center justify-center text-sm font-bold text-[var(--foreground)] hover:bg-[var(--surface)] disabled:opacity-40 transition-colors"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-10 text-center text-xs font-bold text-[var(--foreground)] font-mono">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQty(item._id, 1)}
                                                        disabled={item.quantity >= item.stock}
                                                        className="w-8 h-8 flex items-center justify-center text-sm font-bold text-[var(--foreground)] hover:bg-[var(--surface)] disabled:opacity-40 transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => saveForLater(item._id)}
                                                    className="text-xs font-bold text-[var(--foreground-secondary)] hover:text-blue-400 uppercase tracking-wider transition-colors"
                                                >
                                                    Save for Later
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item._id)}
                                                    className="text-xs font-bold text-red-400 hover:text-red-300 uppercase tracking-wider transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Place Order CTA Bottom Bar inside Cart List (Flipkart Style) */}
                            <div className="p-4 bg-[var(--surface-elevated)] flex items-center justify-between gap-4">
                                <div className="text-xs text-[var(--foreground-muted)] hidden sm:block">
                                    Safe and Secure Payments · 100% Authentic Products
                                </div>
                                <button
                                    type="button"
                                    onClick={handleOpenCheckout}
                                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-black text-sm uppercase tracking-wider transition-all shadow-md shadow-orange-600/25 ml-auto"
                                >
                                    Place Order
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN: FLIPKART-STYLE PRICE DETAILS CARD ── */}
                    <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-wider text-[var(--foreground-muted)] border-b border-[var(--border-subtle)] pb-3">
                                Price Details
                            </h2>

                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between text-[var(--foreground)]">
                                    <span>Price ({totalItems} items)</span>
                                    <span className="font-mono font-medium">₹{originalSubtotal.toLocaleString('en-IN')}</span>
                                </div>

                                <div className="flex items-center justify-between text-emerald-500">
                                    <span>Discount</span>
                                    <span className="font-mono font-bold">-₹{discountAmount.toLocaleString('en-IN')}</span>
                                </div>

                                <div className="flex items-center justify-between text-[var(--foreground)]">
                                    <span>Delivery Charges</span>
                                    <span className="text-emerald-500 font-bold flex items-center gap-1.5">
                                        <span className="line-through text-[var(--foreground-muted)] font-mono font-normal">₹40</span>
                                        <span>FREE</span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-[var(--foreground)]">
                                    <span>Secured Packaging Fee</span>
                                    <span className="text-emerald-500 font-bold">FREE</span>
                                </div>

                                <div className="border-t border-[var(--border-subtle)] pt-3 flex items-baseline justify-between text-sm font-black text-[var(--foreground)]">
                                    <span>Total Amount</span>
                                    <span className="text-xl font-mono text-blue-400">₹{totalAmount.toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            {/* Savings Callout Banner */}
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 text-center">
                                You will save ₹{discountAmount.toLocaleString('en-IN')} on this order
                            </div>
                        </div>

                        {/* Flipkart Trust Badge Strip */}
                        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center gap-3 text-xs text-[var(--foreground-secondary)]">
                            <span className="text-2xl">🛡️</span>
                            <div className="leading-snug">
                                <strong className="text-[var(--foreground)]">100% Safe Payments</strong>
                                <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                                    All transactions are secured with 256-bit encryption &amp; escrow guarantee.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── FLIPKART-STYLE MULTI-STEP CHECKOUT MODAL ── */}
            {checkoutModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-up">
                    <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">

                        {/* Header & Steps Indicator */}
                        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-[var(--foreground)]">
                                    Instant Checkout
                                </h3>
                                <div className="flex items-center gap-2 text-xs font-semibold mt-1">
                                    <span className={checkoutStep === 1 ? 'text-blue-400 font-bold' : 'text-[var(--foreground-muted)]'}>1. Address</span>
                                    <span className="text-[var(--foreground-muted)]">→</span>
                                    <span className={checkoutStep === 2 ? 'text-blue-400 font-bold' : 'text-[var(--foreground-muted)]'}>2. Summary</span>
                                    <span className="text-[var(--foreground-muted)]">→</span>
                                    <span className={checkoutStep === 3 ? 'text-blue-400 font-bold' : 'text-[var(--foreground-muted)]'}>3. Payment</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCheckoutModalOpen(false)}
                                className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] text-xl"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Step 1: Address Selection or Entry */}
                        {checkoutStep === 1 && (
                            <div className="space-y-4">
                                <div className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                                    Select Delivery Address
                                </div>

                                {addresses.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {addresses.map((addr, idx) => (
                                            <label
                                                key={addr.id || addr._id || idx}
                                                className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${selectedAddressIndex === idx ? 'border-blue-500 bg-blue-600/10' : 'border-[var(--border)] hover:bg-[var(--surface-elevated)]'}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="address-select"
                                                    checked={selectedAddressIndex === idx}
                                                    onChange={() => setSelectedAddressIndex(idx)}
                                                    className="mt-0.5 accent-blue-600"
                                                />
                                                <div>
                                                    <div className="font-bold text-[var(--foreground)]">{addr.fullName} · {addr.phone}</div>
                                                    <div className="text-[var(--foreground-muted)] mt-0.5">{addr.line1}, {addr.city}, {addr.state} - {addr.postalCode}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-[var(--foreground-secondary)] mb-1">Recipient Name</label>
                                            <input
                                                type="text"
                                                value={addressForm.fullName}
                                                onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                                                placeholder="Full Name"
                                                className="w-full h-10 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] outline-none"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-semibold text-[var(--foreground-secondary)] mb-1">Phone Number</label>
                                                <input
                                                    type="text"
                                                    value={addressForm.phone}
                                                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                                                    placeholder="10-digit mobile"
                                                    className="w-full h-10 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-[var(--foreground-secondary)] mb-1">Postal Pincode</label>
                                                <input
                                                    type="text"
                                                    value={addressForm.postalCode}
                                                    onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                                                    placeholder="Pincode"
                                                    className="w-full h-10 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[var(--foreground-secondary)] mb-1">Address Line</label>
                                            <input
                                                type="text"
                                                value={addressForm.line1}
                                                onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })}
                                                placeholder="Flat, House no., Building, Street"
                                                className="w-full h-10 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setCheckoutStep(2)}
                                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md"
                                >
                                    Deliver Here &amp; Continue →
                                </button>
                            </div>
                        )}

                        {/* Step 2: Order Summary Review */}
                        {checkoutStep === 2 && (
                            <div className="space-y-4">
                                <div className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                                    Review Order Items ({totalItems})
                                </div>
                                <div className="max-h-48 overflow-y-auto divide-y divide-[var(--border-subtle)] pr-1">
                                    {cart.map((item) => (
                                        <div key={item._id} className="py-2 flex items-center justify-between text-xs">
                                            <div className="truncate max-w-[240px]">
                                                <div className="font-semibold text-[var(--foreground)] truncate">{item.name}</div>
                                                <div className="text-[11px] text-[var(--foreground-muted)]">Qty: {item.quantity}</div>
                                            </div>
                                            <div className="font-mono font-bold text-[var(--foreground)]">
                                                ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-[var(--border-subtle)] pt-3 flex items-center justify-between text-sm font-bold">
                                    <span>Total Amount Payable:</span>
                                    <span className="text-blue-400 font-mono text-base">₹{totalAmount.toLocaleString('en-IN')}</span>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCheckoutStep(1)}
                                        className="flex-1 py-3 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCheckoutStep(3)}
                                        className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-md"
                                    >
                                        Continue to Payment →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Payment Method Selection */}
                        {checkoutStep === 3 && (
                            <div className="space-y-4">
                                <div className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                                    Select Payment Method
                                </div>
                                <div className="space-y-2">
                                    <label
                                        className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs cursor-pointer transition-colors ${paymentMethod === 'RAZORPAY' ? 'border-blue-500 bg-blue-600/10' : 'border-[var(--border)] hover:bg-[var(--surface-elevated)]'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="payment-method"
                                            checked={paymentMethod === 'RAZORPAY'}
                                            onChange={() => setPaymentMethod('RAZORPAY')}
                                            className="mt-0.5 accent-blue-600"
                                        />
                                        <div>
                                            <div className="font-bold text-[var(--foreground)] flex items-center gap-2">
                                                <span>Razorpay Secure Gateway</span>
                                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Fast &amp; Protected</span>
                                            </div>
                                            <div className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                                                UPI (GPay, PhonePe, Paytm), Credit / Debit Cards, NetBanking with Escrow Safety.
                                            </div>
                                        </div>
                                    </label>

                                    <label
                                        className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs cursor-pointer transition-colors ${paymentMethod === 'COD' ? 'border-blue-500 bg-blue-600/10' : 'border-[var(--border)] hover:bg-[var(--surface-elevated)]'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="payment-method"
                                            checked={paymentMethod === 'COD'}
                                            onChange={() => setPaymentMethod('COD')}
                                            className="mt-0.5 accent-blue-600"
                                        />
                                        <div>
                                            <div className="font-bold text-[var(--foreground)]">Cash on Delivery (COD)</div>
                                            <div className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                                                Pay cash or UPI at your doorstep upon courier arrival.
                                            </div>
                                        </div>
                                    </label>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setCheckoutStep(2)}
                                        className="flex-1 py-3 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleFinalOrder}
                                        disabled={checkingOut}
                                        className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-orange-600/25 disabled:opacity-50"
                                    >
                                        {checkingOut ? 'Confirming Order...' : `Pay ₹${totalAmount.toLocaleString('en-IN')}`}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
