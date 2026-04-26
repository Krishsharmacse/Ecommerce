'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { twoFactorService } from '@/lib/auth';
import toast from 'react-hot-toast';
import Image from 'next/image';

type Step = 'status' | 'setup-qr' | 'setup-verify' | 'backup-codes' | 'disable';

export default function TwoFactorSettingsPage() {
    const { user, isLoggedIn, isLoading, refreshUser } = useAuth();
    const router = useRouter();

    const [step, setStep] = useState<Step>('status');
    const [qrCode, setQrCode] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [backupRemaining, setBackupRemaining] = useState(0);
    const [statusLoaded, setStatusLoaded] = useState(false);

    useEffect(() => {
        if (!isLoading && !isLoggedIn) router.push('/login');
    }, [isLoading, isLoggedIn, router]);

    useEffect(() => {
        if (isLoggedIn && !statusLoaded) {
            twoFactorService.getStatus()
                .then(d => { setBackupRemaining(d.backupCodesRemaining || 0); setStatusLoaded(true); })
                .catch(() => setStatusLoaded(true));
        }
    }, [isLoggedIn, statusLoaded]);

    const is2FAEnabled = user?.twoFactorEnabled;

    // ── Step 1: Generate QR code ───────────────────────────
    const handleSetupStart = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await twoFactorService.setup();
            if (res.success) {
                setQrCode(res.qrCode);
                setSecretKey(res.secret);
                setStep('setup-qr');
            } else {
                toast.error(res.message || 'Setup failed');
            }
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err?.response?.data?.message || 'Setup failed');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: Verify TOTP and activate ─────────────────
    const handleVerifySetup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!totpCode.trim()) { setError('Enter the 6-digit code'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await twoFactorService.verifySetup(totpCode.trim());
            if (res.success) {
                setBackupCodes(res.backupCodes || []);
                await refreshUser();
                toast.success('2FA enabled successfully! 🎉');
                setStep('backup-codes');
            } else {
                setError(res.message || 'Invalid code');
            }
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setError(err?.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    // ── Disable 2FA ───────────────────────────────────────
    const handleDisable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!totpCode.trim()) { setError('Enter your current TOTP code'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await twoFactorService.disable(totpCode.trim());
            if (res.success) {
                await refreshUser();
                toast.success('2FA has been disabled.');
                setStep('status');
                setTotpCode('');
            } else {
                setError(res.message || 'Failed to disable 2FA');
            }
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setError(err?.response?.data?.message || 'Failed to disable 2FA');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
    };

    if (isLoading || !statusLoaded) {
        return (
            <div style={{ paddingTop: '100px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner spinner-primary spinner-lg" />
            </div>
        );
    }

    return (
        <div style={{ paddingTop: '90px', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--glass-border)', padding: '2.5rem 0 2rem' }}>
                <div className="container">
                    <div className="section-tag">🛡️ Security</div>
                    <h1 className="section-title" style={{ marginTop: '0.5rem' }}>
                        Two-Factor <span className="text-gradient">Authentication</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Add an extra layer of security to protect your account.
                    </p>
                </div>
            </div>

            <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '680px' }}>

                {/* ─── STATUS VIEW ─────────────────────────────── */}
                {step === 'status' && (
                    <div className="card-glass" style={{ padding: '2rem' }}>
                        {/* Current status banner */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '1rem',
                            padding: '1.25rem', borderRadius: 'var(--radius-lg)',
                            background: is2FAEnabled ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.06)',
                            border: `1px solid ${is2FAEnabled ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.2)'}`,
                            marginBottom: '2rem',
                        }}>
                            <div style={{ fontSize: '2.5rem' }}>{is2FAEnabled ? '✅' : '⚠️'}</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                                    2FA is currently <span style={{ color: is2FAEnabled ? '#10b981' : '#f87171' }}>
                                        {is2FAEnabled ? 'ENABLED' : 'DISABLED'}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    {is2FAEnabled
                                        ? `You have ${backupRemaining} backup code${backupRemaining !== 1 ? 's' : ''} remaining.`
                                        : 'Your account is protected by password only. Enable 2FA for stronger security.'}
                                </div>
                            </div>
                        </div>

                        {/* How it works */}
                        {!is2FAEnabled && (
                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    HOW IT WORKS
                                </div>
                                {[
                                    { icon: '📱', title: 'Install an authenticator app', desc: 'Google Authenticator, Authy, or any TOTP app' },
                                    { icon: '🔍', title: 'Scan the QR code', desc: 'We\'ll show you a QR code to scan with your app' },
                                    { icon: '🔐', title: 'Enter 6-digit codes', desc: 'Every login, your app generates a time-sensitive code' },
                                ].map((step, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                                            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                                        }}>{step.icon}</div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{step.title}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{step.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            {!is2FAEnabled ? (
                                <button
                                    id="enable-2fa-btn"
                                    className={`btn btn-primary btn-lg ${loading ? 'btn-loading' : ''}`}
                                    onClick={handleSetupStart}
                                    disabled={loading}
                                >
                                    {loading ? <><span className="spinner" /> Setting up...</> : '🛡️ Enable 2FA'}
                                </button>
                            ) : (
                                <button
                                    className="btn btn-danger"
                                    onClick={() => { setStep('disable'); setTotpCode(''); setError(''); }}
                                >
                                    🗑 Disable 2FA
                                </button>
                            )}
                            <button
                                className="btn btn-secondary"
                                onClick={() => router.back()}
                            >
                                ← Go Back
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── QR CODE VIEW ───────────────────────────── */}
                {step === 'setup-qr' && (
                    <div className="card-glass" style={{ padding: '2rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📱</div>
                            <h2 style={{ fontWeight: 800, fontSize: '1.25rem' }}>Scan with your app</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                Open your authenticator app and scan this QR code
                            </p>
                        </div>

                        {/* QR Code */}
                        {qrCode && (
                            <div style={{
                                display: 'flex', justifyContent: 'center', marginBottom: '1.5rem',
                            }}>
                                <div style={{
                                    padding: '1rem', background: 'white', borderRadius: '16px',
                                    border: '4px solid var(--primary)', boxShadow: '0 0 40px rgba(108,99,255,0.3)',
                                }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={qrCode} alt="2FA QR Code" width={200} height={200} style={{ display: 'block', borderRadius: '8px' }} />
                                </div>
                            </div>
                        )}

                        {/* Manual key */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                                CAN&apos;T SCAN? ENTER THIS KEY MANUALLY:
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.75rem 1rem', background: 'var(--glass-bg)',
                                border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)',
                            }}>
                                <code style={{ flex: 1, fontSize: '0.8rem', fontFamily: 'monospace', letterSpacing: '0.1em', wordBreak: 'break-all', color: 'var(--primary-light)' }}>
                                    {secretKey}
                                </code>
                                <button onClick={() => copyToClipboard(secretKey)} style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', flexShrink: 0 }}>
                                    📋
                                </button>
                            </div>
                        </div>

                        <button className="btn btn-primary w-full btn-lg" onClick={() => { setStep('setup-verify'); setTotpCode(''); setError(''); }}>
                            I&apos;ve scanned it → Next
                        </button>
                    </div>
                )}

                {/* ─── VERIFY SETUP VIEW ──────────────────────── */}
                {step === 'setup-verify' && (
                    <div className="card-glass" style={{ padding: '2rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔢</div>
                            <h2 style={{ fontWeight: 800, fontSize: '1.25rem' }}>Enter the code</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                Enter the 6-digit code from your authenticator app to confirm setup
                            </p>
                        </div>

                        {error && <div className="alert alert-error mb-4"><span>⚠</span> {error}</div>}

                        <form onSubmit={handleVerifySetup} className="auth-form">
                            <div className="form-group">
                                <div className="form-input-wrapper">
                                    <span className="form-input-icon">🔑</span>
                                    <input
                                        id="setup-totp-input"
                                        type="text"
                                        className="form-input"
                                        placeholder="000 000"
                                        value={totpCode.replace(/(\d{3})(\d{1,3})/, '$1 $2')}
                                        onChange={e => { setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                                        autoFocus
                                        inputMode="numeric"
                                        style={{ fontSize: '1.5rem', letterSpacing: '0.2em', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setStep('setup-qr')}>← Back</button>
                                <button
                                    id="confirm-2fa-btn"
                                    type="submit"
                                    className={`btn btn-primary flex-1 ${loading ? 'btn-loading' : ''}`}
                                    disabled={loading || totpCode.length < 6}
                                >
                                    {loading ? <><span className="spinner" /> Verifying...</> : '✓ Confirm & Enable 2FA'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ─── BACKUP CODES VIEW ─────────────────────── */}
                {step === 'backup-codes' && (
                    <div className="card-glass" style={{ padding: '2rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.5rem', animation: 'float 3s ease-in-out infinite' }}>🎉</div>
                            <h2 style={{ fontWeight: 800, fontSize: '1.25rem', color: '#10b981' }}>2FA Enabled!</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                Save your backup codes somewhere safe. Each can only be used once.
                            </p>
                        </div>

                        <div className="alert alert-error mb-4" style={{ background: 'rgba(245,158,11,.08)', borderColor: 'rgba(245,158,11,.3)', color: '#f59e0b' }}>
                            ⚠️ <strong>Store these safely!</strong> If you lose your authenticator app, backup codes are your only way in.
                        </div>

                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem',
                            padding: '1.25rem', background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)',
                            marginBottom: '1.5rem',
                        }}>
                            {backupCodes.map((code, i) => (
                                <div key={i} style={{
                                    fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 700,
                                    padding: '0.5rem 0.75rem', background: 'var(--bg-elevated)',
                                    borderRadius: '8px', letterSpacing: '0.1em', textAlign: 'center',
                                    color: 'var(--primary-light)',
                                }}>
                                    {code}
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => copyToClipboard(backupCodes.join('\n'))}
                            >
                                📋 Copy All Codes
                            </button>
                            <button
                                className="btn btn-primary flex-1"
                                onClick={() => setStep('status')}
                            >
                                ✓ Done
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── DISABLE VIEW ───────────────────────────── */}
                {step === 'disable' && (
                    <div className="card-glass" style={{ padding: '2rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                            <h2 style={{ fontWeight: 800, fontSize: '1.25rem' }}>Disable 2FA</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                This will remove the extra security layer from your account.
                            </p>
                        </div>

                        <div className="alert alert-error mb-4">
                            ⚠ Your account will be less secure after disabling 2FA.
                        </div>

                        {error && <div className="alert alert-error mb-4"><span>⚠</span> {error}</div>}

                        <form onSubmit={handleDisable} className="auth-form">
                            <div className="form-group">
                                <label className="form-label">Enter your current authenticator code to confirm</label>
                                <div className="form-input-wrapper">
                                    <span className="form-input-icon">🔑</span>
                                    <input
                                        id="disable-totp-input"
                                        type="text"
                                        className="form-input"
                                        placeholder="000 000"
                                        value={totpCode.replace(/(\d{3})(\d{1,3})/, '$1 $2')}
                                        onChange={e => { setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                                        autoFocus
                                        inputMode="numeric"
                                        style={{ fontSize: '1.5rem', letterSpacing: '0.2em', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => { setStep('status'); setError(''); }}>← Cancel</button>
                                <button
                                    id="disable-2fa-btn"
                                    type="submit"
                                    className={`btn btn-danger flex-1 ${loading ? 'btn-loading' : ''}`}
                                    disabled={loading || totpCode.length < 6}
                                >
                                    {loading ? <><span className="spinner" /> Disabling...</> : '🗑 Disable 2FA'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Back to dashboard link */}
                {step === 'status' && (
                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            🛡️ Using Google Authenticator, Authy, or any TOTP-compatible app is recommended.
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
