'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
    const { isLoggedIn, isOwner, isLoading } = useAuth();
    const router = useRouter();
    useEffect(() => {
        if (!isLoading) {
            if (!isLoggedIn) router.push('/login');
            else if (!isOwner) router.push('/');
        }
    }, [isLoggedIn, isOwner, isLoading, router]);
    if (isLoading || !isLoggedIn || !isOwner) {
        return <div className="page-loader"><div className="spinner spinner-lg" style={{ borderTopColor: '#f9a8d4' }} /><span style={{ color: '#f9a8d4' }}>Loading owner panel...</span></div>;
    }
    return <>{children}</>;
}
