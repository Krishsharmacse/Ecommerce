'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { twoFactorService } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

function Verify2FAContent() {
    const router = useRouter();
    const params = useSearchParams();
    const { refreshUser } = useAuth();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showBackup, setShowBackup] = useState(false);

    const tempToken = params.get('tempToken') || '';
    const source = params.get('source') || 'login';

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) { setError('Please enter your code'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await twoFactorService.validate(tempToken, code.trim());
            if (res.success) {
                await refreshUser();
                toast.success(res.message || 'Verified! Welcome back 🎉');
                router.push('/shop');
            } else {
                setError(res.message || 'Invalid code');
                toast.error(res.message || 'Verification failed');
            }
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            const msg = e?.response?.data?.message || 'Verification failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // Auto-format: 6 digits only (or 8 chars for backup code)
    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\s/g, '');
        setCode(showBackup ? val.toUpperCase().slice(0, 8) : val.replace(/\D/g, '').slice(0, 6));
        if (error) setError('');
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>🛡️</div>
                    <h1 className="auth-title">Two-Factor Authentication</h1>
                    <p className="auth-subtitle">
                        {showBackup
                            ? 'Enter one of your 8-character backup codes'
                            : 'Enter the 6-digit code from your authenticator app'}
                    </p>
                </div>

                {source === 'google' && (
                    <div className="alert alert-info mb-4" style={{ fontSize: '0.85rem' }}>
                        🔗 Signed in via Google — 2FA required as extra protection.
                    </div>
                )}

                {error && (
                    <div className="alert alert-error mb-4">
                        <span>⚠</span> {error}
                    </div>
                )}

                <form onSubmit={handleVerify} className="auth-form">
                    <div className="form-group">
                        <label className="form-label">
                            {showBackup ? 'Backup Code' : 'Authenticator Code'}
                        </label>
                        <div className="form-input-wrapper">
                            <span className="form-input-icon">🔑</span>
                            <input
                                id="totp-code"
                                type="text"
                                className={`form-input ${error ? 'error' : ''}`}
                                placeholder={showBackup ? 'XXXXXXXX' : '000 000'}
                                value={showBackup ? code : code.replace(/(\d{3})(\d{1,3})/, '$1 $2')}
                                onChange={handleCodeChange}
                                autoFocus
                                autoComplete="one-time-code"
                                inputMode={showBackup ? 'text' : 'numeric'}
                                style={{
                                    fontSize: '1.5rem',
                                    letterSpacing: '0.2em',
                                    textAlign: 'center',
                                    fontWeight: 700,
                                    fontFamily: 'monospace',
                                }}
                            />
                        </div>
                    </div>

                    <button
                        id="verify-2fa-submit"
                        type="submit"
                        className={`btn btn-primary w-full btn-lg ${loading ? 'btn-loading' : ''}`}
                        disabled={loading || code.length < (showBackup ? 8 : 6)}
                    >
                        {loading ? <><span className="spinner" /> Verifying...</> : '✓ Verify & Sign In'}
                    </button>
                </form>

                <div className="auth-divider">or</div>

                <button
                    className="btn btn-secondary w-full"
                    onClick={() => { setShowBackup(!showBackup); setCode(''); setError(''); }}
                >
                    {showBackup ? '📱 Use authenticator app' : '🔑 Use a backup code'}
                </button>

                <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
                    <Link href="/login" className="auth-link">← Back to Login</Link>
                </div>
            </div>
        </div>
    );
}

export default function Verify2FAPage() {
    return (
        <Suspense fallback={
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div className="spinner spinner-primary spinner-lg" style={{ margin: '0 auto' }} />
                </div>
            </div>
        }>
            <Verify2FAContent />
        </Suspense>
    );
}
