'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { oauthService } from '@/lib/auth';
import toast from 'react-hot-toast';
import { UserPlus, Mail, Rocket, Lock, ShieldCheck, Zap, ShoppingBag, Eye, EyeOff, Check, AlertTriangle } from 'lucide-react';

const REQUIREMENTS = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
    { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(p: string) {
    const s = REQUIREMENTS.filter(r => r.test(p)).length;
    return {
        score: s,
        label: ['None', 'Weak', 'Fair', 'Good', 'Strong'][s],
        colors: ['', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6'],
    };
}

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useAuth();
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
        if (!form.firstname.trim()) errs.firstname = 'First name is required';
        if (!form.lastname.trim()) errs.lastname = 'Last name is required';
        if (!form.email) errs.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address';
        if (!form.password) errs.password = 'Password is required';
        else if (!REQUIREMENTS.every(r => r.test(form.password))) errs.password = 'Password does not meet all requirements';
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
            const res = await register({ ...form, role: 'customer' });
            if (res.success) {
                localStorage.setItem('pendingVerifyEmail', form.email);
                if (res.verification?.otpId) {
                    localStorage.setItem('pendingVerifyOtpId', res.verification.otpId);
                }
                setDone(true);
                toast.success('Account created! Please enter verification code.');
                router.push('/verify-otp');
            } else {
                toast.error(res.message);
                if (res.message.toLowerCase().includes('email')) setErrors({ email: res.message });
            }
        } catch {
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
            <div style={{
                minHeight: 'calc(100vh - var(--navbar-h))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--background)', padding: '2rem',
            }}>
                <div style={{
                    width: '100%', maxWidth: '420px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '24px',
                    padding: '2.5rem',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                    textAlign: 'center',
                }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.1))',
                        border: '2px solid rgba(34,197,94,0.3)',
                        display: 'grid', placeItems: 'center',
                        margin: '0 auto 1.5rem',
                        boxShadow: '0 0 30px rgba(34,197,94,0.2)',
                    }}>
                        <Mail className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--foreground)', marginBottom: '0.75rem' }}>
                        Account Created!
                    </h2>
                    <p style={{ color: 'var(--foreground-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                        We sent a 6-digit verification code to{' '}
                        <strong style={{ color: 'var(--foreground)' }}>{form.email}</strong>.
                        Redirecting to verification...
                    </p>
                    <div style={{ marginTop: '1.5rem' }}>
                        <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            border: '2px solid rgba(59,130,246,0.3)', borderTopColor: 'var(--accent-500)',
                            animation: 'spin 0.7s linear infinite', margin: '0 auto',
                        }} />
                    </div>
                </div>
                <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

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
                background: 'linear-gradient(145deg, #0a0a1a 0%, #0c0c20 50%, #08081a 100%)',
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
                    width: '480px', height: '480px',
                    top: '-100px', right: '-80px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at center, rgba(139,92,246,0.22) 0%, rgba(99,102,241,0.12) 40%, transparent 70%)',
                    filter: 'blur(45px)',
                    animation: 'glow 9s ease-in-out infinite',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute',
                    width: '400px', height: '400px',
                    bottom: '-60px', left: '-60px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at center, rgba(59,130,246,0.18) 0%, rgba(139,92,246,0.08) 40%, transparent 70%)',
                    filter: 'blur(40px)',
                    animation: 'glow 12s ease-in-out infinite reverse',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute',
                    width: '220px', height: '220px',
                    top: '40%', left: '40%',
                    transform: 'translate(-50%,-50%)',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at center, rgba(236,72,153,0.12) 0%, transparent 70%)',
                    filter: 'blur(30px)',
                    pointerEvents: 'none',
                }} />

                {/* Brand */}
                <div style={{ position: 'relative', zIndex: 10 }}>
                    <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
                        <span style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            display: 'grid', placeItems: 'center',
                            fontWeight: 800, color: '#fff', fontSize: '0.9rem',
                            background: 'linear-gradient(135deg, var(--accent-500), var(--accent-700))',
                            boxShadow: '0 0 20px rgba(59,130,246,0.5)',
                        }}>S</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#fff' }}>
                            SHOPVAULT
                        </span>
                    </Link>
                </div>

                {/* Central Visual: Steps */}
                <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 0' }}>
                    <div style={{ maxWidth: '340px', width: '100%' }}>
                        <h2 style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800, fontSize: '1.6rem',
                            color: '#fff', lineHeight: 1.15,
                            letterSpacing: '-0.025em',
                            marginBottom: '0.5rem',
                        }}>Join 50,000+ traders on ShopVault</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                            From shoppers to full multi-vendor storefronts — all in one secure platform.
                        </p>

                        {/* Steps */}
                        {[
                            { step: '01', icon: UserPlus, title: 'Create your account', desc: 'Pick your role and set up your profile in under 60 seconds' },
                            { step: '02', icon: Mail, title: 'Verify your email', desc: 'We send a secure OTP to confirm your identity' },
                            { step: '03', icon: Rocket, title: 'Start immediately', desc: 'Browse, shop, or open your storefront right away' },
                        ].map((item, i) => {
                            const Icon = item.icon;
                            return (
                                <div key={i} style={{
                                    display: 'flex', gap: '1rem',
                                    marginBottom: i < 2 ? '1.25rem' : 0,
                                    position: 'relative',
                                }}>
                                    {/* Line connector */}
                                    {i < 2 && (
                                        <div style={{
                                            position: 'absolute',
                                            left: '19px', top: '40px',
                                            width: '2px', height: 'calc(100% + 0.5rem)',
                                            background: 'linear-gradient(to bottom, rgba(59,130,246,0.3), rgba(59,130,246,0.05))',
                                        }} />
                                    )}
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        display: 'grid', placeItems: 'center',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                        backdropFilter: 'blur(8px)',
                                        animation: `float ${3 + i * 0.5}s ease-in-out infinite ${i * 0.4}s`,
                                    }}>
                                        <Icon className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                            <span style={{
                                                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em',
                                                color: 'var(--accent-400)', fontFamily: 'var(--font-mono)',
                                            }}>{item.step}</span>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{item.title}</span>
                                        </div>
                                        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{item.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Trust badges */}
                <div style={{ position: 'relative', zIndex: 10 }}>
                    <div style={{
                        display: 'flex', gap: '0.5rem',
                        padding: '1rem',
                        borderRadius: '14px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        backdropFilter: 'blur(10px)',
                        marginBottom: '0.75rem',
                    }}>
                        {[
                            { n: '50K+', l: 'Active users' },
                            { n: '₹2.4Cr+', l: 'Transacted' },
                            { n: '4.9★', l: 'Trust score' },
                            { n: '100%', l: 'Escrow safe' },
                        ].map((s, i) => (
                            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.n}</div>
                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>{s.l}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[
                            { icon: Lock, label: '256-bit SSL' },
                            { icon: ShieldCheck, label: 'SOC 2 Ready' },
                            { icon: Zap, label: '99.9% Uptime' },
                        ].map((b) => {
                            const Icon = b.icon;
                            return (
                                <div key={b.label} style={{
                                    flex: 1, padding: '0.5rem 0.4rem',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    textAlign: 'center',
                                    fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                                }}>
                                    <Icon className="w-3 h-3 text-blue-400" />
                                    <span>{b.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Right: Registration Form ── */}
            <div style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                padding: '2rem 1.5rem',
                overflowY: 'auto',
                background: 'var(--background)',
            }}>
                <div style={{ width: '100%', maxWidth: '440px', paddingTop: '1rem', paddingBottom: '2rem' }}>

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
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--foreground)' }}>SHOPVAULT</span>
                    </Link>

                    {/* Header */}
                    <div style={{ marginBottom: '1.75rem' }}>
                        <h1 style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800, fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
                            letterSpacing: '-0.03em', color: 'var(--foreground)',
                            lineHeight: 1.1, marginBottom: '0.5rem',
                        }}>Create your account</h1>
                        <p style={{ color: 'var(--foreground-muted)', fontSize: '0.875rem' }}>
                            Join ShopVault to browse curated collections or manage your vendor counters.
                        </p>
                    </div>

                    {/* Google Sign Up */}
                    <button
                        id="google-register-btn"
                        type="button"
                        onClick={handleGoogleRegister}
                        disabled={googleLoading || loading}
                        style={{
                            width: '100%', height: '46px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
                            borderRadius: '12px',
                            border: '1px solid var(--border-strong)',
                            background: 'var(--surface)',
                            color: 'var(--foreground)',
                            fontWeight: 600, fontSize: '0.875rem',
                            cursor: googleLoading || loading ? 'not-allowed' : 'pointer',
                            opacity: googleLoading || loading ? 0.6 : 1,
                            transition: 'all 0.15s ease',
                            marginBottom: '1.25rem',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-elevated)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
                    </button>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                        <span style={{ color: 'var(--foreground-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, whiteSpace: 'nowrap' }}>or register with email</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    </div>

                    {/* Customer Account Notice */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        background: 'rgba(59,130,246,0.06)',
                        border: '1px solid rgba(59,130,246,0.18)',
                        marginBottom: '1.25rem',
                    }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'var(--primary-subtle)',
                            display: 'grid', placeItems: 'center', flexShrink: 0
                        }}>
                            <ShoppingBag className="w-4 h-4 text-blue-500" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground)' }}>Customer Account</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)', lineHeight: 1.4 }}>
                                Standard account with instant order tracking. Vendor store privileges are approved and promoted by administrators.
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        {/* Name Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {[
                                { key: 'firstname', id: 'reg-firstname', label: 'First name', placeholder: 'Jane', autoComplete: 'given-name' },
                                { key: 'lastname', id: 'reg-lastname', label: 'Last name', placeholder: 'Doe', autoComplete: 'family-name' },
                            ].map(field => (
                                <div key={field.key}>
                                    <label htmlFor={field.id} style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--foreground-secondary)', marginBottom: '0.35rem' }}>
                                        {field.label} <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        id={field.id}
                                        type="text"
                                        value={form[field.key as keyof typeof form]}
                                        onChange={set(field.key)}
                                        placeholder={field.placeholder}
                                        autoComplete={field.autoComplete}
                                        aria-invalid={!!errors[field.key]}
                                        style={{
                                            width: '100%', height: '42px',
                                            padding: '0 0.75rem', borderRadius: '10px',
                                            border: `1px solid ${errors[field.key] ? 'rgba(239,68,68,0.5)' : 'var(--border-strong)'}`,
                                            background: 'var(--surface)',
                                            color: 'var(--foreground)', fontSize: '0.875rem',
                                            outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                                        }}
                                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-500)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = errors[field.key] ? 'rgba(239,68,68,0.5)' : 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                    {errors[field.key] && <span style={{ color: '#f87171', fontSize: '0.7rem', marginTop: '0.2rem', display: 'block' }}>{errors[field.key]}</span>}
                                </div>
                            ))}
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="reg-email" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--foreground-secondary)', marginBottom: '0.35rem' }}>
                                Email address
                            </label>
                            <input
                                id="reg-email"
                                type="email"
                                value={form.email}
                                onChange={set('email')}
                                placeholder="name@example.com"
                                autoComplete="email"
                                aria-invalid={!!errors.email}
                                style={{
                                    width: '100%', height: '42px',
                                    padding: '0 0.875rem', borderRadius: '10px',
                                    border: `1px solid ${errors.email ? 'rgba(239,68,68,0.5)' : 'var(--border-strong)'}`,
                                    background: 'var(--surface)', color: 'var(--foreground)',
                                    fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                                }}
                                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-500)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; }}
                                onBlur={e => { e.currentTarget.style.borderColor = errors.email ? 'rgba(239,68,68,0.5)' : 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'none'; }}
                            />
                            {errors.email && <span style={{ color: '#f87171', fontSize: '0.7rem', marginTop: '0.2rem', display: 'block' }}>{errors.email}</span>}
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="reg-password" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--foreground-secondary)', marginBottom: '0.35rem' }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="reg-password"
                                    type={showPw ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={set('password')}
                                    placeholder="Create strong password"
                                    autoComplete="new-password"
                                    aria-invalid={!!errors.password}
                                    style={{
                                        width: '100%', height: '42px',
                                        padding: '0 3rem 0 0.875rem', borderRadius: '10px',
                                        border: `1px solid ${errors.password ? 'rgba(239,68,68,0.5)' : 'var(--border-strong)'}`,
                                        background: 'var(--surface)', color: 'var(--foreground)',
                                        fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                                    }}
                                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-500)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = errors.password ? 'rgba(239,68,68,0.5)' : 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'none'; }}
                                />
                                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                                    color: 'var(--foreground-muted)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                }}>{showPw ? 'Hide' : 'Show'}</button>
                            </div>

                            {form.password && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    {/* Strength bar */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', height: '4px', marginBottom: '0.3rem' }}>
                                        {[1, 2, 3, 4].map(idx => (
                                            <div key={idx} style={{
                                                borderRadius: '999px',
                                                background: strength.score >= idx ? strength.colors[strength.score] : 'var(--border)',
                                                transition: 'background 0.3s ease',
                                            }} />
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.7rem', color: strength.score > 0 ? strength.colors[strength.score] : 'var(--foreground-muted)', fontWeight: 600 }}>
                                            {strength.label}
                                        </span>
                                        <div style={{ display: 'flex', gap: '0.625rem' }}>
                                            {REQUIREMENTS.map(r => {
                                                const met = r.test(form.password);
                                                return (
                                                    <span key={r.label} title={r.label} style={{
                                                        width: '6px', height: '6px', borderRadius: '50%',
                                                        background: met ? '#22c55e' : 'var(--border)',
                                                        transition: 'background 0.2s',
                                                    }} />
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem 0.5rem', marginTop: '0.35rem' }}>
                                        {REQUIREMENTS.map(r => {
                                            const met = r.test(form.password);
                                            return (
                                                <div key={r.label} style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                    fontSize: '0.68rem',
                                                    color: met ? '#22c55e' : 'var(--foreground-muted)',
                                                    fontWeight: met ? 600 : 400,
                                                }}>
                                                    <span>{met ? '✓' : '○'}</span>
                                                    <span>{r.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {errors.password && <span style={{ color: '#f87171', fontSize: '0.7rem', marginTop: '0.25rem', display: 'block' }}>{errors.password}</span>}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="reg-confirm" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--foreground-secondary)', marginBottom: '0.35rem' }}>
                                Confirm password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="reg-confirm"
                                    type={showConfirm ? 'text' : 'password'}
                                    value={form.confirmPassword}
                                    onChange={set('confirmPassword')}
                                    placeholder="Repeat your password"
                                    autoComplete="new-password"
                                    aria-invalid={!!errors.confirmPassword}
                                    style={{
                                        width: '100%', height: '42px',
                                        padding: '0 3rem 0 0.875rem', borderRadius: '10px',
                                        border: `1px solid ${errors.confirmPassword ? 'rgba(239,68,68,0.5)' : form.confirmPassword && form.password === form.confirmPassword ? 'rgba(34,197,94,0.5)' : 'var(--border-strong)'}`,
                                        background: 'var(--surface)', color: 'var(--foreground)',
                                        fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                                    }}
                                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-500)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; }}
                                    onBlur={e => {
                                        const hasErr = errors.confirmPassword;
                                        const matches = form.confirmPassword && form.password === form.confirmPassword;
                                        e.currentTarget.style.borderColor = hasErr ? 'rgba(239,68,68,0.5)' : matches ? 'rgba(34,197,94,0.5)' : 'var(--border-strong)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{
                                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                                    color: 'var(--foreground-muted)', fontSize: '0.7rem', fontWeight: 600,
                                    background: 'none', border: 'none', cursor: 'pointer',
                                }}>{showConfirm ? 'Hide' : 'Show'}</button>
                            </div>
                            {errors.confirmPassword && <span style={{ color: '#f87171', fontSize: '0.7rem', marginTop: '0.25rem', display: 'block' }}>{errors.confirmPassword}</span>}
                            {form.confirmPassword && !errors.confirmPassword && form.password === form.confirmPassword && (
                                <span style={{ color: '#22c55e', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', display: 'block' }}>✓ Passwords match</span>
                            )}
                        </div>

                        <button
                            id="register-submit"
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', height: '46px', marginTop: '0.25rem',
                                borderRadius: '12px',
                                background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, var(--accent-500), var(--accent-600))',
                                color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: loading ? 'none' : '0 4px 20px rgba(59,130,246,0.35)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(59,130,246,0.45)'; } }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = loading ? 'none' : '0 4px 20px rgba(59,130,246,0.35)'; }}
                        >
                            {loading ? (
                                <>
                                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
                                    Creating account...
                                </>
                            ) : 'Create Account'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--foreground-muted)', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                        Already have an account?{' '}
                        <Link href="/login" style={{ color: 'var(--accent-400)', fontWeight: 600, textDecoration: 'none' }}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>

            <style jsx global>{`
                @keyframes glow {
                    0%, 100% { opacity: 0.7; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.06); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
