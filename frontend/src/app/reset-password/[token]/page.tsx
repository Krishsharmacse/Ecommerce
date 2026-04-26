'use client';
import { useState, useEffect } from 'react';
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
    const classes = ['', 'weak', 'fair', 'good', 'strong', 'strong'];
    return { score, label: labels[score] || 'Weak', class: classes[score] || 'weak' };
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
        if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password';
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
                toast.success('Password reset successfully!');
                setTimeout(() => router.push('/login'), 3000);
            } else {
                setErrors({ general: res.message });
                toast.error(res.message);
            }
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            const msg = axiosError?.response?.data?.message || 'Reset failed';
            setErrors({ general: msg });
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const strength = getPasswordStrength(form.newPassword);

    if (!token) {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                    <h2 className="auth-title">Invalid Link</h2>
                    <p className="auth-subtitle">This reset link is invalid or has expired.</p>
                    <Link href="/forgot-password" className="btn btn-primary w-full" style={{ marginTop: '1.5rem' }}>
                        Request New Link
                    </Link>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'float 2s ease-in-out infinite' }}>🎉</div>
                    <h2 className="auth-title">Password Reset!</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Your password has been updated. Redirecting to login...
                    </p>
                    <div className="spinner spinner-primary spinner-lg" style={{ margin: '1.5rem auto 0' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-icon">🔐</div>
                    <h1 className="auth-title">Reset Password</h1>
                    <p className="auth-subtitle">Create a new secure password</p>
                </div>

                {errors.general && <div className="alert alert-error mb-4">⚠ {errors.general}</div>}

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                        <label className="form-label">New Password</label>
                        <div className="form-input-wrapper">
                            <span className="form-input-icon">🔒</span>
                            <input
                                id="reset-new-password"
                                type={showNew ? 'text' : 'password'}
                                name="newPassword"
                                className={`form-input ${errors.newPassword ? 'error' : ''}`}
                                placeholder="Enter new password"
                                value={form.newPassword}
                                onChange={handleChange}
                                autoComplete="new-password"
                                style={{ paddingRight: '2.75rem' }}
                            />
                            <button type="button" className="form-input-toggle" onClick={() => setShowNew(!showNew)} tabIndex={-1}>
                                {showNew ? '🙈' : '👁'}
                            </button>
                        </div>
                        {errors.newPassword && <span className="form-error">⚠ {errors.newPassword}</span>}
                        {form.newPassword && (
                            <div className="password-strength">
                                <div className="password-strength-bars">
                                    {[1, 2, 3, 4].map(l => (
                                        <div key={l} className={`strength-bar ${strength.score >= l ? strength.class : ''}`} />
                                    ))}
                                </div>
                                <span className={`text-sm strength-label-${strength.class}`}>
                                    Strength: <strong>{strength.label}</strong>
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirm New Password</label>
                        <div className="form-input-wrapper">
                            <span className="form-input-icon">🔒</span>
                            <input
                                id="reset-confirm-password"
                                type={showConfirm ? 'text' : 'password'}
                                name="confirmPassword"
                                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                                placeholder="Repeat new password"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                autoComplete="new-password"
                                style={{ paddingRight: '2.75rem' }}
                            />
                            <button type="button" className="form-input-toggle" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                                {showConfirm ? '🙈' : '👁'}
                            </button>
                        </div>
                        {errors.confirmPassword && <span className="form-error">⚠ {errors.confirmPassword}</span>}
                        {form.confirmPassword && !errors.confirmPassword && form.newPassword === form.confirmPassword && (
                            <span className="form-error" style={{ color: 'var(--success)' }}>✓ Passwords match</span>
                        )}
                    </div>

                    <button
                        id="reset-submit"
                        type="submit"
                        className={`btn btn-primary w-full btn-lg ${loading ? 'btn-loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? (<><span className="spinner" /> Resetting...</>) : 'Reset Password'}
                    </button>
                </form>

                <div className="auth-footer">
                    <Link href="/login" className="auth-link">← Back to Login</Link>
                </div>
            </div>
        </div>
    );
}
