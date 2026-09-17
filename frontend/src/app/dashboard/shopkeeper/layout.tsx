'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ShopkeeperLayout({ children }: { children: React.ReactNode }) {
    const { authStatus, isShopkeeper } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (authStatus === 'loading') return;
        if (authStatus === 'unauthenticated') {
            router.replace('/login?redirect=/dashboard/shopkeeper');
        } else if (!isShopkeeper) {
            router.replace('/');
        }
    }, [authStatus, isShopkeeper, router]);

    if (authStatus === 'loading' || authStatus === 'unauthenticated' || !isShopkeeper) {
        return (
            <div className="page-loader">
                <div className="spinner spinner-lg" style={{ borderTopColor: '#fbbf24' }} />
                <span style={{ color: '#fbbf24' }}>Loading shopkeeper panel...</span>
            </div>
        );
    }

    return <>{children}</>;
}
