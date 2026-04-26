'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { oauthService } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const router = useRouter();
    const { login, isLoggedIn } = useAuth();

    const [form, setForm] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    useEffect(() => {
        if (isLoggedIn) router.push('/');
    }, [isLoggedIn, router]);

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.email) errs.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
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
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }

        setLoading(true);
        try {
            const res = await login(form.email, form.password);

            // ── 2FA required ──────────────────────────────────
            if (res.requires2FA && res.tempToken) {
                toast('2FA required — enter your authenticator code.', { icon: '🛡️' });
                router.push(`/verify-2fa?tempToken=${res.tempToken}`);
                return;
            }

            // ── OAuth-only account ────────────────────────────
            if (res.useGoogle) {
                toast.error(res.message || 'Please sign in with Google.', { duration: 4000 });
                setErrors({ general: res.message || 'Use Google Sign-In for this account.' });
                return;
            }

            if (res.success) {
                toast.success(res.message || 'Welcome back!');
                if (res.needsVerification) {
                    localStorage.setItem('pendingVerifyEmail', form.email);
                    toast('Please verify your email to access all features.', { icon: '⚠️' });
                    router.push('/verify-otp');
                } else {
                    router.push('/shop');
                }
            } else {
                setErrors({ general: res.message });
                toast.error(res.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        setGoogleLoading(true);
        oauthService.loginWithGoogle();
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-icon">🔑</div>
                    <h1 className="auth-title">Welcome Back</h1>
                    <p className="auth-subtitle">Sign in to your ShopVault account</p>
                </div>

                {/* Google OAuth Button */}
                <button
                    id="google-login-btn"
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading || loading}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1.5rem',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--glass-border)',
                        background: googleLoading ? 'var(--glass-bg)' : 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: googleLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 250ms',
                        marginBottom: '1.25rem',
                        opacity: googleLoading ? 0.7 : 1,
                    }}
                    onMouseEnter={e => { if (!googleLoading) e.currentTarget.style.background = 'var(--glass-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = googleLoading ? 'var(--glass-bg)' : 'var(--bg-elevated)'; }}
                >
                    {googleLoading ? (
                        <span className="spinner" />
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                    )}
                    {googleLoading ? 'Redirecting...' : 'Continue with Google'}
                </button>

                <div className="auth-divider">or sign in with email</div>

                {errors.general && (
                    <div className="alert alert-error mb-4">
                        <span>⚠</span> {errors.general}
                    </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    {/* Email */}
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <div className="form-input-wrapper">
                            <span className="form-input-icon">✉</span>
                            <input
                                id="login-email"
                                type="email"
                                name="email"
                                className={`form-input ${errors.email ? 'error' : ''}`}
                                placeholder="your@email.com"
                                value={form.email}
                                onChange={handleChange}
                                autoComplete="email"
                            />
                        </div>
                        {errors.email && <span className="form-error">⚠ {errors.email}</span>}
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <div className="flex justify-between items-center">
                            <label className="form-label">Password</label>
                            <Link href="/forgot-password" className="auth-link text-xs">Forgot password?</Link>
                        </div>
                        <div className="form-input-wrapper">
                            <span className="form-input-icon">🔒</span>
                            <input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                className={`form-input ${errors.password ? 'error' : ''}`}
                                placeholder="Enter your password"
                                value={form.password}
                                onChange={handleChange}
                                autoComplete="current-password"
                                style={{ paddingRight: '2.75rem' }}
                            />
                            <button
                                type="button"
                                className="form-input-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? '🙈' : '👁'}
                            </button>
                        </div>
                        {errors.password && <span className="form-error">⚠ {errors.password}</span>}
                    </div>

                    <button
                        id="login-submit"
                        type="submit"
                        className={`btn btn-primary w-full btn-lg ${loading ? 'btn-loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? <><span className="spinner" />Signing In...</> : 'Sign In'}
                    </button>
                </form>

                {/* 2FA hint */}
                <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(108,99,255,0.06)',
                    border: '1px solid rgba(108,99,255,0.15)',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                }}>
                    🛡️ <span>If you have 2FA enabled, you&apos;ll be asked for your authenticator code after sign in.</span>
                </div>

                <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="auth-link">Create one free</Link>
                </div>
            </div>
        </div>
    );
}
