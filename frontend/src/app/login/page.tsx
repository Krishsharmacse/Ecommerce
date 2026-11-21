'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { oauthService } from '@/lib/auth';
import toast from 'react-hot-toast';
import { Lock, Shield, Zap, CreditCard, Sparkles, KeyRound, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { login, isLoggedIn } = useAuth();

    const [form, setForm] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const isSubmittingRef = useRef(false);

    // Initial check: if already logged in on mount, redirect to intended target
    useEffect(() => {
        if (isLoggedIn && !isSubmittingRef.current) {
            const redirectParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null;
            const destination = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
                ? redirectParam
                : '/';
            router.replace(destination);
        }
    }, [isLoggedIn, router]);

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.email.trim()) errs.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email address';
        if (!form.password) errs.password = 'Password is required';
        return errs;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        if (errors.general) setErrors(prev => ({ ...prev, general: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading || isSubmittingRef.current) return;

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);
        isSubmittingRef.current = true;
        try {
            const res = await login(form.email.trim(), form.password);

            if (res.requires2FA && res.tempToken) {
                toast.success('Two-factor code required');
                router.push(`/verify-2fa?tempToken=${encodeURIComponent(res.tempToken)}`);
                return;
            }

            if (res.useGoogle) {
                toast.error(res.message || 'Please sign in with Google.', { duration: 4000 });
                setErrors({ general: res.message || 'Please use Google Sign-In for this account.' });
                isSubmittingRef.current = false;
                return;
            }

            if (res.success) {
                toast.success(res.message || 'Welcome back!');
                if (res.needsVerification) {
                    localStorage.setItem('pendingVerifyEmail', form.email.trim());
                    toast.success('Please verify your email address');
                    router.push('/verify-otp');
                } else {
                    const redirectParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null;
                    let destination = '/';
                    if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
                        destination = redirectParam;
                    } else {
                        const userRole = (res.user?.role || '').toLowerCase();
                        if (userRole === 'admin' || userRole === 'owner') {
                            destination = '/dashboard/admin';
                        } else if (userRole === 'vendor' || userRole === 'manager') {
                            destination = '/dashboard/vendor';
                        } else {
                            destination = '/dashboard/customer';
                        }
                    }
                    router.replace(destination);
                }
            } else {
                setErrors({ general: res.message || 'Invalid credentials' });
                toast.error(res.message || 'Sign-in failed');
                isSubmittingRef.current = false;
            }
        } catch {
            setErrors({ general: 'Network error or service unavailable. Please try again.' });
            toast.error('Unable to sign in');
            isSubmittingRef.current = false;
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        setGoogleLoading(true);
        oauthService.loginWithGoogle();
    };

    return (
           <div style={{ minHeight: 'calc(100vh - var(--navbar-h))', display: 'grid', gridTemplateColumns: '1fr', background: 'var(--background)' }}
               className="auth-layout lg:grid-cols-[1fr_1fr]">

            {/* ── Left Decorative Panel ── */}
            <div className="hidden lg:flex" style={{
                position: 'relative',
                overflow: 'hidden',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '3rem',
                background: 'linear-gradient(135deg, #0a0a1a 0%, #0d0d22 40%, #0a0a18 100%)',
            }}>
                {/* Dot-grid background */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                    pointerEvents: 'none',
                }} />

                {/* Animated glow blobs */}
                <div style={{
                    position: 'absolute',
                    width: '500px', height: '500px',
                    bottom: '-120px', left: '-100px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at center, rgba(59,130,246,0.22) 0%, rgba(99,102,241,0.12) 40%, transparent 70%)',
                    filter: 'blur(40px)',
                    pointerEvents: 'none',
                    animation: 'loginGlowPulse 8s ease-in-out infinite',
                }} />
                <div style={{
                    position: 'absolute',
                    width: '380px', height: '380px',
                    top: '-80px', right: '-60px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at center, rgba(139,92,246,0.2) 0%, rgba(59,130,246,0.1) 40%, transparent 70%)',
                    filter: 'blur(50px)',
                    pointerEvents: 'none',
                    animation: 'loginGlowPulse 10s ease-in-out infinite reverse',
                }} />
                <div style={{
                    position: 'absolute',
                    width: '240px', height: '240px',
                    top: '45%', left: '55%',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at center, rgba(168,85,247,0.15) 0%, transparent 70%)',
                    filter: 'blur(30px)',
                    pointerEvents: 'none',
                }} />

                {/* Brand Logo */}
                <div style={{ position: 'relative', zIndex: 10 }}>
                    <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
                        <span style={{
                            width: '36px', height: '36px',
                            borderRadius: '10px',
                            display: 'grid', placeItems: 'center',
                            fontWeight: 800, color: '#fff',
                            fontSize: '0.9rem',
                            background: 'linear-gradient(135deg, var(--accent-500), var(--accent-600))',
                            boxShadow: '0 0 20px rgba(59,130,246,0.5), 0 0 40px rgba(59,130,246,0.2)',
                        }}>S</span>
                        <span style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            fontSize: '1.1rem',
                            letterSpacing: '-0.02em',
                            color: '#ffffff',
                        }}>SHOPVAULT</span>
                    </Link>
                </div>

                {/* Central visual */}
                <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 0' }}>
                    <div style={{ textAlign: 'center', maxWidth: '360px' }}>
                        {/* Icon cluster */}
                        <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 2rem' }}>
                            <div style={{
                                position: 'absolute', inset: 0,
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
                                animation: 'spin 20s linear infinite',
                            }} />
                            {[
                                { icon: Lock, angle: 0, r: 55 },
                                { icon: Zap, angle: 72, r: 55 },
                                { icon: Shield, angle: 144, r: 55 },
                                { icon: CreditCard, angle: 216, r: 55 },
                                { icon: Sparkles, angle: 288, r: 55 },
                            ].map((item, i) => {
                                const Icon = item.icon;
                                const rad = (item.angle * Math.PI) / 180;
                                const x = 70 + item.r * Math.sin(rad);
                                const y = 70 - item.r * Math.cos(rad);
                                return (
                                    <div key={i} style={{
                                        position: 'absolute',
                                        left: `${x}px`, top: `${y}px`,
                                        transform: 'translate(-50%, -50%)',
                                        width: '36px', height: '36px',
                                        borderRadius: '10px',
                                        display: 'grid', placeItems: 'center',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(8px)',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                                        animation: `loginFloat ${2.5 + i * 0.4}s ease-in-out infinite ${i * 0.3}s`,
                                    }}>
                                        <Icon className="w-4 h-4 text-blue-400" />
                                    </div>
                                );
                            })}
                            <div style={{
                                position: 'absolute', top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '56px', height: '56px',
                                borderRadius: '16px',
                                display: 'grid', placeItems: 'center',
                                background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))',
                                border: '1px solid rgba(59,130,246,0.4)',
                                boxShadow: '0 0 30px rgba(59,130,246,0.3)',
                            }}>
                                <KeyRound className="w-6 h-6 text-blue-400" />
                            </div>
                        </div>

                        <h2 style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            fontSize: '1.5rem',
                            letterSpacing: '-0.02em',
                            color: '#ffffff',
                            marginBottom: '0.75rem',
                            lineHeight: 1.2,
                        }}>Secure access to your workspace</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                            Protected by enterprise-grade encryption, 2FA, and real-time threat detection.
                        </p>
                    </div>
                </div>

                {/* Testimonial + Feature Cards */}
                <div style={{ position: 'relative', zIndex: 10 }}>
                    {/* Quote */}
                    <div style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '16px',
                        padding: '1.25rem',
                        marginBottom: '1rem',
                        backdropFilter: 'blur(10px)',
                    }}>
                        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', fontStyle: 'italic', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                            &ldquo;The most secure multi-vendor platform I&apos;ve used. Escrow protection gives real peace of mind.&rdquo;
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--accent-500), var(--accent-700))',
                                display: 'grid', placeItems: 'center',
                                fontWeight: 700, fontSize: '0.75rem', color: '#fff',
                            }}>R</div>
                            <div>
                                <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>Rahul Sharma</div>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Verified Merchant · 3yr+</div>
                            </div>
                            <div style={{ marginLeft: 'auto', color: '#f59e0b', fontSize: '0.75rem', letterSpacing: '0.1em' }}>★★★★★</div>
                        </div>
                    </div>

                    {/* Feature pills */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {[
                            { icon: Lock, label: 'Escrow Protected' },
                            { icon: ShieldCheck, label: '2FA Security' },
                            { icon: Zap, label: '48hr Delivery' },
                            { icon: Sparkles, label: 'Zero Hidden Fees' },
                        ].map((f) => {
                            const Icon = f.icon;
                            return (
                                <div key={f.label} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.6rem 0.75rem',
                                    borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    backdropFilter: 'blur(8px)',
                                }}>
                                    <Icon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                    <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>{f.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Right: Auth Form ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '2rem 1.5rem',
                background: 'var(--background)',
            }}>
                <div style={{ width: '100%', maxWidth: '440px' }} className="animate-fade-up">

                    {/* Mobile brand */}
                    <Link href="/" className="lg:hidden" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        marginBottom: '1.5rem', textDecoration: 'none',
                    }}>
                        <span style={{
                            width: '28px', height: '28px', borderRadius: '8px',
                            display: 'grid', placeItems: 'center',
                            fontWeight: 800, color: '#fff', fontSize: '0.75rem',
                            background: 'linear-gradient(135deg, var(--accent-500), var(--accent-600))',
                        }}>S</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', color: 'var(--foreground)' }}>SHOPVAULT</span>
                    </Link>

                    {/* Header */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h1 style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
                            letterSpacing: '-0.03em',
                            color: 'var(--foreground)',
                            lineHeight: 1.1,
                            marginBottom: '0.5rem',
                        }}>Welcome back</h1>
                        <p style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>
                            Sign in to your ShopVault account
                        </p>
                    </div>

                    {/* Google */}
                    <button
                        id="google-login-btn"
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={googleLoading || loading}
                        style={{
                            width: '100%', height: '46px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
                            borderRadius: '12px',
                            border: '1px solid var(--border-strong)',
                            background: 'var(--surface)',
                            color: 'var(--foreground)',
                            fontWeight: 600, fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            marginBottom: '1.25rem',
                            opacity: googleLoading || loading ? 0.6 : 1,
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = 'var(--surface-elevated)';
                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>{googleLoading ? 'Connecting...' : 'Continue with Google'}</span>
                    </button>

                    {/* Divider */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        marginBottom: '1.25rem',
                    }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                        <span style={{ color: 'var(--foreground-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>or sign in with email</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    </div>

                    {/* Error */}
                    {errors.general && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.625rem',
                            padding: '0.75rem 1rem',
                            borderRadius: '10px',
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            color: '#f87171',
                            fontSize: '0.875rem',
                            marginBottom: '1.25rem',
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span>{errors.general}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Email */}
                        <div>
                            <label htmlFor="login-email" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-secondary)', marginBottom: '0.4rem' }}>
                                Email address
                            </label>
                            <input
                                id="login-email"
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="name@example.com"
                                autoComplete="email"
                                aria-invalid={!!errors.email}
                                style={{
                                    width: '100%', height: '44px',
                                    padding: '0 0.875rem',
                                    borderRadius: '10px',
                                    border: `1px solid ${errors.email ? 'rgba(239,68,68,0.5)' : 'var(--border-strong)'}`,
                                    background: 'var(--surface)',
                                    color: 'var(--foreground)',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    transition: 'border-color 0.15s, box-shadow 0.15s',
                                }}
                                onFocus={e => {
                                    e.currentTarget.style.borderColor = 'var(--accent-500)';
                                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
                                }}
                                onBlur={e => {
                                    e.currentTarget.style.borderColor = errors.email ? 'rgba(239,68,68,0.5)' : 'var(--border-strong)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                            {errors.email && <span style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.3rem', display: 'block' }}>{errors.email}</span>}
                        </div>

                        {/* Password */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                <label htmlFor="login-password" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-secondary)' }}>
                                    Password
                                </label>
                                <Link href="/forgot-password" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-400)', textDecoration: 'none' }}>
                                    Forgot password?
                                </Link>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    aria-invalid={!!errors.password}
                                    style={{
                                        width: '100%', height: '44px',
                                        padding: '0 3rem 0 0.875rem',
                                        borderRadius: '10px',
                                        border: `1px solid ${errors.password ? 'rgba(239,68,68,0.5)' : 'var(--border-strong)'}`,
                                        background: 'var(--surface)',
                                        color: 'var(--foreground)',
                                        fontSize: '0.875rem',
                                        outline: 'none',
                                        transition: 'border-color 0.15s, box-shadow 0.15s',
                                    }}
                                    onFocus={e => {
                                        e.currentTarget.style.borderColor = 'var(--accent-500)';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
                                    }}
                                    onBlur={e => {
                                        e.currentTarget.style.borderColor = errors.password ? 'rgba(239,68,68,0.5)' : 'var(--border-strong)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: '0.75rem', top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--foreground-muted)',
                                        fontSize: '0.72rem', fontWeight: 600,
                                        letterSpacing: '0.04em',
                                        background: 'none', border: 'none',
                                        cursor: 'pointer',
                                    }}
                                >{showPassword ? 'Hide' : 'Show'}</button>
                            </div>
                            {errors.password && <span style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.3rem', display: 'block' }}>{errors.password}</span>}
                        </div>

                        <button
                            type="submit"
                            id="login-submit"
                            disabled={loading}
                            style={{
                                width: '100%', height: '46px',
                                borderRadius: '12px',
                                background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, var(--accent-500), var(--accent-600))',
                                color: '#fff', fontWeight: 700,
                                fontSize: '0.9rem',
                                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: loading ? 'none' : '0 4px 20px rgba(59,130,246,0.35)',
                                transition: 'all 0.15s ease',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                marginTop: '0.25rem',
                            }}
                            onMouseEnter={e => {
                                if (!loading) {
                                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                                    (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(59,130,246,0.45)';
                                }
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                (e.currentTarget as HTMLElement).style.boxShadow = loading ? 'none' : '0 4px 20px rgba(59,130,246,0.35)';
                            }}
                        >
                            {loading ? (
                                <>
                                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
                                    Signing in...
                                </>
                            ) : 'Sign in to ShopVault'}
                        </button>
                    </form>

                    {/* Quick Demo Credentials for Instant Testing */}
                    <div style={{ marginTop: '1.25rem', padding: '0.875rem', borderRadius: '12px', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                            Quick Fill Test Accounts (1-Click)
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => setForm({ email: 'customer@shopvault.local', password: 'ChangeMe123!' })}
                                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--foreground)', cursor: 'pointer' }}
                            >
                                👤 Customer
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm({ email: 'vendor@shopvault.local', password: 'ChangeMe123!' })}
                                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--foreground)', cursor: 'pointer' }}
                            >
                                🏪 Vendor
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm({ email: 'admin@shopvault.local', password: 'ChangeMe123!' })}
                                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--foreground)', cursor: 'pointer' }}
                            >
                                👑 Admin
                            </button>
                        </div>
                    </div>

                    <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                        Don&apos;t have an account?{' '}
                        <Link href="/register" style={{ color: 'var(--accent-400)', fontWeight: 600, textDecoration: 'none' }}>
                            Create one free
                        </Link>
                    </p>
                </div>
            </div>

            <style jsx global>{`
                @keyframes loginGlowPulse {
                    0%, 100% { opacity: 0.7; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.08); }
                }
                @keyframes loginFloat {
                    0%, 100% { transform: translate(-50%, -50%) translateY(0); }
                    50% { transform: translate(-50%, -50%) translateY(-6px); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes fade-up {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-up {
                    animation: fade-up 0.45s var(--ease-out, cubic-bezier(0.16,1,0.3,1)) both;
                }
            `}</style>
        </div>
    );
}
