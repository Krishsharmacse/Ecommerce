'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { authService, User } from '@/lib/auth';
import toast from 'react-hot-toast';

// Handles the redirect from backend after Google OAuth
function CallbackContent() {
    const params = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const processedRef = useRef(false);

    useEffect(() => {
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const ticket = params.get('ticket') || urlParams?.get('ticket');
        const token = params.get('token') || urlParams?.get('token');
        const error = params.get('error') || urlParams?.get('error');

        if (error) {
            const timer = setTimeout(() => {
                setStatus('error');
                toast.error('Google sign-in failed. Please try again.');
                setTimeout(() => { window.location.href = '/login'; }, 1500);
            }, 0);
            return () => clearTimeout(timer);
        }

        if (!ticket && !token) {
            const timer = setTimeout(() => {
                const retryTicket = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ticket') : null;
                if (!retryTicket) {
                    setStatus('error');
                    window.location.href = '/login';
                }
            }, 1500);
            return () => clearTimeout(timer);
        }

        // Prevent double execution in React StrictMode
        if (processedRef.current) return;
        processedRef.current = true;

        const handleSuccess = (user?: Partial<User> | null) => {
            setStatus('success');
            const name = user?.firstname || 'back';
            toast.success(`Welcome, ${name}! 🎉`);
            const redirect = localStorage.getItem('auth_redirect') || '/shop';
            localStorage.removeItem('auth_redirect');
            setTimeout(() => {
                window.location.href = redirect;
            }, 600);
        };

        if (ticket) {
            authService.exchangeOAuthTicket(ticket)
                .then((res) => {
                    handleSuccess(res?.user);
                })
                .catch((err) => {
                    console.error('OAuth ticket exchange failed:', err);
                    const existingToken = localStorage.getItem('token');
                    if (existingToken) {
                        handleSuccess();
                        return;
                    }
                    setStatus('error');
                    toast.error('OAuth ticket expired or already used.');
                    setTimeout(() => { window.location.href = '/login'; }, 2000);
                });
        } else if (token) {
            localStorage.setItem('token', token);
            handleSuccess();
        }
    }, [params]);

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
