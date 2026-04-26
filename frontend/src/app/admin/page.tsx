'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { productService, Product } from '@/lib/products';
import { useAuth } from '@/context/AuthContext';
import ProductCard from '@/components/ProductCard';
import toast from 'react-hot-toast';

export default function AdminDashboardPage() {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'products'>('overview');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);

    const fetchProducts = () => {
        productService.getAll()
            .then(setProducts)
            .catch(() => toast.error('Failed to load products'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchProducts(); }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this product permanently?')) return;
        try {
            await productService.delete(id);
            toast.success('Product deleted');
            setProducts(prev => prev.filter(p => p._id !== id));
        } catch {
            toast.error('Failed to delete product');
        }
    };

    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const outOfStock = products.filter(p => (p.stock || 0) === 0).length;
    const categories = new Set(products.map(p => p.category).filter(Boolean)).size;

    return (
        <div style={{ paddingTop: '70px', minHeight: '100vh' }}>
            <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)' }}>
                {/* Sidebar */}
                <aside
                    style={{
                        width: '260px',
                        background: 'var(--bg-surface)',
                        borderRight: '1px solid var(--glass-border)',
                        padding: '1.5rem 0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        flexShrink: 0,
                    }}
                >
                    <div style={{ padding: '0.5rem 1rem', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif', fontSize: '1.1rem' }}>
                            <span className="text-gradient">Admin Panel</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Welcome, {user?.firstname}
                        </div>
                    </div>

                    <div style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                        Management
                    </div>

                    {[
                        { id: 'overview', icon: '📊', label: 'Overview' },
                        { id: 'products', icon: '📦', label: 'Products' },
                    ].map(item => (
                        <button
                            key={item.id}
                            className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id as 'overview' | 'products')}
                            style={{ width: '100%', textAlign: 'left' }}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}

                    <div style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                        Quick Links
                    </div>

                    <Link href="/shop" className="sidebar-item" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="sidebar-icon">🛍</span>
                        View Store
                    </Link>
                    <Link href="/" className="sidebar-item" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="sidebar-icon">🏠</span>
                        Back to Home
                    </Link>
                </aside>

                {/* Main */}
                <main style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
                    {activeTab === 'overview' && (
                        <>
                            <div style={{ marginBottom: '2rem' }}>
                                <h1 className="heading-md">Dashboard Overview</h1>
                                <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Welcome back, Admin!</p>
                            </div>

                            {/* Stats */}
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon primary">📦</div>
                                    <div className="stat-value">{loading ? '...' : products.length}</div>
                                    <div className="stat-label">Total Products</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon success">✅</div>
                                    <div className="stat-value">{loading ? '...' : totalStock}</div>
                                    <div className="stat-label">Total Stock Units</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon warning">📂</div>
                                    <div className="stat-value">{loading ? '...' : categories}</div>
                                    <div className="stat-label">Categories</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon danger">⚠️</div>
                                    <div className="stat-value">{loading ? '...' : outOfStock}</div>
                                    <div className="stat-label">Out of Stock</div>
                                </div>
                            </div>

                            {/* Recent Products */}
                            <div style={{ marginTop: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Recent Products</h2>
                                    <button className="btn btn-primary btn-sm" onClick={() => { setActiveTab('products'); setShowAddModal(true); }}>
                                        + Add Product
                                    </button>
                                </div>
                                {loading ? (
                                    <div className="page-loader"><div className="spinner spinner-primary" /></div>
                                ) : (
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Product</th>
                                                    <th>Category</th>
                                                    <th>Price</th>
                                                    <th>Stock</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {products.slice(0, 8).map(p => (
                                                    <tr key={p._id}>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-elevated)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    {p.image ? (
                                                                        <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    ) : (
                                                                        <span style={{ fontSize: '1.25rem' }}>🛍️</span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{p.name || p.productName}</div>
                                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p._id.slice(-8)}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td><span className="badge badge-primary">{p.category}</span></td>
                                                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{p.price.toLocaleString('en-IN')}</td>
                                                        <td>{p.stock}</td>
                                                        <td>
                                                            <span className={`badge ${(p.stock || 0) > 0 ? 'badge-success' : 'badge-danger'}`}>
                                                                {(p.stock || 0) > 0 ? 'In Stock' : 'Out of Stock'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                <button className="btn btn-secondary btn-sm" onClick={() => { setEditProduct(p); setActiveTab('products'); }}>
                                                                    ✏️
                                                                </button>
                                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}>
                                                                    🗑
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'products' && (
                        <ProductsTab
                            products={products}
                            loading={loading}
                            onRefresh={fetchProducts}
                            showAddModal={showAddModal}
                            setShowAddModal={setShowAddModal}
                            editProduct={editProduct}
                            setEditProduct={setEditProduct}
                            onDelete={handleDelete}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}

/* ============ PRODUCTS TAB ============ */
interface ProductsTabProps {
    products: Product[];
    loading: boolean;
    onRefresh: () => void;
    showAddModal: boolean;
    setShowAddModal: (v: boolean) => void;
    editProduct: Product | null;
    setEditProduct: (p: Product | null) => void;
    onDelete: (id: string) => void;
}

function ProductsTab({ products, loading, onRefresh, showAddModal, setShowAddModal, editProduct, setEditProduct, onDelete }: ProductsTabProps) {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="heading-md">Products</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{products.length} total products</p>
                </div>
                <button id="add-product-btn" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    ➕ Add Product
                </button>
            </div>

            {loading ? (
                <div className="page-loader"><div className="spinner spinner-primary spinner-lg" /></div>
            ) : products.length > 0 ? (
                <div className="products-grid">
                    {products.map((product, i) => (
                        <ProductCard
                            key={product._id}
                            product={product}
                            index={i}
                            isAdmin
                            onEdit={setEditProduct}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon">📦</div>
                    <div className="empty-title">No products yet</div>
                    <div className="empty-description">Add your first product to get started.</div>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        Add First Product
                    </button>
                </div>
            )}

            {/* Add/Edit Modal */}
            {(showAddModal || editProduct) && (
                <ProductModal
                    product={editProduct}
                    onClose={() => { setShowAddModal(false); setEditProduct(null); }}
                    onSave={() => { setShowAddModal(false); setEditProduct(null); onRefresh(); }}
                />
            )}
        </div>
    );
}

/* ============ PRODUCT MODAL ============ */
interface ProductModalProps {
    product: Product | null;
    onClose: () => void;
    onSave: () => void;
}

function ProductModal({ product, onClose, onSave }: ProductModalProps) {
    const isEdit = !!product;
    const [form, setForm] = useState({
        name: product?.name || '',
        description: product?.description || '',
        price: product?.price?.toString() || '',
        category: product?.category || '',
        stock: product?.stock?.toString() || '0',
        image: product?.image || '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = 'Name is required';
        if (!form.description.trim()) errs.description = 'Description is required';
        if (!form.price) errs.price = 'Price is required';
        else if (isNaN(Number(form.price)) || Number(form.price) < 0) errs.price = 'Enter a valid price';
        if (!form.category.trim()) errs.category = 'Category is required';
        return errs;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }

        setLoading(true);
        try {
            const data = {
                name: form.name.trim(),
                description: form.description.trim(),
                price: Number(form.price),
                category: form.category.trim(),
                stock: Number(form.stock),
                ...(form.image ? { image: form.image } : {}),
            };

            if (isEdit && product) {
                await productService.update(product._id, data);
                toast.success('Product updated!');
            } else {
                await productService.create(data);
                toast.success('Product added!');
            }
            onSave();
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            toast.error(axiosError?.response?.data?.message || 'Failed to save product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{isEdit ? '✏️ Edit Product' : '➕ Add New Product'}</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                        <div className="form-group">
                            <label className="form-label">Product Name</label>
                            <input id="product-name" name="name" type="text" className={`form-input ${errors.name ? 'error' : ''}`} placeholder="Enter product name" value={form.name} onChange={handleChange} />
                            {errors.name && <span className="form-error">⚠ {errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                id="product-description"
                                name="description"
                                className={`form-input ${errors.description ? 'error' : ''}`}
                                placeholder="Enter product description"
                                value={form.description}
                                onChange={handleChange}
                                rows={3}
                                style={{ resize: 'vertical', minHeight: '90px' }}
                            />
                            {errors.description && <span className="form-error">⚠ {errors.description}</span>}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Price (₹)</label>
                                <input id="product-price" name="price" type="number" min="0" step="0.01" className={`form-input ${errors.price ? 'error' : ''}`} placeholder="0.00" value={form.price} onChange={handleChange} />
                                {errors.price && <span className="form-error">⚠ {errors.price}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Stock</label>
                                <input id="product-stock" name="stock" type="number" min="0" className="form-input" placeholder="0" value={form.stock} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <select id="product-category" name="category" className={`form-input ${errors.category ? 'error' : ''}`} value={form.category} onChange={handleChange}>
                                <option value="">-- Select Category --</option>
                                {['Electronics', 'Clothing', 'Food', 'Books', 'Sports', 'Health', 'Other'].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            {errors.category && <span className="form-error">⚠ {errors.category}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Image URL (optional)</label>
                            <input id="product-image" name="image" type="text" className="form-input" placeholder="https://example.com/image.jpg" value={form.image} onChange={handleChange} />
                            {form.image && (
                                <div style={{ marginTop: '0.5rem', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--glass-border)', maxHeight: '140px' }}>
                                    <img src={form.image} alt="Preview" style={{ width: '100%', height: '140px', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button id="product-save-btn" type="submit" className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} disabled={loading}>
                            {loading ? <><span className="spinner" /> Saving...</> : isEdit ? 'Update Product' : 'Add Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
