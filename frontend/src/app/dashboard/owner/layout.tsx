'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
    const { authStatus, isOwner } = useAuth();
    const router = useRouter();
    useEffect(() => {
        if (authStatus === 'loading') return;
        if (authStatus === 'unauthenticated') {
            router.replace('/login?redirect=/dashboard/owner');
        } else if (!isOwner) {
            router.replace('/');
        }
    }, [authStatus, isOwner, router]);
    if (authStatus === 'loading' || authStatus === 'unauthenticated' || !isOwner) {
        return <div className="page-loader"><div className="spinner spinner-lg" style={{ borderTopColor: '#f9a8d4' }} /><span style={{ color: '#f9a8d4' }}>Loading owner panel...</span></div>;
    }
    return <>{children}</>;
}
