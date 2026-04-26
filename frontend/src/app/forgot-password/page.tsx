'use client';
import { useState } from 'react';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email) { setError('Email is required'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address'); return; }

        setLoading(true);
        try {
            const res = await authService.forgotPassword(email);
            if (res.success) {
                setSent(true);
                toast.success('Password reset link sent!');
            } else {
                setError(res.message);
                toast.error(res.message);
            }
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            const msg = axiosError?.response?.data?.message || 'Failed to send reset email';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'float 2s ease-in-out infinite' }}>📧</div>
                    <h2 className="auth-title">Check Your Email</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.7 }}>
                        We sent a password reset link to{' '}
                        <strong style={{ color: 'var(--primary-light)' }}>{email}</strong>.
                        The link expires in <strong>15 minutes</strong>.
                    </p>
                    <div
                        style={{
                            margin: '1.5rem 0',
                            padding: '1rem',
                            background: 'rgba(108,99,255,0.08)',
                            border: '1px solid rgba(108,99,255,0.2)',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            color: 'var(--text-muted)',
                        }}
                    >
                        💡 Tip: Check your spam folder if you don&apos;t see it.
                    </div>
                    <Link href="/login" className="btn btn-primary w-full">
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-icon">🔐</div>
                    <h1 className="auth-title">Forgot Password</h1>
                    <p className="auth-subtitle">Enter your email to receive a reset link</p>
                </div>

                {error && <div className="alert alert-error mb-4">⚠ {error}</div>}

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <div className="form-input-wrapper">
                            <span className="form-input-icon">✉</span>
                            <input
                                id="forgot-email"
                                type="email"
                                className={`form-input ${error ? 'error' : ''}`}
                                placeholder="your@email.com"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setError(''); }}
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <button
                        id="forgot-submit"
                        type="submit"
                        className={`btn btn-primary w-full btn-lg ${loading ? 'btn-loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <><span className="spinner" /> Sending Link...</>
                        ) : (
                            'Send Reset Link'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    Remember your password?{' '}
                    <Link href="/login" className="auth-link">
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
