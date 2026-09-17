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
                toast.success(res.message || 'Identity confirmed. Welcome back.');
                router.push('/shop');
            } else {
                setError(res.message || 'Invalid code provided');
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

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\s/g, '');
        setCode(showBackup ? val.toUpperCase().slice(0, 8) : val.replace(/\D/g, '').slice(0, 6));
        if (error) setError('');
    };

    return (
        <div className="min-h-[calc(100vh-var(--navbar-h))] flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 md:p-10 shadow-md space-y-6">
                {/* Header */}
                <div className="text-center space-y-1.5">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white font-bold grid place-items-center mx-auto mb-3 text-sm">
                        🛡️
                    </div>
                    <h1 className="heading-2 text-[var(--foreground)]">Two-Factor Authentication</h1>
                    <p className="body-sm text-[var(--foreground-muted)]">
                        {showBackup
                            ? 'Enter one of your 8-character single-use backup codes'
                            : 'Enter the 6-digit code from your authenticator app'}
                    </p>
                </div>

                {source === 'google' && (
                    <div className="alert alert--info">
                        <span>Signed in via Google. Two-factor authentication required for this account.</span>
                    </div>
                )}

                {error && (
                    <div className="alert alert--error">
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleVerify} className="space-y-4">
                    <div className="field">
                        <label className="field__label" htmlFor="totp-code">
                            {showBackup ? 'Backup Code' : 'Security Code'}
                        </label>
                        <input
                            id="totp-code"
                            type="text"
                            value={showBackup ? code : code.replace(/(\d{3})(\d{1,3})/, '$1 $2')}
                            onChange={handleCodeChange}
                            placeholder={showBackup ? 'XXXXXXXX' : '000 000'}
                            autoFocus
                            autoComplete="one-time-code"
                            inputMode={showBackup ? 'text' : 'numeric'}
                            className="input text-center text-2xl font-mono tracking-widest font-semibold h-14"
                        />
                    </div>

                    <button
                        id="verify-2fa-submit"
                        type="submit"
                        disabled={loading || code.length < (showBackup ? 8 : 6)}
                        className={`btn btn--primary btn--lg w-full justify-center ${loading ? 'btn--loading' : ''}`}
                    >
                        {loading ? 'Confirming code...' : 'Verify Identity'}
                    </button>
                </form>

                <div className="auth__divider">or</div>

                <button
                    type="button"
                    onClick={() => { setShowBackup(!showBackup); setCode(''); setError(''); }}
                    className="btn btn--secondary w-full justify-center"
                >
                    {showBackup ? '📱 Use authenticator app' : '🔑 Use a backup recovery code'}
                </button>

                <div className="text-center pt-2 border-t border-[var(--border-subtle)]">
                    <Link href="/login" className="text-xs text-[var(--foreground-muted)] hover:text-[var(--primary)] transition-colors">
                        ← Back to Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function Verify2FAPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[calc(100vh-var(--navbar-h))] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <Verify2FAContent />
        </Suspense>
    );
}
