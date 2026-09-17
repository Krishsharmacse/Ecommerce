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
            <div className="min-h-[calc(100vh-var(--navbar-h))] flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-md text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--surface-sunken)] border border-[var(--border)] grid place-items-center mx-auto text-2xl">
                        ✉️
                    </div>
                    <h2 className="heading-2 text-[var(--foreground)]">Check Your Email</h2>
                    <p className="body-sm text-[var(--foreground-muted)] leading-relaxed">
                        We sent a password reset link to <strong className="text-[var(--foreground)]">{email}</strong>.
                        The link expires in 15 minutes.
                    </p>
                    <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground-muted)]">
                        Tip: Check your spam or promotions folder if you don&apos;t see the message.
                    </div>
                    <div className="pt-2">
                        <Link href="/login" className="btn btn--primary w-full justify-center">
                            Back to Sign in
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-var(--navbar-h))] flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 md:p-10 shadow-md space-y-6">
                {/* Header */}
                <div className="text-center space-y-1.5">
                    <div className="w-10 h-10 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)] grid place-items-center mx-auto mb-3 text-lg">
                        🔐
                    </div>
                    <h1 className="heading-2 text-[var(--foreground)]">Reset your password</h1>
                    <p className="body-sm text-[var(--foreground-muted)]">
                        Enter your email address and we&apos;ll send you instructions to reset your password.
                    </p>
                </div>

                {error && (
                    <div className="alert alert--error">
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    <div className="field">
                        <label className="field__label" htmlFor="forgot-email">Email address</label>
                        <input
                            id="forgot-email"
                            type="email"
                            value={email}
                            onChange={e => { setEmail(e.target.value); setError(''); }}
                            placeholder="name@example.com"
                            className="input"
                            autoComplete="email"
                        />
                    </div>

                    <button
                        id="forgot-submit"
                        type="submit"
                        disabled={loading}
                        className={`btn btn--primary btn--lg w-full justify-center ${loading ? 'btn--loading' : ''}`}
                    >
                        {loading ? 'Sending link...' : 'Send Reset Link'}
                    </button>
                </form>

                <div className="text-center text-xs text-[var(--foreground-muted)] pt-2 border-t border-[var(--border-subtle)]">
                    Remember your credentials?{' '}
                    <Link href="/login" className="text-[var(--primary)] font-medium hover:underline">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
