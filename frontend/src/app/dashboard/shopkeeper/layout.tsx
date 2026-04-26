'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ShopkeeperLayout({ children }: { children: React.ReactNode }) {
    const { isLoggedIn, isShopkeeper, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!isLoggedIn) router.push('/login');
            else if (!isShopkeeper) router.push('/');
        }
    }, [isLoggedIn, isShopkeeper, isLoading, router]);

    if (isLoading || !isLoggedIn || !isShopkeeper) {
        return (
            <div className="page-loader">
                <div className="spinner spinner-lg" style={{ borderTopColor: '#fbbf24' }} />
                <span style={{ color: '#fbbf24' }}>Loading shopkeeper panel...</span>
            </div>
        );
    }

    return <>{children}</>;
}
