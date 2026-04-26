'use client';
import { useRef, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { productService, Product } from '@/lib/products';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'products' | 'orders' | 'media';

interface ShopData {
    _id: string; name: string; category: string; status: string;
    isActive: boolean; description?: string; totalRevenue?: number;
    totalProducts?: number; ownerId?: { firstname: string; email: string };
}
interface Analytics {
    totalRevenue: number; totalOrders: number; totalProducts: number;
    topProducts: { name: string; sold: number; revenue: number }[];
    chartData: { date: string; revenue: number }[];
    shopName: string; isLive: boolean;
}
interface Order { _id: string; userId?: { firstname: string; email: string }; items: { totalPrice: number }[]; status: string; createdAt: string }
interface ApprovedShop { _id: string; name: string; category: string; description?: string; ownerId?: { firstname: string } }

export default function ShopkeeperDashboard() {
    const { user, isApprovedShopkeeper } = useAuth();
    const [tab, setTab] = useState<Tab>('overview');
    const [shop, setShop] = useState<ShopData | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);
    const [showNewProduct, setShowNewProduct] = useState(false);
    const [editProd, setEditProd] = useState<Product | null>(null);

    // Join shop state
    const [availableShops, setAvailableShops] = useState<ApprovedShop[]>([]);
    const [joining, setJoining] = useState(false);
    const [hasPendingRequest, setHasPendingRequest] = useState(false);

    const load = async () => {
        try {
            const [shopRes, salesRes] = await Promise.all([
                api.get('/shop/sk/shop'),
                api.get('/shop/sk/sales'),
            ]);
            setShop(shopRes.data.shop);
            setProducts(shopRes.data.products || []);
            setOrders(shopRes.data.recentOrders || []);
            setAnalytics(salesRes.data.analytics);
        } catch {
            setShop(null);
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableShops = async () => {
        try {
            const res = await api.get('/shop/all');
            setAvailableShops(res.data.shops || []);
        } catch { /* ignore */ }
    };

    useEffect(() => {
        if (isApprovedShopkeeper) {
            load();
        } else {
            setLoading(false);
            // Check if shopkeeper has a pending request (has shopId but not approved)
            if (user?.shopId) {
                setHasPendingRequest(true);
            } else {
                loadAvailableShops();
            }
        }
    }, [isApprovedShopkeeper, user]);

    const toggleLive = async () => {
        setToggling(true);
        try {
            const res = await api.patch('/shop/sk/toggle-live');
            toast.success(res.data.message);
            setShop(prev => prev ? { ...prev, isActive: res.data.isActive } : prev);
            if (analytics) setAnalytics(prev => prev ? { ...prev, isLive: res.data.isActive } : prev);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Failed to toggle shop status');
        } finally { setToggling(false); }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('Delete this product?')) return;
        try { await productService.delete(id); toast.success('Deleted'); load(); }
        catch { toast.error('Delete failed'); }
    };

    const handleJoinShop = async (shopId: string) => {
        if (!confirm('Send a join request to this shop?')) return;
        setJoining(true);
        try {
            await api.post('/shop/sk/join', { shopId });
            toast.success('Join request sent! Waiting for manager approval.');
            setHasPendingRequest(true);
            setAvailableShops([]);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Request failed');
        } finally { setJoining(false); }
    };

    const isLive = shop?.isActive;
    const canToggle = shop?.status === 'approved';

    const sidebarItems: { id: Tab; icon: string; label: string; badge?: number }[] = [
        { id: 'overview', icon: '📊', label: 'Overview' },
        { id: 'products', icon: '📦', label: 'Products', badge: products.length },
        { id: 'orders', icon: '🛒', label: 'Recent Orders', badge: orders.length },
        { id: 'media', icon: '🖼️', label: 'Media Library' },
    ];

    // Pending approval screen — shopkeeper not yet approved by manager
    if (!isApprovedShopkeeper && user?.role === 'shopkeeper') {
        return (
            <div className="dashboard-layout">
                <aside className="sidebar" style={{ background: 'rgba(245,158,11,.02)', borderRightColor: 'rgba(245,158,11,.1)' }}>
                    <div className="sidebar-header">
                        <div className="sidebar-brand" style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🛒 Shopkeeper</div>
                        <div className="sidebar-user">{user?.firstname}</div>
                    </div>
                    <div className="sidebar-item">{hasPendingRequest ? '⏳ Awaiting Manager' : '🔍 Find a Shop'}</div>
                </aside>
                <main className="dashboard-main">
                    <div style={{ maxWidth: '600px', margin: '3rem auto' }}>
                        {hasPendingRequest ? (
                            /* Pending request screen */
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'floatSlow 4s ease-in-out infinite' }}>⏳</div>
                                <h2 className="heading-md" style={{ marginBottom: '1rem' }}>Request Pending</h2>
                                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                                    Your join request is pending approval from the store manager. Once approved, you'll get full access.
                                </p>
                                <div className="alert alert-info" style={{ marginTop: '2rem', textAlign: 'left' }}>
                                    💡 Contact your manager and share your registered email: <strong>{user?.email}</strong>
                                </div>
                            </div>
                        ) : (
                            /* Join shop screen */
                            <div>
                                <div style={{ marginBottom: '2rem' }}>
                                    <h1 className="heading-md">Join a Shop</h1>
                                    <p style={{ color: 'var(--text-muted)', marginTop: '.5rem', lineHeight: 1.6 }}>
                                        Select an approved shop below to send a join request. The manager will approve your request.
                                    </p>
                                </div>
                                {availableShops.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {availableShops.map(s => (
                                            <div key={s._id} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{s.name}</div>
                                                    <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.25rem' }}>
                                                        <span className="badge badge-cyan" style={{ fontSize: '.7rem', marginRight: '.5rem' }}>{s.category}</span>
                                                        {s.ownerId?.firstname && <span>Managed by {s.ownerId.firstname}</span>}
                                                    </div>
                                                    {s.description && <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: '.4rem' }}>{s.description}</div>}
                                                </div>
                                                <button
                                                    className={`btn btn-sm ${joining ? 'btn-loading' : ''}`}
                                                    style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', whiteSpace: 'nowrap', flexShrink: 0 }}
                                                    onClick={() => handleJoinShop(s._id)}
                                                    disabled={joining}>
                                                    {joining ? <><span className="spinner" /> Sending...</> : '📩 Request to Join'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <div className="empty-icon">🏪</div>
                                        <div style={{ fontWeight: 600 }}>No shops available</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>No approved shops are currently available to join.</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar" style={{ background: 'rgba(245,158,11,.02)', borderRightColor: 'rgba(245,158,11,.1)' }}>
                <div className="sidebar-header">
                    <div className="sidebar-brand" style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {shop?.name || '🛒 My Shop'}
                    </div>
                    <div className="sidebar-user">{user?.firstname} · Shopkeeper</div>
                    <span className={`badge mt-2 ${isLive ? 'badge-success' : 'badge-warning'}`}>
                        {isLive ? '🟢 LIVE' : '🔴 OFFLINE'}
                    </span>
                </div>

                {/* Live Toggle Button */}
                <div style={{ padding: '.75rem' }}>
                    <button
                        className={`btn w-full ${isLive ? 'btn-danger' : 'btn-accent'} ${toggling ? 'btn-loading' : ''}`}
                        onClick={toggleLive}
                        disabled={toggling || !canToggle}
                        title={!canToggle ? 'Shop must be approved first' : ''}
                        style={{ borderRadius: '12px', fontWeight: 700 }}>
                        {toggling ? <><span className="spinner" /> Updating...</>
                            : isLive ? '🔴 Go Offline' : '🟢 Go Live'}
                    </button>
                    {!canToggle && <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '.4rem' }}>Shop needs owner approval</div>}
                </div>

                <div className="sidebar-section">Menu</div>
                {sidebarItems.map(item => (
                    <button key={item.id} className={`sidebar-item${tab === item.id ? ' active' : ''}`}
                        onClick={() => setTab(item.id)}
                        style={tab === item.id ? { color: '#fbbf24', background: 'rgba(245,158,11,.1)' } : {}}>
                        <span className="sidebar-icon">{item.icon}</span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && <span className="sidebar-badge">{item.badge}</span>}
                    </button>
                ))}

                <div className="sidebar-section" style={{ marginTop: 'auto' }}>Links</div>
                <Link href="/shop" className="sidebar-item"><span className="sidebar-icon">🛍</span>View Store</Link>
            </aside>

            {/* Main Content */}
            <main className="dashboard-main">
                {loading ? (
                    <div className="page-loader">
                        <div className="spinner spinner-lg" style={{ borderTopColor: '#fbbf24' }} />
                    </div>
                ) : !shop ? (
                    <div className="empty-state">
                        <div className="empty-icon">🏪</div>
                        <div style={{ fontWeight: 600 }}>No shop assigned</div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>Ask your manager to assign you to a shop.</p>
                    </div>
                ) : tab === 'overview' ? (
                    <OverviewTab analytics={analytics} shop={shop} onToggle={toggleLive} toggling={toggling} />
                ) : tab === 'products' ? (
                    <ProductsTab products={products} shop={shop} onRefresh={load} showNew={showNewProduct}
                        setShowNew={setShowNewProduct} editProd={editProd} setEditProd={setEditProd}
                        onDelete={handleDeleteProduct} />
                ) : tab === 'media' ? (
                    <MediaTab />
                ) : (
                    <OrdersTab orders={orders} />
                )}
            </main>
        </div>
    );
}

/* ─── Overview Tab ─── */
function OverviewTab({ analytics, shop, onToggle, toggling }: { analytics: Analytics | null; shop: ShopData; onToggle: () => void; toggling: boolean }) {
    const chartMax = analytics?.chartData?.length ? Math.max(...analytics.chartData.map(d => d.revenue), 1) : 1;
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="heading-md">{shop.name}</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '.25rem' }}>{shop.category} · Last 30 days</p>
                </div>
                <button className={`btn ${shop.isActive ? 'btn-danger' : 'btn-accent'} ${toggling ? 'btn-loading' : ''}`}
                    onClick={onToggle} disabled={toggling || shop.status !== 'approved'}>
                    {toggling ? <><span className="spinner" /> Updating...</> : shop.isActive ? '🔴 Take Offline' : '🟢 Go Live'}
                </button>
            </div>

            {shop.status !== 'approved' && (
                <div className="alert alert-warning mb-6">⚠ Shop is <strong>{shop.status}</strong>. You can only go live once the owner approves the shop.</div>
            )}

            <div className="stats-grid">
                <div className="stat-card warning">
                    <div className="stat-icon warning">💰</div>
                    <div className="stat-value" style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        ₹{analytics?.totalRevenue?.toLocaleString('en-IN') ?? '0'}
                    </div>
                    <div className="stat-label">Total Revenue</div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon success">🛒</div>
                    <div className="stat-value">{analytics?.totalOrders ?? 0}</div>
                    <div className="stat-label">Orders</div>
                </div>
                <div className="stat-card primary">
                    <div className="stat-icon primary">📦</div>
                    <div className="stat-value">{analytics?.totalProducts ?? 0}</div>
                    <div className="stat-label">Products</div>
                </div>
                <div className="stat-card" style={{ border: shop.isActive ? '1px solid rgba(16,185,129,.25)' : '1px solid var(--glass-border)' }}>
                    <div className="stat-icon" style={{ background: shop.isActive ? 'rgba(16,185,129,.15)' : 'var(--glass-bg)' }}>
                        {shop.isActive ? '🟢' : '🔴'}
                    </div>
                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{shop.isActive ? 'LIVE' : 'OFFLINE'}</div>
                    <div className="stat-label">Shop Status</div>
                </div>
            </div>

            {analytics?.chartData && analytics.chartData.length > 0 && (
                <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '1rem' }}>📈 Revenue (30 days)</div>
                    <div className="chart-bars">
                        {analytics.chartData.map((d, i) => (
                            <div key={i} title={`${d.date}: ₹${d.revenue}`} className="chart-bar"
                                style={{ height: `${Math.max(4, (d.revenue / chartMax) * 80)}px`, background: 'linear-gradient(135deg,#f59e0b,#fbbf24)' }} />
                        ))}
                    </div>
                </div>
            )}

            {analytics?.topProducts && analytics.topProducts.length > 0 && (
                <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '1rem' }}>🏆 Top Products</div>
                    {analytics.topProducts.map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '.75rem 0', borderBottom: i < analytics.topProducts.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                            <span style={{ fontSize: '1.2rem', width: '24px', textAlign: 'center' }}>{'🥇🥈🥉'[i] || '🏅'}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{p.name}</div>
                                <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{p.sold} sold</div>
                            </div>
                            <div style={{ fontWeight: 800, fontFamily: 'Outfit,sans-serif', color: '#fbbf24' }}>₹{p.revenue.toLocaleString('en-IN')}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Products Tab ─── */
function ProductsTab({ products, shop, onRefresh, showNew, setShowNew, editProd, setEditProd, onDelete }: {
    products: Product[]; shop: ShopData;
    onRefresh: () => void; showNew: boolean; setShowNew: (v: boolean) => void;
    editProd: Product | null; setEditProd: (p: Product | null) => void;
    onDelete: (id: string) => void;
}) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="heading-md">Products</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '.25rem' }}>{products.length} items in {shop.name}</p>
                </div>
                <button className="btn" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', boxShadow: '0 4px 20px rgba(245,158,11,.3)' }}
                    onClick={() => setShowNew(true)} disabled={shop.status !== 'approved'}>
                    ➕ Add Product
                </button>
            </div>
            {shop.status !== 'approved' && <div className="alert alert-warning mb-4">⚠ Shop needs approval before you can add products.</div>}
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
                                                {p.image ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>📦</span>}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{p.name}</div>
                                                <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{p._id.slice(-8)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className="badge badge-warning" style={{ background: 'rgba(245,158,11,.1)', color: '#fbbf24', borderColor: 'rgba(245,158,11,.2)' }}>{p.category}</span></td>
                                    <td style={{ fontWeight: 700 }}>₹{p.price.toLocaleString('en-IN')}</td>
                                    <td><span className={`badge ${(p.stock ?? 0) > 0 ? 'badge-success' : 'badge-danger'}`}>{p.stock ?? 0}</span></td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-secondary btn-sm" onClick={() => setEditProd(p)}>✏️</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => onDelete(p._id)}>🗑</button>
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
                    <div style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>Add your first product.</div>
                    {shop.status === 'approved' && <button className="btn" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff' }} onClick={() => setShowNew(true)}>Add Product</button>}
                </div>
            )}
            {(showNew || editProd) && (
                <ShopkeeperProductModal product={editProd} shopId={shop._id}
                    onClose={() => { setShowNew(false); setEditProd(null); }}
                    onSave={() => { setShowNew(false); setEditProd(null); onRefresh(); }} />
            )}
        </div>
    );
}

