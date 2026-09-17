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
            <div className="page-loader" style={{ paddingTop: '70px' }}>
                <div className="spinner spinner-primary spinner-lg" />
                <span>Loading admin panel...</span>
            </div>
        );
    }

    return <>{children}</>;
}
