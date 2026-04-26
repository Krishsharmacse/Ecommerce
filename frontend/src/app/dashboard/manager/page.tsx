'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { shopService } from '@/lib/shops';
import { productService, Product } from '@/lib/products';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'products' | 'orders' | 'shop';

export default function ManagerDashboardPage() {
    const { user, isApprovedManager } = useAuth();
    const [tab, setTab] = useState<Tab>('overview');
    const [shop, setShop] = useState<ReturnType<typeof shopService.getMyShop> extends Promise<infer T> ? T : never | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<unknown[]>([]);
    const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof shopService.getMySales>> | null>(null);
    const [loading, setLoading] = useState(true);
    const [showNewProduct, setShowNewProduct] = useState(false);
    const [editProd, setEditProd] = useState<Product | null>(null);

    const load = async () => {
        try {
            const data = await shopService.getMyShop();
            setShop(data.shop);
            setProducts(data.products || []);
            setOrders(data.recentOrders || []);
            if (data.shop?.status === 'approved') {
                const a = await shopService.getMySales(30);
                setAnalytics(a);
            }
        } catch {
            setShop(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (isApprovedManager) load(); else setLoading(false); }, [isApprovedManager]);

    const sidebarItems = [
        { id: 'overview', icon: '📊', label: 'Overview' },
        { id: 'products', icon: '📦', label: 'Products', badge: products.length },
        { id: 'orders', icon: '🛒', label: 'Orders', badge: orders.length },
        { id: 'shop', icon: '🏪', label: 'Shop Settings' },
    ];

    // Pending approval state
    if (!isApprovedManager && user?.role === 'manager') {
        return (
            <div className="dashboard-layout">
                <aside className="sidebar" style={{ background: 'rgba(6,182,212,.03)' }}>
                    <div className="sidebar-header">
                        <div className="sidebar-brand text-gradient-cyan">Manager Panel</div>
                        <div className="sidebar-user">{user?.firstname}</div>
                    </div>
                    <div className="sidebar-section">Status</div>
                    <div className="sidebar-item active manager-tab">⏳ Pending Approval</div>
                </aside>
                <main className="dashboard-main">
                    <div style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'floatSlow 4s ease-in-out infinite' }}>⏳</div>
                        <h2 className="heading-md" style={{ marginBottom: '1rem' }}>Awaiting Approval</h2>
                        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
                            Your manager account is pending review by the platform owner. You'll get access to your store dashboard once approved.
                        </p>
                        {!shop && (
                            <div className="card-glass" style={{ padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 700 }}>💡 While you wait...</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>Set up your shop profile so you can start selling the moment you're approved!</p>
                            </div>
                        )}
                        <CreateShopForm onSuccess={load} />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar" style={{ background: 'rgba(6,182,212,.02)', borderRightColor: 'rgba(6,182,212,.1)' }}>
                <div className="sidebar-header">
                    <div className="sidebar-brand text-gradient-cyan">
                        {shop ? shop.name : 'My Store'}
                    </div>
                    <div className="sidebar-user">{user?.firstname} · Manager</div>
                    {shop && (
                        <span className={`badge mt-2 ${shop.status === 'approved' ? 'badge-success' : shop.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                            {shop.status?.toUpperCase()}
                        </span>
                    )}
                </div>

                <div className="sidebar-section">Dashboard</div>
                {sidebarItems.map(item => (
                    <button key={item.id} className={`sidebar-item${tab === item.id ? ' active manager-tab' : ''}`} onClick={() => setTab(item.id as Tab)}>
                        <span className="sidebar-icon">{item.icon}</span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && <span className="sidebar-badge">{item.badge}</span>}
                    </button>
                ))}

                <div className="sidebar-section" style={{ marginTop: 'auto' }}>Links</div>
                <Link href="/shop" className="sidebar-item">
                    <span className="sidebar-icon">🛍</span>View Store
                </Link>
            </aside>

            {/* Main */}
            <main className="dashboard-main">
                {loading ? (
                    <div className="page-loader"><div className="spinner spinner-lg" style={{ borderTopColor: 'var(--cyan)' }} /></div>
                ) : tab === 'overview' ? (
                    <OverviewTab analytics={analytics} products={products} orders={orders} shop={shop} />
                ) : tab === 'products' ? (
                    <ProductsTab
                        products={products}
                        shop={shop}
                        onRefresh={load}
                        showNew={showNewProduct}
                        setShowNew={setShowNewProduct}
                        editProd={editProd}
                        setEditProd={setEditProd}
                    />
                ) : tab === 'orders' ? (
                    <OrdersTab orders={orders} />
                ) : (
                    <ShopSettingsTab shop={shop} onRefresh={load} onCreate={load} />
                )}
            </main>
        </div>
    );
}

/* ─── Overview Tab ─── */
function OverviewTab({ analytics, products, orders, shop }: { analytics: any | null; products: Product[]; orders: unknown[]; shop: unknown }) {
    const chartMax = analytics?.chartData?.length
        ? Math.max(...analytics.chartData.map((d: { revenue: number }) => d.revenue), 1)
        : 1;

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="heading-md">Store Overview</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '.25rem' }}>Last 30 days performance</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card cyan">
                    <div className="stat-icon cyan">💰</div>
                    <div className="stat-value text-gradient-cyan">₹{analytics?.totalRevenue?.toLocaleString('en-IN') ?? '0'}</div>
                    <div className="stat-label">Total Revenue</div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon success">📦</div>
                    <div className="stat-value">{products.length}</div>
                    <div className="stat-label">Products Listed</div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon warning">🛒</div>
                    <div className="stat-value">{analytics?.totalOrders ?? 0}</div>
                    <div className="stat-label">Total Orders</div>
                </div>
                <div className="stat-card primary">
                    <div className="stat-icon primary">⭐</div>
                    <div className="stat-value">{analytics?.topProducts?.length ?? 0}</div>
                    <div className="stat-label">Top Products</div>
                </div>
            </div>

            {/* Revenue Chart */}
            {analytics?.chartData && analytics.chartData.length > 0 && (
                <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ marginBottom: '1rem', fontWeight: 700, fontSize: '1rem' }}>📈 Revenue Chart (30 days)</div>
                    <div className="chart-bars">
                        {analytics.chartData.map((d: { date: string; revenue: number }, i: number) => (
                            <div key={i} title={`${d.date}: ₹${d.revenue}`} className="chart-bar"
                                style={{ height: `${Math.max(8, (d.revenue / chartMax) * 80)}px`, background: d.revenue > 0 ? 'var(--gradient-manager)' : 'var(--glass-border)' }} />
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: 'var(--text-muted)', marginTop: '.5rem' }}>
                        <span>{analytics.chartData[0]?.date}</span>
                        <span>{analytics.chartData[analytics.chartData.length - 1]?.date}</span>
                    </div>
                </div>
            )}

            {/* Top Products */}
            {analytics?.topProducts && analytics.topProducts.length > 0 && (
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem', fontWeight: 700 }}>🏆 Top Products</div>
                    {analytics.topProducts.map((p: { name: string; sold: number; revenue: number }, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '.75rem 0', borderBottom: i < analytics.topProducts.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                            <span style={{ fontSize: '1.2rem', width: '24px', textAlign: 'center' }}>{'🥇🥈🥉'[i] || '🏅'}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{p.name}</div>
                                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{p.sold} units sold</div>
                            </div>
                            <div className="text-gradient-cyan" style={{ fontWeight: 800, fontFamily: 'Outfit,sans-serif' }}>₹{p.revenue.toLocaleString('en-IN')}</div>
                        </div>
                    ))}
                </div>
            )}

            {!analytics && (
                <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <div style={{ fontWeight: 600 }}>No analytics yet</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>Start selling to see your performance data.</div>
                </div>
            )}
        </div>
    );
}

/* ─── Products Tab ─── */
function ProductsTab({ products, shop, onRefresh, showNew, setShowNew, editProd, setEditProd }: {
    products: Product[];
    shop: { _id?: string; status?: string } | null;
    onRefresh: () => void;
    showNew: boolean;
    setShowNew: (v: boolean) => void;
    editProd: Product | null;
    setEditProd: (p: Product | null) => void;
}) {
    const handleDelete = async (id: string) => {
        if (!confirm('Delete this product?')) return;
        try {
            await productService.delete(id);
            toast.success('Product deleted');
            onRefresh();
        } catch { toast.error('Delete failed'); }
    };

    const canAddProduct = shop?.status === 'approved';

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="heading-md">My Products</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '.25rem' }}>{products.length} products in your store</p>
                </div>
                <button className="btn btn-manager" onClick={() => setShowNew(true)} disabled={!canAddProduct}
                    title={!canAddProduct ? 'Your shop must be approved first' : ''}>
                    ➕ Add Product
                </button>
            </div>

            {!canAddProduct && (
                <div className="alert alert-warning mb-6">⚠ Your shop is <strong>{shop?.status || 'not set up'}</strong>. You can add products once the owner approves your shop.</div>
            )}

            {products.length > 0 ? (
                <div className="table-container">
                    <table>
                        <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
                        <tbody>
                            {products.map(p => (
                                <tr key={p._id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-elevated)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                {p.image ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>🛍️</span>}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{p.name}</div>
                                                <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{p._id.slice(-8)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className="badge badge-cyan">{p.category}</span></td>
                                    <td style={{ fontWeight: 700 }}>₹{p.price.toLocaleString('en-IN')}</td>
                                    <td><span className={`badge ${(p.stock ?? 0) > 0 ? 'badge-success' : 'badge-danger'}`}>{p.stock ?? 0}</span></td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-secondary btn-sm" onClick={() => setEditProd(p)}>✏️</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}>🗑</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon">📦</div>
                    <div style={{ fontWeight: 600 }}>No products yet</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>Add your first product to start selling.</div>
                    {canAddProduct && <button className="btn btn-manager" onClick={() => setShowNew(true)}>Add First Product</button>}
                </div>
            )}

            {(showNew || editProd) && (
                <ManagerProductModal
                    product={editProd}
                    shopId={shop?._id}
                    onClose={() => { setShowNew(false); setEditProd(null); }}
                    onSave={() => { setShowNew(false); setEditProd(null); onRefresh(); }}
                />
            )}
        </div>
    );
}

/* ─── Orders Tab ─── */
function OrdersTab({ orders }: { orders: unknown[] }) {
    interface OrderItem { totalPrice: number; shopId: string }
    interface OrderUser { firstname: string; email: string }
    interface Order { _id: string; userId: OrderUser | null; items: OrderItem[]; status: string; createdAt: string }
    const typedOrders = orders as Order[];
    return (
        <div>
            <h1 className="heading-md mb-6">Recent Orders</h1>
            {typedOrders.length > 0 ? (
                <div className="table-container">
                    <table>
                        <thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Revenue</th><th>Status</th><th>Date</th></tr></thead>
                        <tbody>
                            {typedOrders.map((o, i) => (
                                <tr key={i}>
                                    <td style={{ fontFamily: 'monospace', fontSize: '.8rem', color: 'var(--text-muted)' }}>#{(o._id || '').slice(-8)}</td>
                                    <td>{o.userId?.firstname || 'Guest'}<div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{o.userId?.email}</div></td>
                                    <td>{o.items?.length || 0} item(s)</td>
                                    <td style={{ fontWeight: 700 }}>₹{o.items?.reduce((sum: number, i: OrderItem) => sum + i.totalPrice, 0).toLocaleString('en-IN')}</td>
                                    <td><span className={`badge ${o.status === 'delivered' ? 'badge-success' : o.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>{o.status}</span></td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon">🛒</div>
                    <div style={{ fontWeight: 600 }}>No orders yet</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>Orders will appear here once customers start buying.</div>
                </div>
            )}
        </div>
    );
}

/* ─── Shop Settings Tab ─── */
function ShopSettingsTab({ shop, onRefresh, onCreate }: { shop: unknown; onRefresh: () => void; onCreate: () => void }) {
    const [form, setForm] = useState({ name: '', description: '', category: '', email: '', phone: '', address: '' });
    const [loading, setLoading] = useState(false);
    const typedShop = shop as { _id?: string; name?: string; description?: string; category?: string; email?: string; phone?: string; address?: string; status?: string; totalRevenue?: number; totalOrders?: number; totalProducts?: number } | null;
    useEffect(() => {
        if (typedShop) setForm({ name: typedShop.name || '', description: typedShop.description || '', category: typedShop.category || '', email: typedShop.email || '', phone: typedShop.phone || '', address: typedShop.address || '' });
    }, [shop]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (typedShop?._id) {
                await shopService.updateMyShop(form);
                toast.success('Shop updated!');
                onRefresh();
            } else {
                await shopService.createShop(form);
                toast.success('Shop created! Awaiting approval.');
                onCreate();
            }
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Failed');
        } finally { setLoading(false); }
    };

    return (
        <div style={{ maxWidth: '600px' }}>
            <h1 className="heading-md mb-6">Shop Settings</h1>
            {typedShop && (
                <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                    <div className="stat-card cyan"><div className="stat-icon cyan">💰</div><div className="stat-value">₹{typedShop.totalRevenue?.toLocaleString('en-IN') || 0}</div><div className="stat-label">Total Revenue</div></div>
                    <div className="stat-card success"><div className="stat-icon success">📦</div><div className="stat-value">{typedShop.totalProducts || 0}</div><div className="stat-label">Products</div></div>
                </div>
            )}
            <div className="card" style={{ padding: '2rem' }}>
                {typedShop?.status && (
                    <div className={`alert ${typedShop.status === 'approved' ? 'alert-success' : typedShop.status === 'suspended' ? 'alert-error' : 'alert-warning'} mb-6`}>
                        {typedShop.status === 'approved' ? '✅ Your shop is live!' : typedShop.status === 'pending' ? '⏳ Pending owner approval' : `❌ Shop ${typedShop.status}`}
                    </div>
                )}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Shop Name</label>
                            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My Awesome Store" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                <option value="">-- Select --</option>
                                {['Electronics', 'Clothing', 'Food', 'Books', 'Sports', 'Health', 'Beauty', 'Home', 'Other'].map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Tell customers about your store..." style={{ resize: 'vertical' }} />
                    </div>
                    <div className="grid-2">
                        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="shop@example.com" /></div>
                        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91..." /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Shop address..." /></div>
                    <button type="submit" className={`btn btn-manager btn-lg ${loading ? 'btn-loading' : ''}`} disabled={loading}>
                        {loading ? <><span className="spinner" /> Saving...</> : typedShop?._id ? '💾 Save Changes' : '🚀 Create Shop'}
                    </button>
                </form>
            </div>
        </div>
    );
}

/* ─── Create Shop Form (standalone) ─── */
function CreateShopForm({ onSuccess }: { onSuccess: () => void }) {
    const [form, setForm] = useState({ name: '', category: '', description: '' });
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await shopService.createShop(form);
            toast.success('Shop created! Awaiting approval.');
            onSuccess();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Failed');
        } finally { setLoading(false); }
    };
    return (
        <div className="card" style={{ padding: '1.5rem', textAlign: 'left' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 700 }}>🏪 Set Up Your Shop</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
                <div className="form-group"><label className="form-label">Shop Name</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My Store" required /></div>
                <div className="form-group"><label className="form-label">Category</label><select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required><option value="">-- Select --</option>{['Electronics', 'Clothing', 'Food', 'Books', 'Sports', 'Health', 'Other'].map(c => <option key={c}>{c}</option>)}</select></div>
                <button type="submit" className={`btn btn-manager ${loading ? 'btn-loading' : ''}`} disabled={loading}>{loading ? <><span className="spinner" /> Creating...</> : '🚀 Create Shop'}</button>
            </form>
        </div>
    );
}

