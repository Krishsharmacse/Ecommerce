'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/auth';
import toast from 'react-hot-toast';

// Handles the redirect from backend after Google OAuth
function CallbackContent() {
    const router = useRouter();
    const params = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        const ticket = params.get('ticket');
        const token = params.get('token');
        const error = params.get('error');

        if (error) {
            setStatus('error');
            toast.error('Google sign-in failed. Please try again.');
            setTimeout(() => router.push('/login'), 2000);
            return;
        }

        const handleSuccess = () => {
            authService.getProfile()
                .then(user => {
                    setStatus('success');
                    toast.success(`Welcome, ${user?.firstname || 'back'}! 🎉`);
                    setTimeout(() => router.push('/shop'), 1200);
                })
                .catch(() => {
                    setStatus('error');
                    toast.error('Could not load profile. Please try again.');
                    setTimeout(() => router.push('/login'), 2000);
                });
        };

        if (ticket) {
            authService.exchangeOAuthTicket(ticket)
                .then(() => handleSuccess())
                .catch(() => {
                    setStatus('error');
                    toast.error('OAuth ticket expired or already used.');
                    setTimeout(() => router.push('/login'), 2000);
                });
        } else if (token) {
            localStorage.setItem('token', token);
            handleSuccess();
        } else {
            setStatus('error');
            router.push('/login');
        }
    }, [params, router]);

    return (
        <div className="auth-page">
            <div className="auth-card" style={{ textAlign: 'center' }}>
                {status === 'loading' && (
                    <>
                        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔄</div>
                        <h2 className="auth-title">Signing you in...</h2>
                        <p style={{ color: 'var(--text-muted)', marginTop: '.5rem' }}>
                            Completing Google authentication
                        </p>
                        <div className="spinner spinner-primary spinner-lg" style={{ margin: '1.5rem auto 0' }} />
                    </>
                )}
                {status === 'success' && (
                    <>
                        <div style={{ fontSize: '3.5rem', marginBottom: '1rem', animation: 'float 2s ease-in-out infinite' }}>✅</div>
                        <h2 className="auth-title">Signed in!</h2>
                        <p style={{ color: 'var(--text-muted)', marginTop: '.5rem' }}>Redirecting to shop...</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>❌</div>
                        <h2 className="auth-title">Sign-in failed</h2>
                        <p style={{ color: 'var(--text-muted)', marginTop: '.5rem' }}>Redirecting back to login...</p>
                    </>
                )}
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div className="spinner spinner-primary spinner-lg" style={{ margin: '0 auto' }} />
                </div>
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
