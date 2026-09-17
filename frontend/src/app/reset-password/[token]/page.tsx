'use client';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authService } from '@/lib/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';

function getPasswordStrength(password: string) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-[var(--primary)]', 'bg-[var(--primary)]'];
    return {
        score: Math.min(score, 4),
        label: labels[score] || 'Weak',
        color: colors[Math.min(score, 4)] || 'bg-[var(--border)]'
    };
}

export default function ResetPasswordPage() {
    const router = useRouter();
    const params = useParams();
    const token = params?.token as string;

    const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.newPassword) errs.newPassword = 'New password is required';
        else if (form.newPassword.length < 8) errs.newPassword = 'Minimum 8 characters required';
        else if (!/[A-Z]/.test(form.newPassword)) errs.newPassword = 'Include at least one uppercase letter';
        else if (!/[0-9]/.test(form.newPassword)) errs.newPassword = 'Include at least one number';
        else if (!/[^A-Za-z0-9]/.test(form.newPassword)) errs.newPassword = 'Include at least one special character';
        if (!form.confirmPassword) errs.confirmPassword = 'Confirm your password';
        else if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
        return errs;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);
        try {
            const res = await authService.resetPassword({
                token,
                newPassword: form.newPassword,
                confirmPassword: form.confirmPassword,
            });
            if (res.success) {
                setSuccess(true);
                toast.success('Password updated successfully!');
                setTimeout(() => router.push('/login'), 2500);
            } else {
                setErrors({ general: res.message });
                toast.error(res.message);
            }
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            const msg = axiosError?.response?.data?.message || 'Password reset failed';
            setErrors({ general: msg });
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const strength = getPasswordStrength(form.newPassword);

    if (!token) {
        return (
            <div className="min-h-[calc(100vh-var(--navbar-h))] flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-md text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 grid place-items-center mx-auto text-2xl">
                        ⚠️
                    </div>
                    <h2 className="heading-2 text-[var(--foreground)]">Invalid or Expired Link</h2>
                    <p className="body-sm text-[var(--foreground-muted)]">
                        This reset token is invalid or has expired. Please request a new link.
                    </p>
                    <div className="pt-2">
                        <Link href="/forgot-password" className="btn btn--primary w-full justify-center">
                            Request New Link
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-[calc(100vh-var(--navbar-h))] flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-md text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 grid place-items-center mx-auto text-2xl">
                        ✓
                    </div>
                    <h2 className="heading-2 text-[var(--foreground)]">Password Updated</h2>
                    <p className="body-sm text-[var(--foreground-muted)]">
                        Your password has been changed successfully. Redirecting to sign in...
                    </p>
                    <div className="pt-2">
                        <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto" />
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
                    <h1 className="heading-2 text-[var(--foreground)]">Set new password</h1>
                    <p className="body-sm text-[var(--foreground-muted)]">
                        Create a secure, fresh password for your account.
                    </p>
                </div>

                {errors.general && (
                    <div className="alert alert--error">
                        <span>{errors.general}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    <div className="field">
                        <label className="field__label" htmlFor="reset-new-password">New password</label>
                        <div className="input-group">
                            <input
                                id="reset-new-password"
                                type={showNew ? 'text' : 'password'}
                                name="newPassword"
                                value={form.newPassword}
                                onChange={handleChange}
                                placeholder="Enter new password"
                                className="input"
                                aria-invalid={!!errors.newPassword}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="input-group__action text-xs font-medium"
                            >
                                {showNew ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        {errors.newPassword && <span className="field__error">{errors.newPassword}</span>}

                        {form.newPassword && (
                            <div className="space-y-1.5 mt-2">
                                <div className="grid grid-cols-4 gap-1 h-1">
                                    {[1, 2, 3, 4].map(idx => (
                                        <div
                                            key={idx}
                                            className={`rounded-full transition-all duration-300 ${
                                                strength.score >= idx ? strength.color : 'bg-[var(--border-subtle)]'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-[11px] text-[var(--foreground-muted)]">
                                    Strength: <strong className="text-[var(--foreground)]">{strength.label}</strong>
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="field">
                        <label className="field__label" htmlFor="reset-confirm-password">Confirm new password</label>
                        <div className="input-group">
                            <input
                                id="reset-confirm-password"
                                type={showConfirm ? 'text' : 'password'}
                                name="confirmPassword"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                placeholder="Repeat new password"
                                className="input"
                                aria-invalid={!!errors.confirmPassword}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="input-group__action text-xs font-medium"
                            >
                                {showConfirm ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        {errors.confirmPassword && <span className="field__error">{errors.confirmPassword}</span>}
                        {form.confirmPassword && !errors.confirmPassword && form.newPassword === form.confirmPassword && (
                            <span className="text-[11px] text-emerald-600 font-medium mt-1 inline-block">
                                ✓ Passwords match
                            </span>
                        )}
                    </div>

                    <button
                        id="reset-submit"
                        type="submit"
                        disabled={loading}
                        className={`btn btn--primary btn--lg w-full justify-center ${loading ? 'btn--loading' : ''}`}
                    >
                        {loading ? 'Updating password...' : 'Update Password'}
                    </button>
                </form>

                <div className="text-center text-xs text-[var(--foreground-muted)] pt-2 border-t border-[var(--border-subtle)]">
                    <Link href="/login" className="text-[var(--primary)] font-medium hover:underline">
                        ← Back to Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
