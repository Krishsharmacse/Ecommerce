'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
    const { authStatus, isManager } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (authStatus === 'loading') return;
        if (authStatus === 'unauthenticated') {
            router.replace('/login?redirect=/dashboard/manager');
        } else if (!isManager) {
            router.replace('/');
        }
    }, [authStatus, isManager, router]);

    if (authStatus === 'loading' || authStatus === 'unauthenticated' || !isManager) {
        return (
            <div className="page-loader">
                <div className="spinner spinner-lg" style={{ borderTopColor: 'var(--cyan)' }} />
                <span style={{ color: 'var(--cyan)' }}>Loading store dashboard...</span>
            </div>
        );
    }

    return <>{children}</>;
}
