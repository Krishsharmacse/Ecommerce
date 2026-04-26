'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
            toast.error('Please enter the complete 6-digit OTP');
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
                toast.success('Email verified successfully! 🎉');
                localStorage.removeItem('pendingVerifyEmail');
                setTimeout(() => router.push('/shop'), 2000);
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
            toast.error('No email found');
            return;
        }
        setResendLoading(true);
        try {
            const res = await authService.resendOTP(email);
            if (res.success) {
                toast.success('New OTP sent to your email!');
                setCountdown(60);
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            } else {
                toast.error(res.message);
            }
        } catch {
            toast.error('Failed to resend OTP');
        } finally {
            setResendLoading(false);
        }
    };

    if (verified) {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'float 2s ease-in-out infinite' }}>✅</div>
                    <h2 className="auth-title">Verified!</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Your email has been verified. Redirecting to shop...
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
                    <div className="auth-icon">📬</div>
                    <h1 className="auth-title">Verify Email</h1>
                    <p className="auth-subtitle">
                        Enter the 6-digit OTP sent to{' '}
                        <strong style={{ color: 'var(--primary-light)' }}>
                            {email || 'your email'}
                        </strong>
                    </p>
                </div>

                {!email && (
                    <div className="form-group mb-4">
                        <label className="form-label">Your Email</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="Enter your email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                )}

                {/* OTP Inputs */}
                <div className="otp-inputs" onPaste={handlePaste} style={{ marginBottom: '1.5rem' }}>
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={el => { inputRefs.current[index] = el; }}
                            id={`otp-${index}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            className="otp-input"
                            value={digit}
                            onChange={e => handleOtpChange(index, e.target.value)}
                            onKeyDown={e => handleKeyDown(index, e)}
                            autoFocus={index === 0}
                        />
                    ))}
                </div>

                <button
                    id="verify-otp-submit"
                    className={`btn btn-primary w-full btn-lg ${loading ? 'btn-loading' : ''}`}
                    onClick={handleVerify}
                    disabled={loading || otp.join('').length !== 6}
                >
                    {loading ? (
                        <>
                            <span className="spinner" />
                            Verifying...
                        </>
                    ) : (
                        'Verify OTP'
                    )}
                </button>

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    {countdown > 0 ? (
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            Resend OTP in <strong style={{ color: 'var(--primary-light)' }}>{countdown}s</strong>
                        </p>
                    ) : (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={handleResend}
                            disabled={resendLoading}
                        >
                            {resendLoading ? (
                                <><span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'rgba(108,99,255,0.2)' }} /> Sending...</>
                            ) : (
                                '📧 Resend OTP'
                            )}
                        </button>
                    )}
                </div>

                <div className="auth-footer">
                    <a href="/login" className="auth-link">
                        ← Back to Login
                    </a>
                </div>
            </div>
        </div>
    );
}