/* ─── Manager Product Modal ─── */
function ManagerProductModal({ product, shopId, onClose, onSave }: { product: Product | null; shopId?: string; onClose: () => void; onSave: () => void }) {
    const isEdit = !!product;
    const [form, setForm] = useState({ name: product?.name || '', description: product?.description || '', price: product?.price?.toString() || '', category: product?.category || '', stock: product?.stock?.toString() || '0', image: product?.image || '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.description || !form.price || !form.category) { toast.error('Fill all required fields'); return; }
        setLoading(true);
        try {
            const data = { ...form, price: Number(form.price), stock: Number(form.stock), ...(shopId ? { shopId } : {}) };
            if (isEdit && product) { await productService.update(product._id, data); toast.success('Product updated!'); }
            else { await productService.create(data); toast.success('Product added!'); }
            onSave();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal">
                <div className="modal-header"><h2 className="modal-title">{isEdit ? '✏️ Edit Product' : '➕ New Product'}</h2><button className="modal-close" onClick={onClose}>✕</button></div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" required /></div>
                        <div className="form-group"><label className="form-label">Description *</label><textarea className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} required /></div>
                        <div className="grid-2">
                            <div className="form-group"><label className="form-label">Price (₹) *</label><input className="form-input" type="number" min="0" step=".01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required /></div>
                            <div className="form-group"><label className="form-label">Stock</label><input className="form-input" type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} /></div>
                        </div>
                        <div className="form-group"><label className="form-label">Category *</label><select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required><option value="">-- Select --</option>{['Electronics', 'Clothing', 'Food', 'Books', 'Sports', 'Health', 'Other'].map(c => <option key={c}>{c}</option>)}</select></div>
                        <div className="form-group"><label className="form-label">Image URL</label><input className="form-input" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} placeholder="https://..." /></div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className={`btn btn-manager ${loading ? 'btn-loading' : ''}`} disabled={loading}>{loading ? <><span className="spinner" /> Saving...</> : isEdit ? 'Update' : 'Add Product'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
