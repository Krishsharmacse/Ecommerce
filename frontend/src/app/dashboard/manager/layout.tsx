'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
    const { isLoggedIn, isManager, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!isLoggedIn) router.push('/login');
            else if (!isManager) router.push('/');
        }
    }, [isLoggedIn, isManager, isLoading, router]);

    if (isLoading || !isLoggedIn || !isManager) {
        return (
            <div className="page-loader">
                <div className="spinner spinner-lg" style={{ borderTopColor: 'var(--cyan)' }} />
                <span style={{ color: 'var(--cyan)' }}>Loading store dashboard...</span>
            </div>
        );
    }

    return <>{children}</>;
}