/* ─── Orders Tab ─── */
function OrdersTab({ orders }: { orders: Order[] }) {
    return (
        <div>
            <h1 className="heading-md mb-6">Recent Orders</h1>
            {orders.length > 0 ? (
                <div className="table-container">
                    <table>
                        <thead><tr><th>Order ID</th><th>Customer</th><th>Revenue</th><th>Status</th><th>Date</th></tr></thead>
                        <tbody>
                            {orders.map((o, i) => (
                                <tr key={i}>
                                    <td style={{ fontFamily: 'monospace', fontSize: '.8rem', color: 'var(--text-muted)' }}>#{(o._id || '').slice(-8)}</td>
                                    <td>{o.userId?.firstname || 'Guest'}<div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{o.userId?.email}</div></td>
                                    <td style={{ fontWeight: 700 }}>₹{o.items?.reduce((sum, i) => sum + i.totalPrice, 0).toLocaleString('en-IN')}</td>
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
                </div>
            )}
        </div>
    );
}

/* ─── Media Library Tab ─── */
interface UploadedImage { filename: string; url: string; size: number; createdAt: string; }

function MediaTab() {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [loadingImages, setLoadingImages] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const [previewImage, setPreviewImage] = useState<UploadedImage | null>(null);
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
    const [deletingFile, setDeletingFile] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const loadImages = useCallback(async () => {
        setLoadingImages(true);
        try {
            const res = await api.get('/upload/images');
            setImages(res.data.images || []);
        } catch {
            toast.error('Failed to load media library');
        } finally { setLoadingImages(false); }
    }, []);

    useEffect(() => { loadImages(); }, [loadImages]);

    const uploadFiles = async (files: FileList | File[]) => {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        const validFiles = Array.from(files).filter(f => validTypes.includes(f.type) && f.size <= 5 * 1024 * 1024);
        if (validFiles.length === 0) {
            toast.error('Please select valid image files (JPEG, PNG, WebP, GIF · max 5 MB)');
            return;
        }
        setUploading(true);
        setUploadProgress(0);
        let done = 0;
        for (const file of validFiles) {
            try {
                const fd = new FormData();
                fd.append('image', file);
                await api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                done++;
                setUploadProgress(Math.round((done / validFiles.length) * 100));
            } catch {
                toast.error(`Failed to upload ${file.name}`);
            }
        }
        toast.success(`${done} image${done !== 1 ? 's' : ''} uploaded successfully!`);
        setUploading(false);
        setUploadProgress(0);
        await loadImages();
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
    }, []);

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = () => setDragOver(false);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) uploadFiles(e.target.files);
        e.target.value = '';
    };

    const copyUrl = (url: string) => {
        const full = `${API_BASE}${url}`;
        navigator.clipboard.writeText(full).then(() => {
            setCopiedUrl(url);
            toast.success('URL copied!');
            setTimeout(() => setCopiedUrl(null), 2000);
        });
    };

    const deleteImage = async (img: UploadedImage) => {
        if (!confirm(`Delete "${img.filename}"? This cannot be undone.`)) return;
        setDeletingFile(img.filename);
        try {
            await api.delete(`/upload/image/${img.filename}`);
            toast.success('Image deleted');
            setImages(prev => prev.filter(i => i.filename !== img.filename));
            if (previewImage?.filename === img.filename) setPreviewImage(null);
        } catch { toast.error('Delete failed'); }
        finally { setDeletingFile(null); }
    };

    const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="heading-md">Media Library</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '.25rem' }}>{images.length} image{images.length !== 1 ? 's' : ''} uploaded</p>
                </div>
                <button
                    className="btn"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', boxShadow: '0 4px 20px rgba(245,158,11,.3)' }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}>
                    {uploading ? <><span className="spinner" /> Uploading… {uploadProgress}%</> : '📁 Upload from Device'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" multiple style={{ display: 'none' }} onChange={handleFileInput} />
            </div>

            {/* ── Drop Zone ───────────────────────────────────────── */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !uploading && fileInputRef.current?.click()}
                style={{
                    border: `2px dashed ${dragOver ? '#f59e0b' : 'var(--glass-border)'}`,
                    borderRadius: 'var(--radius)',
                    background: dragOver ? 'rgba(245,158,11,.06)' : 'var(--bg-surface)',
                    minHeight: 140,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '.5rem',
                    cursor: uploading ? 'wait' : 'pointer',
                    transition: 'all .25s ease',
                    marginBottom: '1.5rem',
                    padding: '2rem',
                    textAlign: 'center',
                    transform: dragOver ? 'scale(1.01)' : 'scale(1)',
                }}>
                {uploading ? (
                    <>
                        <div className="spinner spinner-lg" style={{ borderTopColor: '#f59e0b' }} />
                        <div style={{ fontWeight: 600, marginTop: '.5rem' }}>Uploading… {uploadProgress}%</div>
                        <div style={{ width: '100%', maxWidth: 260, height: 6, background: 'var(--glass-border)', borderRadius: 999, overflow: 'hidden', marginTop: '.5rem' }}>
                            <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', borderRadius: 999, transition: 'width .3s ease' }} />
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: '2.5rem', transition: 'transform .2s', transform: dragOver ? 'scale(1.2)' : 'scale(1)' }}>{'🖼️'}</div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{dragOver ? 'Drop images here!' : 'Drag & drop images here'}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '.825rem' }}>or click to browse from your device</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '.72rem', marginTop: '.25rem' }}>Supports JPEG, PNG, WebP, GIF · Max 5 MB per file · Multiple files allowed</div>
                    </>
                )}
            </div>

            {/* ── Gallery ─────────────────────────────────────────── */}
            {loadingImages ? (
                <div className="page-loader" style={{ minHeight: 200 }}>
                    <div className="spinner spinner-lg" style={{ borderTopColor: '#fbbf24' }} />
                </div>
            ) : images.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🖼️</div>
                    <div style={{ fontWeight: 600 }}>No images yet</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>Upload your first product image above.</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                    {images.map(img => (
                        <div key={img.filename} className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative', cursor: 'pointer', transition: 'transform .2s, box-shadow .2s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,.25)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}>

                            {/* Thumbnail */}
                            <div style={{ width: '100%', height: 140, overflow: 'hidden', background: 'var(--bg-elevated)', position: 'relative' }}
                                onClick={() => setPreviewImage(img)}>
                                <img
                                    src={`${API_BASE}${img.url}`}
                                    alt={img.filename}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .3s' }}
                                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                                    onMouseLeave={e => (e.currentTarget.style.transform = '')}
                                />
                                {deletingFile === img.filename && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div className="spinner" />
                                    </div>
                                )}
                            </div>

                            {/* Info + Actions */}
                            <div style={{ padding: '.6rem .75rem' }}>
                                <div style={{ fontSize: '.72rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)', marginBottom: '.3rem' }} title={img.filename}>
                                    {img.filename}
                                </div>
                                <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', marginBottom: '.5rem' }}>
                                    {formatSize(img.size)} · {new Date(img.createdAt).toLocaleDateString('en-IN')}
                                </div>
                                <div style={{ display: 'flex', gap: '.35rem' }}>
                                    <button
                                        className="btn btn-sm"
                                        style={{ flex: 1, fontSize: '.7rem', padding: '.3rem .5rem', background: copiedUrl === img.url ? 'rgba(16,185,129,.15)' : 'var(--glass-bg)', color: copiedUrl === img.url ? '#10b981' : 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}
                                        onClick={() => copyUrl(img.url)}>
                                        {copiedUrl === img.url ? '✅ Copied!' : '🔗 Copy URL'}
                                    </button>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        style={{ padding: '.3rem .5rem', fontSize: '.7rem' }}
                                        onClick={() => deleteImage(img)}
                                        disabled={!!deletingFile}>
                                        🗑
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Full-screen Preview Modal ──────────────────────── */}
            {previewImage && (
                <div className="modal-backdrop" onClick={() => setPreviewImage(null)} style={{ zIndex: 1000 }}>
                    <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,.6)' }}
                        onClick={e => e.stopPropagation()}>
                        <img
                            src={`${API_BASE}${previewImage.url}`}
                            alt={previewImage.filename}
                            style={{ display: 'block', maxWidth: '80vw', maxHeight: '75vh', objectFit: 'contain' }}
                        />
                        <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderTop: '1px solid var(--glass-border)' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '.875rem' }}>{previewImage.filename}</div>
                                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>{formatSize(previewImage.size)} · {new Date(previewImage.createdAt).toLocaleString('en-IN')}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '.5rem' }}>
                                <button className="btn btn-sm btn-secondary" onClick={() => copyUrl(previewImage.url)}>🔗 Copy URL</button>
                                <button className="btn btn-sm btn-danger" onClick={() => deleteImage(previewImage)}>🗑 Delete</button>
                                <button className="btn btn-sm btn-ghost" onClick={() => setPreviewImage(null)}>✕ Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Product Modal with local image upload ─── */
