'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { oauthService } from '@/lib/auth';
import toast from 'react-hot-toast';

const REQUIREMENTS = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
    { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(p: string) {
    const s = REQUIREMENTS.filter(r => r.test(p)).length;
    return { score: s, label: ['', 'Weak', 'Fair', 'Good', 'Strong'][s], cls: ['', 'weak', 'fair', 'good', 'strong'][s] };
}

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useAuth();
    const [role, setRole] = useState<'user' | 'shopkeeper' | 'manager'>('user');
    const [form, setForm] = useState({ firstname: '', lastname: '', email: '', password: '', confirmPassword: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPw, setShowPw] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const handleGoogleRegister = () => {
        setGoogleLoading(true);
        oauthService.loginWithGoogle();
    };

    const strength = getStrength(form.password);

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.firstname.trim()) errs.firstname = 'First name required';
        if (!form.lastname.trim()) errs.lastname = 'Last name required';
        if (!form.email) errs.email = 'Email required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
        if (!form.password) errs.password = 'Password required';
        else if (!REQUIREMENTS.every(r => r.test(form.password))) errs.password = 'Password does not meet requirements';
        if (!form.confirmPassword) errs.confirmPassword = 'Confirm your password';
        else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
        return errs;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setLoading(true);
        try {
            const res = await register({ ...form, role });
            if (res.success) {
                localStorage.setItem('pendingVerifyEmail', form.email);
                setDone(true);
                toast.success('Account created! Check your email for the OTP.');
                setTimeout(() => router.push('/verify-otp'), 2000);
            } else {
                toast.error(res.message);
                if (res.message.toLowerCase().includes('email')) setErrors({ email: res.message });
            }
        } catch (err) {
            toast.error('Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(f => ({ ...f, [k]: e.target.value }));
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    };

    if (done) {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'floatSlow 4s ease-in-out infinite' }}>🎉</div>
                    <h2 className="auth-title">Account Created!</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '.5rem', lineHeight: 1.7 }}>
                        We sent a 6-digit OTP to <strong style={{ color: 'var(--primary-light)' }}>{form.email}</strong>. Redirecting to verification...
                    </p>
                    <div className="spinner spinner-primary spinner-lg" style={{ margin: '1.5rem auto 0' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div className="auth-icon">✨</div>
                    <h1 className="auth-title">Create Account</h1>
                    <p className="auth-subtitle">Join ShopVault and start your journey</p>
                </div>

                {/* Google OAuth Button */}
                <button
                    id="google-register-btn"
                    type="button"
                    onClick={handleGoogleRegister}
                    disabled={googleLoading}
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

                <div className="auth-divider">or register with email</div>

                {/* Role Selector */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div className="form-label" style={{ marginBottom: '.625rem' }}>I want to join as</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.625rem' }}>
                        <div className={`role-option${role === 'user' ? ' selected user' : ''}`} onClick={() => setRole('user')}>
                            <div className="role-option-icon">🛍️</div>
                            <div className="role-option-title">Shopper</div>
                            <div className="role-option-desc">Browse & buy products</div>
                        </div>
                        <div className={`role-option${role === 'shopkeeper' ? ' selected' : ''}`}
                            onClick={() => setRole('shopkeeper')}
                            style={role === 'shopkeeper' ? { borderColor: '#f59e0b', background: 'rgba(245,158,11,.08)' } : {}}>
                            <div className="role-option-icon">🛒</div>
                            <div className="role-option-title">Shopkeeper</div>
                            <div className="role-option-desc">Manage a store counter</div>
                        </div>
                        <div className={`role-option${role === 'manager' ? ' selected manager' : ''}`} onClick={() => setRole('manager')}>
                            <div className="role-option-icon">🏪</div>
                            <div className="role-option-title">Vendor</div>
                            <div className="role-option-desc">Own & run your store</div>
                        </div>
                    </div>
                </div>

                {role === 'manager' && (
                    <div className="alert alert-info mb-4">
                        💡 Vendor accounts require <strong>owner approval</strong> before you can open your store.
                    </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">First Name</label>
                            <div className="form-input-wrapper">
                                <span className="form-input-icon">👤</span>
                                <input id="reg-firstname" type="text" className={`form-input${errors.firstname ? ' error' : ''}`} placeholder="John" value={form.firstname} onChange={set('firstname')} autoComplete="given-name" />
                            </div>
                            {errors.firstname && <span className="form-error">⚠ {errors.firstname}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Last Name</label>
                            <div className="form-input-wrapper">
                                <span className="form-input-icon">👤</span>
                                <input id="reg-lastname" type="text" className={`form-input${errors.lastname ? ' error' : ''}`} placeholder="Doe" value={form.lastname} onChange={set('lastname')} autoComplete="family-name" />
                            </div>
                            {errors.lastname && <span className="form-error">⚠ {errors.lastname}</span>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <div className="form-input-wrapper">
                            <span className="form-input-icon">✉</span>
                            <input id="reg-email" type="email" className={`form-input${errors.email ? ' error' : ''}`} placeholder="john@example.com" value={form.email} onChange={set('email')} autoComplete="email" />
                        </div>
                        {errors.email && <span className="form-error">⚠ {errors.email}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div className="form-input-wrapper">
                            <span className="form-input-icon">🔒</span>
                            <input id="reg-password" type={showPw ? 'text' : 'password'} className={`form-input${errors.password ? ' error' : ''}`} placeholder="Create strong password" value={form.password} onChange={set('password')} autoComplete="new-password" style={{ paddingRight: '2.75rem' }} />
                            <button type="button" className="form-input-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>{showPw ? '🙈' : '👁'}</button>
                        </div>
                        {form.password && (
                            <div style={{ marginTop: '.4rem' }}>
                                <div className="strength-bars">
                                    {[0, 1, 2, 3].map(i => <div key={i} className={`strength-bar${strength.score > i ? ' ' + strength.cls : ''}`} />)}
                                </div>
                                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.25rem' }}>
                                    Strength: <strong style={{ color: strength.cls === 'strong' ? 'var(--success)' : strength.cls === 'fair' ? 'var(--warning)' : strength.cls === 'weak' ? 'var(--danger)' : 'var(--primary-light)' }}>{strength.label}</strong>
                                </div>
                                <div style={{ marginTop: '.5rem', display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
                                    {REQUIREMENTS.map(r => (
                                        <span key={r.label} className={`req-item${r.test(form.password) ? ' met' : ''}`}>
                                            {r.test(form.password) ? '✓' : '○'} {r.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {errors.password && <span className="form-error">⚠ {errors.password}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirm Password</label>
                        <div className="form-input-wrapper">
                            <span className="form-input-icon">🔒</span>
                            <input id="reg-confirm" type={showConfirm ? 'text' : 'password'} className={`form-input${errors.confirmPassword ? ' error' : ''}`} placeholder="Repeat password" value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" style={{ paddingRight: '2.75rem' }} />
                            <button type="button" className="form-input-toggle" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>{showConfirm ? '🙈' : '👁'}</button>
                        </div>
                        {errors.confirmPassword && <span className="form-error">⚠ {errors.confirmPassword}</span>}
                        {form.confirmPassword && !errors.confirmPassword && form.password === form.confirmPassword && (
                            <span className="form-error" style={{ color: 'var(--success)' }}>✓ Passwords match</span>
                        )}
                    </div>

                    <button id="register-submit" type="submit" className={`btn ${role === 'manager' ? 'btn-manager' : 'btn-primary'} w-full btn-lg${loading ? ' btn-loading' : ''}`} disabled={loading}>
                        {loading ? <><span className="spinner" /> Creating account...</> : role === 'manager' ? '🏪 Register as Vendor' : '✨ Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account?{' '}
                    <Link href="/login" className="auth-link">Sign In</Link>
                </div>
            </div>
        </div>
    );
}
