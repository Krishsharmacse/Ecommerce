'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { productService, Product } from '@/lib/products';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { isAdmin } = useAuth();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (params?.id) {
            productService.getById(params.id as string)
                .then(setProduct)
                .catch(() => {
                    toast.error('Product not found');
                    router.push('/shop');
                })
                .finally(() => setLoading(false));
        }
    }, [params?.id, router]);

    const handleDelete = async () => {
        if (!product || !confirm('Are you sure you want to delete this product?')) return;
        setDeleting(true);
        try {
            await productService.delete(product._id);
            toast.success('Product deleted successfully');
            router.push('/shop');
        } catch {
            toast.error('Failed to delete product');
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ paddingTop: '70px' }}>
                <div className="container" style={{ padding: '3rem 1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                        <div className="skeleton" style={{ height: '450px', borderRadius: '16px' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="skeleton" style={{ height: '14px', width: '40%' }} />
                            <div className="skeleton" style={{ height: '36px', width: '80%' }} />
                            <div className="skeleton" style={{ height: '24px', width: '30%' }} />
                            <div className="skeleton" style={{ height: '100px', width: '100%' }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!product) return null;

    const displayName = product.name || product.productName || 'Unnamed';
    const isInStock = (product.stock ?? 0) > 0;

    return (
        <div style={{ paddingTop: '70px', minHeight: '100vh' }}>
            <div className="container" style={{ padding: '3rem 1.5rem' }}>
                {/* Breadcrumb */}
                <div
                    style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                        marginBottom: '2rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                    }}
                >
                    <Link href="/" style={{ color: 'var(--text-muted)', transition: 'color 250ms' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                        Home
                    </Link>
                    <span>/</span>
                    <Link href="/shop" style={{ color: 'var(--text-muted)', transition: 'color 250ms' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                        Shop
                    </Link>
                    <span>/</span>
                    <span style={{ color: 'var(--text-primary)' }}>{displayName}</span>
                </div>

                {/* Product Detail */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                        gap: '3rem',
                        alignItems: 'start',
                    }}
                >
                    {/* Image */}
                    <div
                        style={{
                            borderRadius: '20px',
                            overflow: 'hidden',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--glass-border)',
                            aspectRatio: '1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: 'fadeInUp 0.5s ease forwards',
                        }}
                    >
                        {product.image ? (
                            <img
                                src={product.image}
                                alt={displayName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <span style={{ fontSize: '6rem', opacity: 0.4 }}>🛍️</span>
                        )}
                    </div>

                    {/* Info */}
                    <div style={{ animation: 'fadeInUp 0.5s ease 0.1s both' }}>
                        <div className="badge badge-primary" style={{ marginBottom: '0.75rem' }}>
                            {product.category}
                        </div>
                        <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, fontFamily: 'Outfit, sans-serif', lineHeight: 1.2, marginBottom: '1rem' }}>
                            {displayName}
                        </h1>

                        {/* Price */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div
                                style={{
                                    fontSize: '2.5rem',
                                    fontWeight: 900,
                                    fontFamily: 'Outfit, sans-serif',
                                    background: 'var(--gradient-primary)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                ₹{product.price.toLocaleString('en-IN')}
                            </div>
                        </div>

                        {/* Stock */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <span className={`badge ${isInStock ? 'badge-success' : 'badge-danger'}`}>
                                {isInStock ? `✓ In Stock (${product.stock} left)` : '✕ Out of Stock'}
                            </span>
                        </div>

                        {/* Description */}
                        <div
                            style={{
                                padding: '1.25rem',
                                background: 'var(--glass-bg)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                marginBottom: '2rem',
                            }}
                        >
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                Description
                            </div>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                                {product.description}
                            </p>
                        </div>

                        {/* Details */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '0.75rem',
                                marginBottom: '2rem',
                            }}
                        >
                            {[
                                { label: 'Category', value: product.category },
                                { label: 'Stock', value: product.stock?.toString() || '0' },
                                { label: 'Seller', value: (product.createdBy as { firstname?: string })?.firstname || 'ShopVault' },
                                { label: 'Added', value: product.createdAt ? new Date(product.createdAt).toLocaleDateString('en-IN') : 'N/A' },
                            ].map(item => (
                                <div
                                    key={item.label}
                                    style={{
                                        padding: '0.875rem',
                                        background: 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '10px',
                                    }}
                                >
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                        {item.label}
                                    </div>
                                    <div style={{ fontWeight: 600, marginTop: '0.25rem', fontSize: '0.9rem' }}>
                                        {item.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button
                                id="product-buy"
                                className="btn btn-primary btn-lg"
                                disabled={!isInStock}
                                onClick={() => toast.success('Added to cart! (Cart coming soon)')}
                                style={{ flex: 1 }}
                            >
                                🛒 {isInStock ? 'Add to Cart' : 'Out of Stock'}
                            </button>
                            {isAdmin && (
                                <>
                                    <Link href={`/admin/products/edit/${product._id}`} className="btn btn-secondary btn-lg">
                                        ✏️ Edit
                                    </Link>
                                    <button
                                        className="btn btn-danger btn-lg"
                                        onClick={handleDelete}
                                        disabled={deleting}
                                    >
                                        {deleting ? <span className="spinner" /> : '🗑'}
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Security badges */}
                        <div
                            style={{
                                display: 'flex',
                                gap: '0.75rem',
                                marginTop: '1.5rem',
                                flexWrap: 'wrap',
                            }}
                        >
                            {['🔒 Secure Payment', '📦 Fast Delivery', '✅ Verified Seller'].map(item => (
                                <div
                                    key={item}
                                    style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-muted)',
                                        padding: '0.375rem 0.75rem',
                                        background: 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: 'var(--radius-full)',
                                        fontWeight: 500,
                                    }}
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Back */}
                <div style={{ marginTop: '3rem' }}>
                    <Link href="/shop" className="btn btn-secondary">
                        ← Back to Shop
                    </Link>
                </div>
            </div>
        </div>
    );
}