function ShopkeeperProductModal({ product, shopId, onClose, onSave }: { product: Product | null; shopId: string; onClose: () => void; onSave: () => void }) {
    const isEdit = !!product;
    const [form, setForm] = useState({ name: product?.name || '', description: product?.description || '', price: product?.price?.toString() || '', category: product?.category || '', stock: product?.stock?.toString() || '0', image: product?.image || '' });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [imgPreview, setImgPreview] = useState<string>(product?.image || '');
    const fileRef = { current: null as HTMLInputElement | null };

    // ── Handle local file pick → upload → set URL ──────────────────────────────
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Local preview instantly
        const reader = new FileReader();
        reader.onload = ev => setImgPreview(ev.target?.result as string);
        reader.readAsDataURL(file);

        // Upload to backend
        setUploading(true);
        try {
            const data = new FormData();
            data.append('image', file);
            const res = await api.post('/upload/image', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${res.data.url}`;
            setForm(f => ({ ...f, image: backendUrl }));
            setImgPreview(backendUrl);
            toast.success('Image uploaded!');
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Upload failed');
            setImgPreview(form.image);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.price || !form.category) { toast.error('Fill required fields'); return; }
        setLoading(true);
        try {
            const data = { ...form, price: Number(form.price), stock: Number(form.stock), shopId };
            if (isEdit && product) { await productService.update(product._id, data); toast.success('Updated!'); }
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
                <div className="modal-header"><h2 className="modal-title">{isEdit ? '✏️ Edit Product' : '➕ Add Product'}</h2><button className="modal-close" onClick={onClose}>✕</button></div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
                        <div className="form-group"><label className="form-label">Description *</label><textarea className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} /></div>
                        <div className="grid-2">
                            <div className="form-group"><label className="form-label">Price (₹) *</label><input className="form-input" type="number" min="0" step=".01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required /></div>
                            <div className="form-group"><label className="form-label">Stock</label><input className="form-input" type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} /></div>
                        </div>
                        <div className="form-group"><label className="form-label">Category *</label><select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required><option value="">-- Select --</option>{['Electronics', 'Clothing', 'Food', 'Books', 'Sports', 'Health', 'Beauty', 'Home', 'Other'].map(c => <option key={c}>{c}</option>)}</select></div>

                        {/* ── Image Upload ─────────────────────────────────────── */}
                        <div className="form-group">
                            <label className="form-label">Product Image</label>

                            {/* Preview */}
                            <div style={{
                                width: '100%', height: 160, borderRadius: 'var(--radius)',
                                border: '2px dashed var(--glass-border)', overflow: 'hidden',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'var(--bg-surface)', marginBottom: '.75rem', position: 'relative',
                                cursor: 'pointer',
                            }} onClick={() => fileRef.current?.click()}>
                                {uploading && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div className="spinner spinner-lg" />
                                    </div>
                                )}
                                {imgPreview ? (
                                    <img src={imgPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '.4rem' }}>📷</div>
                                        <div style={{ fontSize: '.8rem', fontWeight: 600 }}>Click to upload image</div>
                                        <div style={{ fontSize: '.7rem', marginTop: '.2rem' }}>JPEG, PNG, WebP · max 5 MB</div>
                                    </div>
                                )}
                            </div>

                            {/* Hidden file input */}
                            <input
                                ref={el => { fileRef.current = el; }}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />

                            {/* Buttons row */}
                            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                                    {uploading ? <><span className="spinner" /> Uploading…</> : '📁 Browse Device'}
                                </button>
                                {imgPreview && (
                                    <button type="button" className="btn btn-sm" style={{ background: 'rgba(239,68,68,.12)', color: '#f87171', border: '1px solid rgba(239,68,68,.2)' }}
                                        onClick={() => { setImgPreview(''); setForm(f => ({ ...f, image: '' })); }}>
                                        ✕ Remove
                                    </button>
                                )}
                            </div>

                            {/* Also allow pasting a URL */}
                            <div style={{ marginTop: '.6rem' }}>
                                <input
                                    className="form-input"
                                    value={form.image}
                                    onChange={e => { setForm(f => ({ ...f, image: e.target.value })); setImgPreview(e.target.value); }}
                                    placeholder="…or paste an image URL"
                                    style={{ fontSize: '.8rem' }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className={`btn ${loading ? 'btn-loading' : ''}`}
                            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff' }} disabled={loading || uploading}>
                            {loading ? <><span className="spinner" /> Saving...</> : isEdit ? 'Update' : 'Add Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

