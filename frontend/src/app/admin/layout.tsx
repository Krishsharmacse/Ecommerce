'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { isLoggedIn, isAdmin, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading) {
            if (!isLoggedIn) {
                router.push('/login');
            } else if (!isAdmin) {
                router.push('/');
            }
        }
    }, [isLoggedIn, isAdmin, isLoading, router]);

    if (isLoading || !isLoggedIn || !isAdmin) {
        return (
            <div className="page-loader" style={{ paddingTop: '70px' }}>
                <div className="spinner spinner-primary spinner-lg" />
                <span>Loading admin panel...</span>
            </div>
        );
    }

    return <>{children}</>;
}
