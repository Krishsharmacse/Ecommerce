'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function VerifyOTPPage() {
    const router = useRouter();
    const { refreshUser } = useAuth();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [verified, setVerified] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem('pendingVerifyEmail') || '';
        setEmail(stored);
    }, []);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = [...otp];
        pasted.split('').forEach((char, i) => { newOtp[i] = char; });
        setOtp(newOtp);
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    };

    const handleVerify = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            toast.error('Please enter the complete 6-digit code');
            return;
        }
        if (!email) {
            toast.error('Email not found. Please login first.');
            router.push('/login');
            return;
        }

        setLoading(true);
        try {
            const res = await authService.verifyOTP({ email, otp: otpString });
            if (res.success) {
                setVerified(true);
                refreshUser();
                toast.success('Email verified successfully!');
                localStorage.removeItem('pendingVerifyEmail');
                setTimeout(() => router.push('/shop'), 1800);
            } else {
                toast.error(res.message);
            }
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            toast.error(axiosError?.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email) {
            toast.error('No email address found');
            return;
        }
        setResendLoading(true);
        try {
            const res = await authService.resendOTP(email);
            if (res.success) {
                toast.success('New verification code sent');
                setCountdown(60);
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            } else {
                toast.error(res.message);
            }
        } catch {
            toast.error('Failed to resend code');
        } finally {
            setResendLoading(false);
        }
    };

    if (verified) {
        return (
            <div className="min-h-[calc(100vh-var(--navbar-h))] flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-md text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 grid place-items-center mx-auto text-2xl">
                        ✓
                    </div>
                    <h2 className="heading-2 text-[var(--foreground)]">Email Verified</h2>
                    <p className="body-sm text-[var(--foreground-muted)]">
                        Your account is ready. Redirecting to the catalog...
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
                        ✉️
                    </div>
                    <h1 className="heading-2 text-[var(--foreground)]">Verify your email</h1>
                    <p className="body-sm text-[var(--foreground-muted)]">
                        Enter the 6-digit code sent to{' '}
                        <strong className="text-[var(--foreground)]">{email || 'your email'}</strong>
                    </p>
                </div>

                {!email && (
                    <div className="field">
                        <label className="field__label" htmlFor="fallback-email">Email Address</label>
                        <input
                            id="fallback-email"
                            type="email"
                            className="input"
                            placeholder="Enter your email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                )}

                {/* 6 Digit Inputs */}
                <div className="flex items-center justify-between gap-2" onPaste={handlePaste}>
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={el => { inputRefs.current[index] = el; }}
                            id={`otp-${index}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleOtpChange(index, e.target.value)}
                            onKeyDown={e => handleKeyDown(index, e)}
                            autoFocus={index === 0}
                            className="w-12 h-14 text-center text-xl font-mono font-semibold bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all"
                        />
                    ))}
                </div>

                <button
                    id="verify-otp-submit"
                    type="button"
                    onClick={handleVerify}
                    disabled={loading || otp.join('').length !== 6}
                    className={`btn btn--primary btn--lg w-full justify-center ${loading ? 'btn--loading' : ''}`}
                >
                    {loading ? 'Verifying code...' : 'Confirm Verification'}
                </button>

                {/* Resend Section */}
                <div className="text-center space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                    {countdown > 0 ? (
                        <p className="text-xs text-[var(--foreground-muted)]">
                            Resend code in <strong className="text-[var(--foreground)]">{countdown}s</strong>
                        </p>
                    ) : (
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resendLoading}
                            className="btn--link text-xs font-medium"
                        >
                            {resendLoading ? 'Sending new code...' : 'Didn’t receive code? Resend'}
                        </button>
                    )}

                    <div>
                        <Link href="/login" className="text-xs text-[var(--foreground-muted)] hover:text-[var(--primary)] transition-colors">
                            ← Back to Sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
