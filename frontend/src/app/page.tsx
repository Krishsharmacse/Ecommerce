'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { productService, Product } from '@/lib/products';
import ProductCard from '@/components/ProductCard';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService.getAll()
      .then(data => setProducts(data.slice(0, 8)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-bg-orb hero-bg-orb-1" />
          <div className="hero-bg-orb hero-bg-orb-2" />
          <div className="hero-bg-grid" />
        </div>
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-dot" />
              Secure & Premium E-Commerce
            </div>
            <h1 className="heading-xl hero-title">
              Shop the Future,{' '}
              <span className="text-gradient">Delivered Today</span>
            </h1>
            <p className="hero-description">
              Discover an exclusive collection of premium products. Every purchase is secured
              with industry-leading encryption, email verification, and JWT authentication.
            </p>
            <div className="hero-actions">
              <Link href="/shop" className="btn btn-primary btn-xl">
                🛍 Browse Products
              </Link>
              <Link href="/register" className="btn btn-secondary btn-xl">
                Get Started Free
              </Link>
            </div>
            <div className="hero-stats">
              <div>
                <div className="hero-stat-value text-gradient">500+</div>
                <div className="hero-stat-label">Products</div>
              </div>
              <div>
                <div className="hero-stat-value text-gradient">10K+</div>
                <div className="hero-stat-label">Customers</div>
              </div>
              <div>
                <div className="hero-stat-value text-gradient">100%</div>
                <div className="hero-stat-label">Secure</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="section" style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--glass-border)' }}>
        <div className="container">
          <div className="section-header">
            <div className="section-tag">✨ Featured</div>
            <h2 className="section-title">
              Latest <span className="text-gradient">Products</span>
            </h2>
            <p className="section-subtitle">
              Handpicked selections from our premium catalog, updated regularly.
            </p>
          </div>

          {loading ? (
            <div className="products-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="card" style={{ height: '360px' }}>
                  <div className="skeleton" style={{ height: '220px', borderRadius: '0' }} />
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="skeleton" style={{ height: '12px', width: '60%' }} />
                    <div className="skeleton" style={{ height: '16px', width: '80%' }} />
                    <div className="skeleton" style={{ height: '12px', width: '90%' }} />
                    <div className="skeleton" style={{ height: '12px', width: '70%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="products-grid">
                {products.map((product, i) => (
                  <ProductCard key={product._id} product={product} index={i} />
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                <Link href="/shop" className="btn btn-primary btn-lg">
                  View All Products →
                </Link>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🛒</div>
              <div className="empty-title">No products yet</div>
              <div className="empty-description">
                Products will appear here once added by the admin.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="section">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <div className="section-tag">🔒 Why ShopVault</div>
            <h2 className="section-title">
              Built for Security &amp; <span className="text-gradient">Excellence</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {[
              {
                icon: '🔐',
                title: 'End-to-End Security',
                desc: 'JWT authentication, bcrypt password hashing, and session management keep your account safe.',
              },
              {
                icon: '✉️',
                title: 'Email Verification',
                desc: 'Every account is verified via OTP email, preventing unauthorized access.',
              },
              {
                icon: '🛡️',
                title: 'Role-Based Access',
                desc: 'Strict admin and user roles ensure only authorized users can manage products.',
              },
              {
                icon: '⚡',
                title: 'Lightning Fast',
                desc: 'Built on Next.js 15 with optimized rendering for blazing-fast page loads.',
              },
              {
                icon: '🔑',
                title: 'Forgot Password',
                desc: 'Secure password reset via time-limited email links with SHA-256 hashing.',
              },
              {
                icon: '📦',
                title: 'Real-time Inventory',
                desc: 'Always accurate stock levels managed directly by admins in real time.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="card-glass"
                style={{
                  padding: '1.75rem',
                  animation: `fadeInUp 0.5s ease ${i * 0.1}s both`,
                }}
              >
                <div
                  style={{
                    fontSize: '2rem',
                    marginBottom: '1rem',
                    display: 'inline-block',
                    animation: 'float 4s ease-in-out infinite',
                    animationDelay: `${i * 0.5}s`,
                  }}
                >
                  {feature.icon}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section
        style={{
          padding: '5rem 0',
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--glass-border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(108,99,255,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div className="section-tag">🚀 Get Started</div>
          <h2 className="section-title">
            Ready to start <span className="text-gradient">shopping?</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 2rem', fontSize: '1rem' }}>
            Join thousands of happy customers. Create your free account in seconds.
          </p>
          <div className="flex gap-4 justify-center" style={{ flexWrap: 'wrap' }}>
            <Link href="/register" className="btn btn-primary btn-xl">
              Create Free Account
            </Link>
            <Link href="/shop" className="btn btn-secondary btn-xl">
              Browse Products
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '2rem',
              marginBottom: '3rem',
            }}
          >
            <div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.75rem' }}>
                <span className="text-gradient">⚡ ShopVault</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Premium e-commerce with best-in-class security. Verified, encrypted, trusted.
              </p>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>Quick Links</div>
              {[['Home', '/'], ['Shop', '/shop'], ['Login', '/login'], ['Register', '/register']].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem', transition: 'color 250ms' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  {label}
                </Link>
              ))}
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>Security</div>
              {['JWT Authentication', 'Bcrypt Encryption', 'Email Verification', 'OTP Based Login'].map(item => (
                <div key={item} style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  ✓ {item}
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--glass-border)',
              paddingTop: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              © 2024 ShopVault. Built with ❤️ by Krish Sharma.
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              🔒 256-bit SSL Secured
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
