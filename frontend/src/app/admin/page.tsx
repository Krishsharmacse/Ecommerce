'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { productService, Product } from '@/lib/products';
import { useAuth } from '@/context/AuthContext';
import ProductCard from '@/components/ProductCard';
import toast from 'react-hot-toast';
import {
    BarChart3, Package, CheckCircle2, Layers, AlertCircle, Plus,
    Edit2, Trash2, ShoppingBag, Home, ExternalLink, ShieldCheck,
    X, AlertTriangle, ArrowUpRight
} from 'lucide-react';

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
        <div className="min-h-screen bg-[var(--background)] flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-[var(--surface)] border-b md:border-b-0 md:border-r border-[var(--border)] p-4 sm:p-5 flex flex-col gap-2 flex-shrink-0">
                <div className="px-3 py-2 mb-2">
                    <div className="font-extrabold text-base tracking-tight text-[var(--foreground)] flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-blue-500" />
                        <span>Admin Console</span>
                    </div>
                    <div className="text-xs text-[var(--foreground-muted)] mt-0.5">
                        Logged in as {user?.firstname || 'Admin'}
                    </div>
                </div>

                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Navigation
                </div>

                <button
                    onClick={() => setActiveTab('overview')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-sm' : 'text-[var(--foreground-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]'}`}
                >
                    <BarChart3 className="w-4 h-4" />
                    <span>Overview</span>
                </button>

                <button
                    onClick={() => setActiveTab('products')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left ${activeTab === 'products' ? 'bg-blue-600 text-white shadow-sm' : 'text-[var(--foreground-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]'}`}
                >
                    <Package className="w-4 h-4" />
                    <span>Catalog Products</span>
                </button>

                {/* Primary system admin link */}
                <Link
                    href="/dashboard/admin"
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors mt-2"
                >
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Full Admin System</span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>

                <div className="mt-4 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Quick Links
                </div>

                <Link
                    href="/shop"
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[var(--foreground-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] transition-colors"
                >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Live Storefront</span>
                </Link>
                <Link
                    href="/"
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[var(--foreground-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] transition-colors"
                >
                    <Home className="w-4 h-4" />
                    <span>Back to Home</span>
                </Link>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
                {activeTab === 'overview' && (
                    <div className="space-y-6 max-w-6xl mx-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--foreground)]">
                                    Catalog Management
                                </h1>
                                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                                    Real-time inventory and product catalog overview
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/dashboard/admin"
                                    className="px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] hover:border-blue-500 transition-colors inline-flex items-center gap-1.5"
                                >
                                    <span>Vendor Approvals</span>
                                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                                </Link>
                                <button
                                    onClick={() => { setActiveTab('products'); setShowAddModal(true); }}
                                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-colors shadow-md inline-flex items-center gap-1.5"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Product</span>
                                </button>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-2">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                    <Package className="w-5 h-5" />
                                </div>
                                <div className="text-2xl font-black text-[var(--foreground)]">
                                    {loading ? '...' : products.length}
                                </div>
                                <div className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                                    Total Products
                                </div>
                            </div>

                            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-2">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div className="text-2xl font-black text-[var(--foreground)]">
                                    {loading ? '...' : totalStock.toLocaleString('en-IN')}
                                </div>
                                <div className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                                    Available Stock Units
                                </div>
                            </div>

                            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-2">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div className="text-2xl font-black text-[var(--foreground)]">
                                    {loading ? '...' : categories}
                                </div>
                                <div className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                                    Active Categories
                                </div>
                            </div>

                            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-2">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div className="text-2xl font-black text-[var(--foreground)]">
                                    {loading ? '...' : outOfStock}
                                </div>
                                <div className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                                    Out of Stock
                                </div>
                            </div>
                        </div>

                        {/* Recent Products Table */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">
                                    Recently Added Products
                                </h2>
                                <button
                                    onClick={() => setActiveTab('products')}
                                    className="text-xs font-bold text-blue-400 hover:text-blue-300"
                                >
                                    View All
                                </button>
                            </div>

                            {loading ? (
                                <div className="space-y-3 py-6">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="h-12 bg-[var(--surface-elevated)] rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : products.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-[var(--border-subtle)] text-[var(--foreground-muted)] uppercase tracking-wider">
                                                <th className="pb-3 font-semibold">Product</th>
                                                <th className="pb-3 font-semibold">Category</th>
                                                <th className="pb-3 font-semibold">Price</th>
                                                <th className="pb-3 font-semibold">Stock</th>
                                                <th className="pb-3 font-semibold">Status</th>
                                                <th className="pb-3 font-semibold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-subtle)]">
                                            {products.slice(0, 8).map(p => {
                                                const inStock = (p.stock || 0) > 0;
                                                return (
                                                    <tr key={p._id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                                                        <td className="py-3 pr-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] overflow-hidden flex items-center justify-center flex-shrink-0">
                                                                    {p.image ? (
                                                                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Package className="w-5 h-5 text-zinc-500 stroke-[1.2]" />
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="font-bold text-[var(--foreground)] truncate max-w-[200px]">{p.name || p.productName}</div>
                                                                    <div className="text-[10px] text-[var(--foreground-muted)] font-mono">{p._id.slice(-8)}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 pr-4 text-[var(--foreground-secondary)]">{p.category}</td>
                                                        <td className="py-3 pr-4 font-mono font-bold text-[var(--foreground)]">₹{p.price.toLocaleString('en-IN')}</td>
                                                        <td className="py-3 pr-4 font-mono text-[var(--foreground)]">{p.stock}</td>
                                                        <td className="py-3 pr-4">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inStock ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                                                {inStock ? 'In Stock' : 'Out of Stock'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => { setEditProduct(p); setActiveTab('products'); }}
                                                                    className="p-1.5 rounded-lg border border-[var(--border)] hover:border-blue-500 text-[var(--foreground-secondary)] hover:text-blue-400 transition-colors"
                                                                    aria-label="Edit product"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(p._id)}
                                                                    className="p-1.5 rounded-lg border border-[var(--border)] hover:border-rose-500 text-[var(--foreground-secondary)] hover:text-rose-400 transition-colors"
                                                                    aria-label="Delete product"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-xs text-[var(--foreground-muted)]">
                                    No products found in the catalog.
                                </div>
                            )}
                        </div>
                    </div>
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
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--foreground)]">
                        All Products
                    </h1>
                    <p className="text-xs text-[var(--foreground-muted)] mt-1">
                        {products.length} total products in database
                    </p>
                </div>
                <button
                    id="add-product-btn"
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-colors shadow-md inline-flex items-center gap-1.5 self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Product</span>
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="aspect-[3/4] bg-[var(--surface-elevated)] rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-12 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                        <Package className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-[var(--foreground)]">No products yet</h3>
                    <p className="text-xs text-[var(--foreground-muted)] max-w-sm mx-auto">
                        Add your first catalog product to start selling across the marketplace.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-500 transition-colors inline-flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" /> Add First Product
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-up">
            <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                    <h2 className="text-base font-black tracking-tight text-[var(--foreground)]">
                        {isEdit ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-[var(--foreground-secondary)] mb-1">
                            Product Name
                        </label>
                        <input
                            id="product-name"
                            name="name"
                            type="text"
                            className="w-full h-10 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] outline-none focus:border-blue-500 transition-colors"
                            placeholder="e.g. Wireless Noise-Cancelling Headphones"
                            value={form.name}
                            onChange={handleChange}
                        />
                        {errors.name && (
                            <span className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {errors.name}
                            </span>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[var(--foreground-secondary)] mb-1">
                            Description
                        </label>
                        <textarea
                            id="product-description"
                            name="description"
                            className="w-full p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] outline-none focus:border-blue-500 transition-colors"
                            placeholder="Detailed product specifications and highlights"
                            value={form.description}
                            onChange={handleChange}
                            rows={3}
                        />
                        {errors.description && (
                            <span className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {errors.description}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-[var(--foreground-secondary)] mb-1">
                                Price (₹)
                            </label>
                            <input
                                id="product-price"
                                name="price"
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-full h-10 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] outline-none focus:border-blue-500 transition-colors"
                                placeholder="0.00"
                                value={form.price}
                                onChange={handleChange}
                            />
                            {errors.price && (
                                <span className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> {errors.price}
                                </span>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[var(--foreground-secondary)] mb-1">
                                Stock Count
                            </label>
                            <input
                                id="product-stock"
                                name="stock"
                                type="number"
                                min="0"
                                className="w-full h-10 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] outline-none focus:border-blue-500 transition-colors"
                                placeholder="0"
                                value={form.stock}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[var(--foreground-secondary)] mb-1">
                            Category
                        </label>
                        <select
                            id="product-category"
                            name="category"
                            className="w-full h-10 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] outline-none focus:border-blue-500 transition-colors"
                            value={form.category}
                            onChange={handleChange}
                        >
                            <option value="">-- Select Category --</option>
                            {['Electronics', 'Clothing', 'Footwear', 'Home & Living', 'Health & Wellness', 'Sports & Outdoors', 'Books', 'Other'].map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        {errors.category && (
                            <span className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {errors.category}
                            </span>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[var(--foreground-secondary)] mb-1">
                            Image URL (optional)
                        </label>
                        <input
                            id="product-image"
                            name="image"
                            type="text"
                            className="w-full h-10 px-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] outline-none focus:border-blue-500 transition-colors"
                            placeholder="https://images.example.com/item.jpg"
                            value={form.image}
                            onChange={handleChange}
                        />
                        {form.image && (
                            <div className="mt-2 h-28 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-elevated)]">
                                <img
                                    src={form.image}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            id="product-save-btn"
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-colors shadow-md disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Add Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
