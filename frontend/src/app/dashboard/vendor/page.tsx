'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { shopService, Shop, ShopRequest } from '@/lib/shops';
import { productService, Product } from '@/lib/products';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'products' | 'orders' | 'shop';

export default function VendorDashboardPage() {
    const { user } = useAuth();
    const [tab, setTab] = useState<Tab>('overview');
    const [shop, setShop] = useState<Shop | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [activeRequest, setActiveRequest] = useState<ShopRequest | null>(null);
    const [allRequests, setAllRequests] = useState<ShopRequest[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [submittingDeleteReq, setSubmittingDeleteReq] = useState(false);

    // Opening Request Form State
    const [openForm, setOpenForm] = useState({
        name: '',
        category: 'Electronics',
        description: '',
        phone: '',
        email: user?.email || '',
        address: '',
        logoUrl: '',
    });
    const [submittingOpenReq, setSubmittingOpenReq] = useState(false);

    const loadWorkspace = async () => {
        setLoading(true);
        try {
            const data = await shopService.getMyShop();
            setShop(data?.shop || null);
            setProducts(data?.products || []);
            setOrders(data?.recentOrders || []);
            setActiveRequest(data?.activeRequest || null);
            setAllRequests(data?.requests || []);
        } catch (err: unknown) {
            const e = err as { response?: { status?: number } };
            if (e?.response?.status === 404) {
                setShop(null);
                setProducts([]);
                setOrders([]);
            } else {
                console.error('Failed to load vendor workspace', err);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWorkspace();
    }, []);

    // Submit Shop Opening Request
    const handleOpenShopSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!openForm.name.trim()) {
            toast.error('Store name is required');
            return;
        }
        setSubmittingOpenReq(true);
        try {
            await shopService.requestOpenShop(openForm);
            toast.success('Shop opening request submitted! Awaiting admin review.');
            await loadWorkspace();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to submit request');
        } finally {
            setSubmittingOpenReq(false);
        }
    };

    // Submit Shop Deletion Request
    const handleDeleteShopSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deleteReason.trim() || deleteReason.trim().length < 5) {
            toast.error('Please provide a reason (minimum 5 characters)');
            return;
        }
        if (!shop?._id && !shop?.id) return;
        setSubmittingDeleteReq(true);
        try {
            await shopService.requestDeleteShop({
                shopId: shop.id || shop._id,
                reason: deleteReason,
            });
            toast.success('Shop deletion request submitted to admin.');
            setShowDeleteModal(false);
            setDeleteReason('');
            await loadWorkspace();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to submit deletion request');
        } finally {
            setSubmittingDeleteReq(false);
        }
    };

    // Cancel pending request
    const handleCancelRequest = async (requestId: string) => {
        if (!confirm('Are you sure you want to cancel this pending request?')) return;
        try {
            await shopService.cancelShopRequest(requestId);
            toast.success('Request cancelled successfully');
            await loadWorkspace();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to cancel request');
        }
    };

    // Product Delete
    const handleDeleteProduct = async (productId: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await productService.delete(productId);
            toast.success('Product removed');
            await loadWorkspace();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to delete product');
        }
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-var(--navbar-h))] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-10 h-10 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-[var(--foreground-muted)] font-mono">Loading your storefront...</p>
                </div>
            </div>
        );
    }

    const isLive = shop && shop.status === 'approved';
    const pendingOpenReq = activeRequest?.type === 'OPEN_SHOP';
    const pendingDeleteReq = activeRequest?.type === 'DELETE_SHOP';
    const lastRejectedReq = allRequests.find(r => r.status === 'REJECTED');

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar" style={{ background: 'rgba(6,182,212,.02)', borderRightColor: 'rgba(6,182,212,.15)' }}>
                <div className="sidebar-header">
                    <div className="sidebar-brand text-gradient-cyan">
                        🏪 {shop?.name || 'Vendor Hub'}
                    </div>
                    <div className="sidebar-user">{user?.firstname} {user?.lastname}</div>
                    <span className={`badge mt-2 ${isLive ? 'badge-success' : 'badge-warning'}`}>
                        {isLive ? 'ACTIVE STORE' : pendingOpenReq ? 'PENDING APPROVAL' : 'SETUP REQUIRED'}
                    </span>
                </div>

                {isLive ? (
                    <>
                        <div className="sidebar-section">Management</div>
                        {[
                            { id: 'overview', icon: '📊', label: 'Overview' },
                            { id: 'products', icon: '📦', label: 'Products', badge: products.length },
                            { id: 'orders', icon: '🛒', label: 'Orders', badge: orders.length },
                            { id: 'shop', icon: '⚙️', label: 'Store Settings' },
                        ].map(item => (
                            <button
                                key={item.id}
                                className={`sidebar-item${tab === item.id ? ' active manager-tab' : ''}`}
                                onClick={() => setTab(item.id as Tab)}
                            >
                                <span className="sidebar-icon">{item.icon}</span>
                                <span style={{ flex: 1 }}>{item.label}</span>
                                {item.badge !== undefined && item.badge > 0 && (
                                    <span className="sidebar-badge">{item.badge}</span>
                                )}
                            </button>
                        ))}
                    </>
                ) : (
                    <div className="p-3">
                        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)] mb-2">
                            Storefront Status
                        </div>
                        <div className="text-sm text-[var(--foreground-secondary)]">
                            {pendingOpenReq ? '⏳ Awaiting Admin Approval' : '📝 Application Required'}
                        </div>
                    </div>
                )}

                <div className="sidebar-section" style={{ marginTop: 'auto' }}>Quick Links</div>
                <Link href="/shop" className="sidebar-item">
                    <span className="sidebar-icon">🛍️</span> Visit Marketplace
                </Link>
                <Link href="/dashboard/customer" className="sidebar-item">
                    <span className="sidebar-icon">📦</span> My Customer Orders
                </Link>
            </aside>

            {/* Main Content */}
            <main className="dashboard-main">
                {/* STATE 1: SHOP NOT APPROVED (Pending or Need Application) */}
                {!isLive && (
                    <div className="max-w-2xl mx-auto py-6 px-4">
                        {pendingOpenReq ? (
                            /* Pending Opening Request Card */
                            <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl p-8 text-center backdrop-blur-xl">
                                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-3xl mx-auto flex items-center justify-center mb-4">
                                    ⏳
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
                                    <span>Awaiting Admin Approval</span>
                                </div>
                                <h2 className="text-2xl font-bold text-zinc-100 mb-2">Store Opening Request Under Review</h2>
                                <p className="text-sm text-zinc-400 leading-relaxed mb-6 max-w-md mx-auto">
                                    Your request to open <strong className="text-zinc-100">{activeRequest.shopName}</strong> has been submitted to platform administrators. You will be notified once reviewed.
                                </p>

                                <div className="rounded-xl bg-zinc-950/70 border border-zinc-800 p-4 text-left mb-6 space-y-2.5">
                                    <div className="flex justify-between items-center pb-2.5 border-b border-zinc-800">
                                        <span className="text-xs text-zinc-400 font-medium">Application Status</span>
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            PENDING ADMIN APPROVAL
                                        </span>
                                    </div>
                                    <div className="text-xs space-y-2 text-zinc-300">
                                        <div><span className="text-zinc-500 font-medium">Store Name:</span> <span className="text-zinc-100 font-semibold">{activeRequest.shopName}</span></div>
                                        <div><span className="text-zinc-500 font-medium">Category:</span> <span className="text-zinc-100">{activeRequest.category || 'General'}</span></div>
                                        {activeRequest.description && (
                                            <div><span className="text-zinc-500 font-medium">Bio:</span> <span className="text-zinc-300">{activeRequest.description}</span></div>
                                        )}
                                        <div className="text-zinc-500 pt-1 text-[11px]">
                                            Submitted: {new Date(activeRequest.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleCancelRequest(activeRequest.id)}
                                    className="px-4 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-700 transition-all"
                                >
                                    ✕ Cancel Opening Request
                                </button>
                            </div>
                        ) : (
                            /* Shop Opening Application Form */
                            <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl overflow-hidden backdrop-blur-xl">
                                {/* Top Accent Strip */}
                                <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />

                                <div className="p-6 sm:p-8">
                                    <div className="text-center mb-8">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-3xl mb-3 shadow-inner">
                                            🏪
                                        </div>
                                        <div>
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
                                                Seller Portal Onboarding
                                            </span>
                                        </div>
                                        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">Open Your Storefront</h1>
                                        <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
                                            Complete your merchant profile below. Once submitted, platform administrators will verify your details and approve your store to go live.
                                        </p>
                                    </div>

                                    {lastRejectedReq && (
                                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200">
                                            <div className="font-semibold text-sm flex items-center gap-1.5">
                                                <span>⚠️</span>
                                                <span>Previous Application Declined</span>
                                            </div>
                                            <div className="text-xs mt-1 text-red-300/90 leading-relaxed">
                                                {lastRejectedReq.adminNotes ? `Admin Note: ${lastRejectedReq.adminNotes}` : 'Your previous opening application was declined. You may adjust details and re-apply.'}
                                            </div>
                                        </div>
                                    )}

                                    <form onSubmit={handleOpenShopSubmit} className="space-y-5">
                                        {/* Store Name & Category */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="block text-xs font-semibold text-zinc-300">
                                                    Store Name <span className="text-red-400">*</span>
                                                </label>
                                                <input
                                                    className="w-full h-11 px-4 rounded-xl bg-zinc-950/70 border border-zinc-700/80 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                                                    value={openForm.name}
                                                    onChange={e => setOpenForm(f => ({ ...f, name: e.target.value }))}
                                                    placeholder="e.g. Apex Audio Labs"
                                                    required
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="block text-xs font-semibold text-zinc-300">
                                                    Primary Category <span className="text-red-400">*</span>
                                                </label>
                                                <select
                                                    className="w-full h-11 px-4 rounded-xl bg-zinc-950/70 border border-zinc-700/80 text-zinc-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-inner"
                                                    value={openForm.category}
                                                    onChange={e => setOpenForm(f => ({ ...f, category: e.target.value }))}
                                                    required
                                                >
                                                    {['Electronics', 'Clothing', 'Footwear', 'Home & Living', 'Gourmet Food', 'Health & Wellness', 'Books & Art', 'Sports & Outdoors', 'Other'].map(c => (
                                                        <option key={c} value={c} className="bg-zinc-900 text-zinc-100">{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Storefront Description */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="block text-xs font-semibold text-zinc-300">
                                                Description / Storefront Bio <span className="text-red-400">*</span>
                                            </label>
                                            <textarea
                                                rows={3}
                                                className="w-full min-h-[110px] p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-700/80 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-y shadow-inner leading-relaxed"
                                                value={openForm.description}
                                                onChange={e => setOpenForm(f => ({ ...f, description: e.target.value }))}
                                                placeholder="Tell customers what products you sell, your brand ethos, and quality standards..."
                                                required
                                            />
                                        </div>

                                        {/* Phone & Email */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="block text-xs font-semibold text-zinc-300">Business Phone</label>
                                                <input
                                                    className="w-full h-11 px-4 rounded-xl bg-zinc-950/70 border border-zinc-700/80 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                                                    value={openForm.phone}
                                                    onChange={e => setOpenForm(f => ({ ...f, phone: e.target.value }))}
                                                    placeholder="+91 98765 43210"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="block text-xs font-semibold text-zinc-300">Business Email</label>
                                                <input
                                                    type="email"
                                                    className="w-full h-11 px-4 rounded-xl bg-zinc-950/70 border border-zinc-700/80 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                                                    value={openForm.email}
                                                    onChange={e => setOpenForm(f => ({ ...f, email: e.target.value }))}
                                                    placeholder="store@example.com"
                                                />
                                            </div>
                                        </div>

                                        {/* Physical Address */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="block text-xs font-semibold text-zinc-300">Store Physical / Operating Address</label>
                                            <input
                                                className="w-full h-11 px-4 rounded-xl bg-zinc-950/70 border border-zinc-700/80 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                                                value={openForm.address}
                                                onChange={e => setOpenForm(f => ({ ...f, address: e.target.value }))}
                                                placeholder="123 Commerce Way, Bangalore, Karnataka"
                                            />
                                        </div>

                                        {/* Logo URL */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="block text-xs font-semibold text-zinc-300">Logo Image URL</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    className="w-full h-11 px-4 rounded-xl bg-zinc-950/70 border border-zinc-700/80 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                                                    value={openForm.logoUrl}
                                                    onChange={e => setOpenForm(f => ({ ...f, logoUrl: e.target.value }))}
                                                    placeholder="https://images.unsplash.com/..."
                                                />
                                                {openForm.logoUrl && (
                                                    <div className="w-11 h-11 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800 flex-shrink-0 flex items-center justify-center">
                                                        <img
                                                            src={openForm.logoUrl}
                                                            alt="Preview"
                                                            className="w-full h-full object-cover"
                                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Policy Banner */}
                                        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200/90 leading-relaxed flex items-start gap-2.5">
                                            <span className="text-base leading-none mt-0.5">ℹ️</span>
                                            <div>
                                                <strong className="text-blue-100 font-semibold">Approval Process:</strong> After clicking submit, an opening request is dispatched to the admin governance dashboard. Applications are typically reviewed within 24 hours and you will receive an on-platform notification once approved.
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            disabled={submittingOpenReq}
                                        >
                                            {submittingOpenReq ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <span>Submitting Request...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>🚀</span>
                                                    <span>Submit Shop Opening Request</span>
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STATE 2: APPROVED / LIVE STOREFRONT */}
                {isLive && (
                    <>
                        {/* Pending Deletion Warning Banner */}
                        {pendingDeleteReq && (
                            <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 mb-6 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="font-bold text-sm">⚠️ Store Deletion Request Pending Admin Approval</div>
                                    <div className="text-xs text-amber-200/80 mt-0.5">
                                        Reason stated: &ldquo;{activeRequest.reason}&rdquo; — Submitted on {new Date(activeRequest.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleCancelRequest(activeRequest.id)}
                                    className="btn btn--secondary btn--sm bg-amber-900/40 border-amber-600 text-amber-100 hover:bg-amber-800/60"
                                >
                                    Cancel Deletion Request
                                </button>
                            </div>
                        )}

                        {/* TAB: OVERVIEW */}
                        {tab === 'overview' && (
                            <div className="space-y-6">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <h1 className="heading-lg">{shop?.name}</h1>
                                        <p className="text-sm text-[var(--foreground-muted)]">Storefront performance and catalog overview</p>
                                    </div>
                                    <button
                                        onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                                        className="btn btn--primary"
                                    >
                                        ➕ Add New Product
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="card p-5 border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-transparent">
                                        <div className="text-xs font-mono uppercase text-cyan-400 font-bold mb-1">Total Revenue</div>
                                        <div className="text-2xl font-extrabold text-[var(--foreground)]">
                                            ₹{(shop.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                        <div className="text-xs text-[var(--foreground-muted)] mt-1">Direct storefront sales</div>
                                    </div>
                                    <div className="card p-5 border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-transparent">
                                        <div className="text-xs font-mono uppercase text-emerald-400 font-bold mb-1">Products Listed</div>
                                        <div className="text-2xl font-extrabold text-[var(--foreground)]">
                                            {products.length}
                                        </div>
                                        <div className="text-xs text-[var(--foreground-muted)] mt-1">Live in store catalog</div>
                                    </div>
                                    <div className="card p-5 border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-transparent">
                                        <div className="text-xs font-mono uppercase text-purple-400 font-bold mb-1">Total Orders</div>
                                        <div className="text-2xl font-extrabold text-[var(--foreground)]">
                                            {orders.length}
                                        </div>
                                        <div className="text-xs text-[var(--foreground-muted)] mt-1">Customer checkouts</div>
                                    </div>
                                </div>

                                {/* Recent Orders Preview */}
                                <div className="card p-6">
                                    <h2 className="heading-sm mb-4">Recent Customer Orders</h2>
                                    {orders.length === 0 ? (
                                        <div className="text-center py-8 text-[var(--foreground-muted)] text-sm">
                                            No orders placed yet. Products are live on the marketplace!
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="border-b border-[var(--border)] text-[var(--foreground-muted)] uppercase tracking-wider">
                                                        <th className="py-2.5 px-3">Order ID</th>
                                                        <th className="py-2.5 px-3">Customer</th>
                                                        <th className="py-2.5 px-3">Product</th>
                                                        <th className="py-2.5 px-3">Qty</th>
                                                        <th className="py-2.5 px-3">Amount</th>
                                                        <th className="py-2.5 px-3">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--border)]">
                                                    {orders.slice(0, 5).map(o => (
                                                        <tr key={o.id} className="hover:bg-[var(--surface-elevated)]">
                                                            <td className="py-3 px-3 font-mono text-cyan-400">{o.id.slice(0, 8)}...</td>
                                                            <td className="py-3 px-3 font-medium">{o.customerName}</td>
                                                            <td className="py-3 px-3">{o.productName}</td>
                                                            <td className="py-3 px-3">{o.quantity}</td>
                                                            <td className="py-3 px-3 font-bold text-[var(--foreground)]">₹{o.subtotal.toFixed(2)}</td>
                                                            <td className="py-3 px-3">
                                                                <span className="badge badge-success">{o.status}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB: PRODUCTS */}
                        {tab === 'products' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h1 className="heading-lg">Product Inventory</h1>
                                        <p className="text-sm text-[var(--foreground-muted)]">Manage pricing, stock counts, and descriptions</p>
                                    </div>
                                    <button
                                        onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                                        className="btn btn--primary"
                                    >
                                        ➕ Add Product
                                    </button>
                                </div>

                                {products.length === 0 ? (
                                    <div className="card p-12 text-center">
                                        <div className="text-4xl mb-3">📦</div>
                                        <h3 className="heading-sm mb-2">No products in your catalog yet</h3>
                                        <p className="text-sm text-[var(--foreground-muted)] mb-4">Add your first product to start selling to customers across ShopVault.</p>
                                        <button
                                            onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                                            className="btn btn--primary btn--sm"
                                        >
                                            Add First Product
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {products.map(p => (
                                            <div key={p.id || p._id} className="card p-4 flex flex-col justify-between border border-[var(--border)]">
                                                <div>
                                                    {p.image ? (
                                                        <div className="h-44 rounded-xl overflow-hidden mb-3 bg-[var(--background)]">
                                                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="h-44 rounded-xl mb-3 bg-[var(--surface-elevated)] flex items-center justify-center text-3xl">
                                                            📦
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-start gap-2 mb-1">
                                                        <h3 className="font-bold text-sm line-clamp-1 text-[var(--foreground)]">{p.name}</h3>
                                                        <span className="text-xs font-bold text-cyan-400 font-mono">₹{p.price?.toFixed(2)}</span>
                                                    </div>
                                                    <p className="text-xs text-[var(--foreground-muted)] line-clamp-2 mb-3">{p.description}</p>
                                                    <div className="flex items-center gap-2 text-xs text-[var(--foreground-secondary)]">
                                                        <span className="badge badge-secondary">{p.category}</span>
                                                        <span>Stock: <strong>{p.stock}</strong></span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--border)]">
                                                    <button
                                                        onClick={() => { setEditingProduct(p); setShowProductModal(true); }}
                                                        className="btn btn--secondary btn--sm flex-1"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProduct(p.id || p._id)}
                                                        className="btn btn--sm text-red-400 hover:bg-red-500/10 border border-red-500/20"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB: ORDERS */}
                        {tab === 'orders' && (
                            <div className="space-y-6">
                                <div>
                                    <h1 className="heading-lg">Store Orders</h1>
                                    <p className="text-sm text-[var(--foreground-muted)]">Live fulfillment tracking for all items purchased from your storefront</p>
                                </div>

                                <div className="card p-6">
                                    {orders.length === 0 ? (
                                        <div className="text-center py-12 text-[var(--foreground-muted)] text-sm">
                                            No customer orders received yet.
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="border-b border-[var(--border)] text-[var(--foreground-muted)] uppercase tracking-wider">
                                                        <th className="py-3 px-3">Order ID</th>
                                                        <th className="py-3 px-3">Customer</th>
                                                        <th className="py-3 px-3">Email</th>
                                                        <th className="py-3 px-3">Product Name</th>
                                                        <th className="py-3 px-3">Qty</th>
                                                        <th className="py-3 px-3">Subtotal</th>
                                                        <th className="py-3 px-3">Date</th>
                                                        <th className="py-3 px-3">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--border)]">
                                                    {orders.map(o => (
                                                        <tr key={o.id} className="hover:bg-[var(--surface-elevated)]">
                                                            <td className="py-3 px-3 font-mono text-cyan-400">{o.id.slice(0, 8)}...</td>
                                                            <td className="py-3 px-3 font-medium">{o.customerName}</td>
                                                            <td className="py-3 px-3 text-[var(--foreground-muted)]">{o.customerEmail}</td>
                                                            <td className="py-3 px-3 font-semibold">{o.productName}</td>
                                                            <td className="py-3 px-3">{o.quantity}</td>
                                                            <td className="py-3 px-3 font-bold text-[var(--foreground)]">₹{o.subtotal.toFixed(2)}</td>
                                                            <td className="py-3 px-3 text-[var(--foreground-muted)]">{new Date(o.createdAt).toLocaleDateString()}</td>
                                                            <td className="py-3 px-3">
                                                                <span className="badge badge-success">{o.status}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB: SHOP SETTINGS */}
                        {tab === 'shop' && (
                            <div className="space-y-8" style={{ maxWidth: '680px' }}>
                                <div>
                                    <h1 className="heading-lg">Store Settings</h1>
                                    <p className="text-sm text-[var(--foreground-muted)]">Manage your business profile and storefront settings</p>
                                </div>

                                <div className="card p-6">
                                    <h2 className="heading-sm mb-4">Storefront Details</h2>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between py-2 border-b border-[var(--border)]">
                                            <span className="text-[var(--foreground-muted)]">Store Name</span>
                                            <span className="font-semibold text-[var(--foreground)]">{shop.name}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-[var(--border)]">
                                            <span className="text-[var(--foreground-muted)]">Slug / URL</span>
                                            <span className="font-mono text-cyan-400">/shop/{shop.slug}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-[var(--border)]">
                                            <span className="text-[var(--foreground-muted)]">Category</span>
                                            <span className="font-medium">{shop.category || 'General'}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-[var(--border)]">
                                            <span className="text-[var(--foreground-muted)]">Storefront Status</span>
                                            <span className="badge badge-success">APPROVED & LIVE</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Danger Zone: Shop Deletion */}
                                <div className="card p-6 border border-red-500/30 bg-red-950/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xl">⚠️</span>
                                        <h2 className="text-base font-bold text-red-400">Danger Zone: Store Closure</h2>
                                    </div>
                                    <p className="text-xs text-[var(--foreground-muted)] leading-relaxed mb-4">
                                        Per marketplace security policy, vendors cannot immediately erase an active store with existing products. You must submit a formal <strong>Shop Deletion Request</strong> with a business justification to platform administrators.
                                    </p>

                                    {pendingDeleteReq ? (
                                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                                            ⏳ <strong>Deletion Request Already Pending:</strong> Your request to close this store is awaiting review by platform administrators.
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowDeleteModal(true)}
                                            className="btn btn--danger text-xs font-semibold py-2 px-4"
                                        >
                                            Request Shop Deletion
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* PRODUCT MODAL (Add / Edit) */}
            {showProductModal && (
                <ProductModal
                    product={editingProduct}
                    onClose={() => setShowProductModal(false)}
                    onSave={() => { setShowProductModal(false); loadWorkspace(); }}
                />
            )}

            {/* DELETE REQUEST MODAL */}
            {showDeleteModal && (
                <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}>
                    <div className="modal max-w-md">
                        <div className="modal-header">
                            <h2 className="modal-title text-red-400">⚠️ Request Shop Deletion</h2>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleDeleteShopSubmit}>
                            <div className="modal-body space-y-4 text-xs">
                                <p className="text-[var(--foreground-secondary)] leading-relaxed">
                                    Submitting this request alerts platform administrators to archive your storefront <strong>{shop?.name}</strong>. Your products will be unpublished upon admin approval.
                                </p>
                                <div className="flex flex-col gap-1.5">
                                    <label className="block text-xs font-semibold text-zinc-300">
                                        Reason for store closure <span className="text-red-400">*</span>
                                    </label>
                                    <textarea
                                        className="w-full min-h-[90px] p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-700/80 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-y shadow-inner leading-relaxed"
                                        rows={3}
                                        value={deleteReason}
                                        onChange={e => setDeleteReason(e.target.value)}
                                        placeholder="e.g. Closing business operations, rebranding, etc."
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn--secondary btn--sm" onClick={() => setShowDeleteModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn--danger btn--sm"
                                    disabled={submittingDeleteReq}
                                >
                                    {submittingDeleteReq ? 'Submitting...' : 'Submit Deletion Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Product Add / Edit Modal Component
   ───────────────────────────────────────────────────────────── */
function ProductModal({ product, onClose, onSave }: { product: Product | null; onClose: () => void; onSave: () => void }) {
    const isEdit = !!product;
    const [form, setForm] = useState({
        name: product?.name || '',
        description: product?.description || '',
        price: product?.price ? String(product.price) : '',
        stock: product?.stock ? String(product.stock) : '10',
        category: product?.category || 'Electronics',
        image: product?.image || '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.description.trim() || !form.price) {
            toast.error('Please fill in required fields');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                name: form.name,
                description: form.description,
                price: Number(form.price),
                stock: Number(form.stock) || 0,
                category: form.category,
                imageUrl: form.image || undefined,
            };

            if (isEdit && (product?.id || product?._id)) {
                await productService.update(product.id || product._id, payload);
                toast.success('Product updated!');
            } else {
                await productService.create(payload);
                toast.success('Product created!');
            }
            onSave();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal max-w-lg">
                <div className="modal-header">
                    <h2 className="modal-title">{isEdit ? '✏️ Edit Product' : '➕ Add New Product'}</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="block text-xs font-semibold text-zinc-300">
                                Product Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                className="w-full h-11 px-4 rounded-xl bg-zinc-950/70 border border-zinc-700/80 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="e.g. Wireless Noise-Cancelling Headphones"
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="block text-xs font-semibold text-zinc-300">
                                Description <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                className="w-full min-h-[95px] p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-700/80 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-y shadow-inner leading-relaxed"
                                rows={3}
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Key specifications, materials, and highlights..."
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="block text-xs font-semibold text-zinc-300">
                                    Price (₹) <span className="text-red-400">*</span>
                                </label>
                                <input
                                    className="w-full h-11 px-4 rounded-xl bg-zinc-950/70 border border-zinc-700/80 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.price}
                                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                    placeholder="4999.00"
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="block text-xs font-semibold text-zinc-300">
                                    Stock Quantity <span className="text-red-400">*</span>
                                </label>
                                <input
                                    className="w-full h-11 px-4 rounded-xl bg-zinc-950/70 border border-zinc-700/80 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                                    type="number"
                                    min="0"
                                    value={form.stock}
                                    onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                                    placeholder="25"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="block text-xs font-semibold text-zinc-300">
                                Category <span className="text-red-400">*</span>
                            </label>
                            <select
                                className="w-full h-11 px-4 rounded-xl bg-zinc-950/70 border border-zinc-700/80 text-zinc-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-inner"
                                value={form.category}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                required
                            >
                                {['Electronics', 'Clothing', 'Footwear', 'Home & Living', 'Gourmet Food', 'Health & Wellness', 'Books & Art', 'Sports & Outdoors', 'Other'].map(c => (
                                    <option key={c} value={c} className="bg-zinc-900 text-zinc-100">{c}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="block text-xs font-semibold text-zinc-300">Image URL</label>
                            <div className="flex items-center gap-3">
                                <input
                                    className="w-full h-11 px-4 rounded-xl bg-zinc-950/70 border border-zinc-700/80 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                                    value={form.image}
                                    onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                                    placeholder="https://images.unsplash.com/..."
                                />
                                {form.image && (
                                    <div className="w-11 h-11 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800 flex-shrink-0 flex items-center justify-center">
                                        <img
                                            src={form.image}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn--primary btn--sm" disabled={loading}>
                            {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Add to Catalog'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
