'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface OrderItem {
    id: string;
    productName: string;
    quantity: number;
    unitPricePaise: number;
    subtotalPaise: number;
}

interface Order {
    id: string;
    status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
    paymentMethod: string;
    totalPaise: number;
    createdAt: string;
    items: OrderItem[];
    address?: {
        fullName: string;
        line1: string;
        city: string;
        state: string;
        postalCode: string;
    };
}

interface Address {
    id: string;
    label: string;
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    isDefault: boolean;
}

export default function CustomerDashboardPage() {
    const { user, authStatus, isLoggedIn } = useAuth();
    const router = useRouter();

    const [tab, setTab] = useState<'orders' | 'addresses' | 'profile'>('orders');
    const [orders, setOrders] = useState<Order[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Profile form
    const [profileForm, setProfileForm] = useState({
        firstName: '',
        lastName: '',
        phone: '',
    });
    const [savingProfile, setSavingProfile] = useState(false);

    // New address form
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [newAddr, setNewAddr] = useState({
        label: 'Home',
        fullName: '',
        phone: '',
        line1: '',
        city: '',
        state: '',
        postalCode: '',
        isDefault: false,
    });
    const [savingAddr, setSavingAddr] = useState(false);

    useEffect(() => {
        if (authStatus === 'loading') return;
        if (authStatus === 'unauthenticated' || !isLoggedIn) {
            router.replace('/login?redirect=/dashboard/customer');
        }
    }, [authStatus, isLoggedIn, router]);

    const loadData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [ordersRes, addrRes] = await Promise.all([
                api.get('/orders'),
                api.get('/users/me/addresses'),
            ]);
            setOrders(ordersRes.data.orders || []);
            setAddresses(addrRes.data.addresses || []);
            if (user) {
                const u = user as unknown as Record<string, unknown>;
                setProfileForm({
                    firstName: user.firstname || '',
                    lastName: user.lastname || '',
                    phone: (u?.phone as string) || '',
                });
            }
        } catch {
            toast.error('Failed to load your account data');
        } finally {
            setLoadingData(false);
        }
    }, [user]);

    useEffect(() => {
        if (isLoggedIn) {
            void loadData();
        }
    }, [isLoggedIn, loadData]);

    const handleCancelOrder = async (orderId: string) => {
        if (!confirm('Are you sure you want to cancel this order? Stock will be restored.')) return;
        try {
            await api.post(`/orders/${orderId}/cancel`);
            toast.success('Order cancelled and inventory restored');
            loadData();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Could not cancel order');
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            await api.patch('/users/me', profileForm);
            toast.success('Profile updated successfully');
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Update failed');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleAddAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingAddr(true);
        try {
            await api.post('/users/me/addresses', newAddr);
            toast.success('Address saved successfully');
            setShowAddressModal(false);
            setNewAddr({
                label: 'Home',
                fullName: '',
                phone: '',
                line1: '',
                city: '',
                state: '',
                postalCode: '',
                isDefault: false,
            });
            loadData();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Failed to save address');
        } finally {
            setSavingAddr(false);
        }
    };

    const handleDeleteAddress = async (id: string) => {
        if (!confirm('Delete this delivery address?')) return;
        try {
            await api.delete(`/users/me/addresses/${id}`);
            toast.success('Address removed');
            loadData();
        } catch {
            toast.error('Failed to delete address');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'CONFIRMED':
                return <span className="badge badge--success">Confirmed</span>;
            case 'PROCESSING':
            case 'SHIPPED':
            case 'OUT_FOR_DELIVERY':
                return <span className="badge badge--primary">{status.replace(/_/g, ' ')}</span>;
            case 'DELIVERED':
                return <span className="badge badge--success">Delivered</span>;
            case 'CANCELLED':
                return <span className="badge badge--danger">Cancelled</span>;
            default:
                return <span className="badge badge--warning">{status.replace(/_/g, ' ')}</span>;
        }
    };

    if (authStatus === 'loading' || loadingData || !isLoggedIn) {
        return (
            <div className="min-h-[calc(100vh-var(--navbar-h))] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-mono text-[var(--foreground-muted)]">Loading customer portal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-10 md:py-16 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
                <div>
                    <h1 className="heading-1 text-[var(--foreground)]">Customer Workspace</h1>
                    <p className="body-sm text-[var(--foreground-muted)]">
                        Welcome back, <strong className="text-[var(--foreground)]">{user?.firstname}</strong>. Manage your orders, saved addresses, and profile securely.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Link href="/shop" className="btn btn--secondary btn--sm">
                        🛍 Browse Catalog
                    </Link>
                    <Link href="/cart" className="btn btn--primary btn--sm">
                        🛒 View Bag
                    </Link>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setTab('orders')}
                    className={`btn btn--sm ${tab === 'orders' ? 'btn--primary' : 'btn--ghost'}`}
                >
                    📦 My Orders ({orders.length})
                </button>
                <button
                    type="button"
                    onClick={() => setTab('addresses')}
                    className={`btn btn--sm ${tab === 'addresses' ? 'btn--primary' : 'btn--ghost'}`}
                >
                    📍 Delivery Addresses ({addresses.length})
                </button>
                <button
                    type="button"
                    onClick={() => setTab('profile')}
                    className={`btn btn--sm ${tab === 'profile' ? 'btn--primary' : 'btn--ghost'}`}
                >
                    👤 Account Profile
                </button>
            </div>

            {/* Tab: Orders */}
            {tab === 'orders' && (
                <div className="space-y-6">
                    {orders.length === 0 ? (
                        <div className="p-12 text-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] space-y-4">
                            <div className="text-4xl">🛍️</div>
                            <h2 className="heading-2 text-[var(--foreground)]">No orders placed yet</h2>
                            <p className="body-sm text-[var(--foreground-muted)] max-w-md mx-auto">
                                Explore our curated selection of verified goods. All transactions are escrow-backed with real-time tracking.
                            </p>
                            <Link href="/shop" className="btn btn--primary">
                                Start Shopping
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {orders.map((order) => {
                                const total = order.totalPaise ? order.totalPaise / 100 : 0;
                                const isCancellable = order.status === 'PENDING_PAYMENT' || order.status === 'CONFIRMED';

                                return (
                                    <div
                                        key={order.id}
                                        className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4 shadow-sm"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-sm text-[var(--foreground)]">
                                                        #{order.id.slice(-8).toUpperCase()}
                                                    </span>
                                                    {getStatusBadge(order.status)}
                                                </div>
                                                <div className="text-xs text-[var(--foreground-muted)] mt-1">
                                                    Ordered on {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-[var(--foreground)]">
                                                    ₹{total.toLocaleString('en-IN')}
                                                </div>
                                                <div className="text-xs text-[var(--foreground-muted)] uppercase font-mono">
                                                    {order.paymentMethod}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Order Items */}
                                        <div className="divide-y divide-[var(--border-subtle)]">
                                            {order.items.map((item) => (
                                                <div key={item.id} className="py-2.5 flex items-center justify-between text-sm">
                                                    <div>
                                                        <span className="font-medium text-[var(--foreground)]">{item.productName}</span>
                                                        <span className="text-xs text-[var(--foreground-muted)] ml-2">× {item.quantity}</span>
                                                    </div>
                                                    <div className="font-mono text-xs text-[var(--foreground)]">
                                                        ₹{(item.subtotalPaise / 100).toLocaleString('en-IN')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                                            <div className="text-xs text-[var(--foreground-muted)]">
                                                {order.address && `Delivering to: ${order.address.fullName}, ${order.address.city}`}
                                            </div>
                                            {isCancellable && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCancelOrder(order.id)}
                                                    className="btn btn--outline btn--sm text-red-500 hover:bg-red-500/10 border-red-500/30"
                                                >
                                                    Cancel Order
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Addresses */}
            {tab === 'addresses' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="heading-2 text-[var(--foreground)]">Saved Delivery Locations</h2>
                        <button
                            type="button"
                            onClick={() => setShowAddressModal(true)}
                            className="btn btn--primary btn--sm"
                        >
                            + Add New Address
                        </button>
                    </div>

                    {addresses.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)]">
                            <p className="text-sm text-[var(--foreground-muted)]">No delivery addresses saved yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {addresses.map((addr) => (
                                <div
                                    key={addr.id}
                                    className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-2 relative"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-sm text-[var(--foreground)]">{addr.label}</span>
                                        {addr.isDefault && <span className="badge badge--primary">Default</span>}
                                    </div>
                                    <div className="text-sm font-medium text-[var(--foreground)]">{addr.fullName}</div>
                                    <div className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                                        {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                                        {addr.city}, {addr.state} - {addr.postalCode}
                                    </div>
                                    <div className="text-xs font-mono text-[var(--foreground-muted)] pt-1">
                                        📞 {addr.phone}
                                    </div>
                                    <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteAddress(addr.id)}
                                            className="text-xs text-red-500 hover:underline"
                                        >
                                            Delete Address
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Profile */}
            {tab === 'profile' && (
                <div className="max-w-xl p-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-6 shadow-sm">
                    <div>
                        <h2 className="heading-2 text-[var(--foreground)]">Profile Information</h2>
                        <p className="body-sm text-[var(--foreground-muted)]">Update your personal contact information.</p>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div className="field">
                            <label className="field__label">Email address (Verified)</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="input opacity-70 cursor-not-allowed bg-[var(--surface-sunken)]"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="field">
                                <label className="field__label">First Name</label>
                                <input
                                    type="text"
                                    value={profileForm.firstName}
                                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                            <div className="field">
                                <label className="field__label">Last Name</label>
                                <input
                                    type="text"
                                    value={profileForm.lastName}
                                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                                    className="input"
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label className="field__label">Phone Number</label>
                            <input
                                type="tel"
                                value={profileForm.phone}
                                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                placeholder="+91 9876543210"
                                className="input"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={savingProfile}
                            className="btn btn--primary"
                        >
                            {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                        </button>
                    </form>

                    {/* Seller Account Status */}
                    <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono uppercase tracking-wider text-[var(--foreground-muted)]">Account Status</span>
                            <span className="badge badge-secondary">
                                {user?.role ? user.role.toUpperCase() : 'CUSTOMER'}
                            </span>
                        </div>
                        <h3 className="text-sm font-bold text-[var(--foreground)]">Selling on ShopVault</h3>
                        <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                            {(user?.role === 'vendor' || user?.role === 'admin') ? (
                                <>You have Vendor storefront access. You can manage your products, sales, and orders directly from your <Link href="/dashboard/vendor" className="text-cyan-400 font-semibold underline">Vendor Workspace</Link>.</>
                            ) : (
                                <>All accounts register as customers. Storefront vendor privileges are reviewed and granted directly by platform administrators. Once promoted, you can launch a store from the Vendor Workspace.</>
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* Add Address Modal */}
            {showAddressModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl animate-fade-up">
                        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                            <h3 className="text-base font-semibold text-[var(--foreground)]">New Delivery Address</h3>
                            <button
                                type="button"
                                onClick={() => setShowAddressModal(false)}
                                className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleAddAddress} className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <label className="field__label">Address Label</label>
                                    <input
                                        type="text"
                                        value={newAddr.label}
                                        onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
                                        placeholder="Home / Office"
                                        required
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="field__label">Recipient Name</label>
                                    <input
                                        type="text"
                                        value={newAddr.fullName}
                                        onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })}
                                        placeholder="Full Name"
                                        required
                                        className="input"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="field__label">Phone Number</label>
                                <input
                                    type="tel"
                                    value={newAddr.phone}
                                    onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                                    placeholder="10-digit mobile number"
                                    required
                                    className="input"
                                />
                            </div>

                            <div>
                                <label className="field__label">Street Address</label>
                                <input
                                    type="text"
                                    value={newAddr.line1}
                                    onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })}
                                    placeholder="Flat / House no, Apartment, Street"
                                    required
                                    className="input"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                    <label className="field__label">City</label>
                                    <input
                                        type="text"
                                        value={newAddr.city}
                                        onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                                        required
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="field__label">State</label>
                                    <input
                                        type="text"
                                        value={newAddr.state}
                                        onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                                        required
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="field__label">PIN Code</label>
                                    <input
                                        type="text"
                                        value={newAddr.postalCode}
                                        onChange={(e) => setNewAddr({ ...newAddr, postalCode: e.target.value })}
                                        required
                                        className="input"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="defaultAddr"
                                    checked={newAddr.isDefault}
                                    onChange={(e) => setNewAddr({ ...newAddr, isDefault: e.target.checked })}
                                    className="rounded border-[var(--border)]"
                                />
                                <label htmlFor="defaultAddr" className="text-xs text-[var(--foreground-muted)]">
                                    Set as default shipping address
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                                <button
                                    type="button"
                                    onClick={() => setShowAddressModal(false)}
                                    className="btn btn--ghost btn--sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingAddr}
                                    className="btn btn--primary btn--sm"
                                >
                                    {savingAddr ? 'Saving...' : 'Add Address'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
