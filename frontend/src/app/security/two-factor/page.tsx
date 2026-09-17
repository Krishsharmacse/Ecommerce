'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { twoFactorService } from '@/lib/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';

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
                toast.error(res.message || 'Setup initialization failed');
            }
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err?.response?.data?.message || 'Setup initialization failed');
        } finally {
            setLoading(false);
        }
    };

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
                toast.success('Two-factor authentication enabled successfully!');
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

    const handleDisable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!totpCode.trim()) { setError('Enter your current security code'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await twoFactorService.disable(totpCode.trim());
            if (res.success) {
                await refreshUser();
                toast.success('2FA has been disabled');
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
        toast.success('Copied to clipboard');
    };

    if (isLoading || !statusLoaded) {
        return (
            <div className="min-h-[calc(100vh-var(--navbar-h))] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="container py-12 md:py-16 max-w-2xl">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)] mb-4">
                <Link href="/shop" className="hover:text-[var(--foreground)] transition-colors">Catalog</Link>
                <span>/</span>
                <span className="text-[var(--foreground)] font-medium">Security Settings</span>
            </div>

            <div className="mb-8">
                <h1 className="heading-1 text-[var(--foreground)]">Two-Factor Authentication</h1>
                <p className="body-sm text-[var(--foreground-muted)] mt-1">
                    Add an extra verification layer to safeguard your ShopVault account and merchant transactions.
                </p>
            </div>

            {/* STATUS VIEW */}
            {step === 'status' && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm space-y-6">
                    {/* Status Badge Banner */}
                    <div className={`p-4 rounded-xl border flex items-center gap-4 ${
                        is2FAEnabled
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                            : 'bg-amber-50/50 border-amber-200 text-amber-950'
                    }`}>
                        <div className="text-2xl">{is2FAEnabled ? '🛡️' : '⚠️'}</div>
                        <div>
                            <div className="text-sm font-semibold">
                                2FA is currently <span className={is2FAEnabled ? 'text-emerald-700' : 'text-amber-700'}>{is2FAEnabled ? 'ENABLED' : 'DISABLED'}</span>
                            </div>
                            <div className="text-xs text-[var(--foreground-muted)] mt-0.5">
                                {is2FAEnabled
                                    ? `Account is protected. You have ${backupRemaining} backup code${backupRemaining !== 1 ? 's' : ''} remaining.`
                                    : 'Your account is secured with a password only. Enable 2FA for enhanced safety.'}
                            </div>
                        </div>
                    </div>

                    {!is2FAEnabled && (
                        <div className="space-y-4 pt-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                                How Two-Factor Works
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { icon: '📱', title: 'Install an authenticator app', desc: 'Google Authenticator, Apple Passwords, 1Password, or Authy' },
                                    { icon: '🔍', title: 'Scan your encrypted key', desc: 'Scan the private QR code or paste the setup secret key' },
                                    { icon: '🔐', title: 'Authenticate with instant codes', desc: 'Enter a dynamic 6-digit one-time code during critical sign-ins' },
                                ].map((s, idx) => (
                                    <div key={idx} className="flex items-start gap-3.5 p-3 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] grid place-items-center text-sm flex-shrink-0">
                                            {s.icon}
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-[var(--foreground)]">{s.title}</div>
                                            <div className="text-[11px] text-[var(--foreground-muted)] mt-0.5">{s.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-subtle)]">
                        {!is2FAEnabled ? (
                            <button
                                id="enable-2fa-btn"
                                type="button"
                                onClick={handleSetupStart}
                                disabled={loading}
                                className={`btn btn--primary btn--md ${loading ? 'btn--loading' : ''}`}
                            >
                                {loading ? 'Initializing...' : 'Set Up Two-Factor'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => { setStep('disable'); setTotpCode(''); setError(''); }}
                                className="btn btn--danger btn--md"
                            >
                                Disable Two-Factor
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="btn btn--secondary btn--md"
                        >
                            Back
                        </button>
                    </div>
                </div>
            )}

            {/* QR CODE VIEW */}
            {step === 'setup-qr' && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm space-y-6">
                    <div className="text-center space-y-1">
                        <h2 className="heading-2 text-[var(--foreground)]">Scan QR Code</h2>
                        <p className="body-sm text-[var(--foreground-muted)]">
                            Open your authenticator app and point your camera at this barcode.
                        </p>
                    </div>

                    {qrCode && (
                        <div className="flex justify-center my-4">
                            <div className="p-4 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={qrCode} alt="2FA QR Code" width={200} height={200} className="rounded-lg block" />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="field__label">Can&apos;t scan? Enter key manually</label>
                        <div className="flex items-center gap-2 p-2.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl">
                            <code className="flex-1 font-mono text-xs tracking-wider text-[var(--foreground)] break-all select-all">
                                {secretKey}
                            </code>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(secretKey)}
                                className="btn btn--secondary btn--sm"
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setStep('status')}
                            className="btn btn--secondary btn--md"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => { setStep('setup-verify'); setTotpCode(''); setError(''); }}
                            className="btn btn--primary btn--md flex-1 justify-center"
                        >
                            I&apos;ve scanned the code →
                        </button>
                    </div>
                </div>
            )}

            {/* VERIFY SETUP VIEW */}
            {step === 'setup-verify' && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm space-y-6">
                    <div className="text-center space-y-1">
                        <h2 className="heading-2 text-[var(--foreground)]">Verify Security Code</h2>
                        <p className="body-sm text-[var(--foreground-muted)]">
                            Enter the 6-digit code currently shown in your authenticator app.
                        </p>
                    </div>

                    {error && (
                        <div className="alert alert--error">
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleVerifySetup} className="space-y-4">
                        <div className="field">
                            <label className="field__label" htmlFor="setup-totp-input">Security Code</label>
                            <input
                                id="setup-totp-input"
                                type="text"
                                value={totpCode.replace(/(\d{3})(\d{1,3})/, '$1 $2')}
                                onChange={e => { setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                                placeholder="000 000"
                                autoFocus
                                inputMode="numeric"
                                className="input text-center text-2xl font-mono tracking-widest font-semibold h-14"
                            />
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setStep('setup-qr')}
                                className="btn btn--secondary btn--md"
                            >
                                ← Back
                            </button>
                            <button
                                id="confirm-2fa-btn"
                                type="submit"
                                disabled={loading || totpCode.length < 6}
                                className={`btn btn--primary btn--md flex-1 justify-center ${loading ? 'btn--loading' : ''}`}
                            >
                                {loading ? 'Verifying...' : 'Activate Two-Factor'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* BACKUP CODES VIEW */}
            {step === 'backup-codes' && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm space-y-6">
                    <div className="text-center space-y-1">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 grid place-items-center mx-auto mb-2 text-xl">
                            ✓
                        </div>
                        <h2 className="heading-2 text-[var(--foreground)]">Save Your Backup Codes</h2>
                        <p className="body-sm text-[var(--foreground-muted)]">
                            Store these single-use recovery codes in a secure vault. You will need them if you lose access to your authenticator.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-4 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl">
                        {backupCodes.map((code, idx) => (
                            <div key={idx} className="font-mono text-xs font-semibold text-center p-2 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--foreground)]">
                                {code}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => copyToClipboard(backupCodes.join('\n'))}
                            className="btn btn--secondary btn--md flex-1 justify-center"
                        >
                            Copy All Codes
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep('status')}
                            className="btn btn--primary btn--md flex-1 justify-center"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* DISABLE VIEW */}
            {step === 'disable' && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm space-y-6">
                    <div className="text-center space-y-1">
                        <h2 className="heading-2 text-[var(--foreground)]">Disable Two-Factor Authentication</h2>
                        <p className="body-sm text-[var(--foreground-muted)]">
                            Enter your current 6-digit code to verify your identity before disabling.
                        </p>
                    </div>

                    {error && (
                        <div className="alert alert--error">
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleDisable} className="space-y-4">
                        <div className="field">
                            <label className="field__label" htmlFor="disable-totp-input">Security Code</label>
                            <input
                                id="disable-totp-input"
                                type="text"
                                value={totpCode.replace(/(\d{3})(\d{1,3})/, '$1 $2')}
                                onChange={e => { setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                                placeholder="000 000"
                                autoFocus
                                inputMode="numeric"
                                className="input text-center text-2xl font-mono tracking-widest font-semibold h-14"
                            />
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => { setStep('status'); setError(''); }}
                                className="btn btn--secondary btn--md"
                            >
                                Cancel
                            </button>
                            <button
                                id="disable-2fa-btn"
                                type="submit"
                                disabled={loading || totpCode.length < 6}
                                className={`btn btn--danger btn--md flex-1 justify-center ${loading ? 'btn--loading' : ''}`}
                            >
                                {loading ? 'Disabling...' : 'Confirm Disable'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
