'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { authStatus, isAdmin } = useAuth();

    useEffect(() => {
        if (authStatus === 'loading') return;
        if (authStatus === 'unauthenticated') {
            router.replace('/login?redirect=/admin');
        } else if (!isAdmin) {
            router.replace('/');
        }
    }, [authStatus, isAdmin, router]);

    if (authStatus === 'loading' || authStatus === 'unauthenticated' || !isAdmin) {
        return (
            <div className="min-h-[calc(100vh-var(--navbar-h))] flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-[var(--foreground-muted)] font-mono">Loading admin panel...</span>
            </div>
        );
    }

    return <>{children}</>;
}
