'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
    const { authStatus, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (authStatus === 'loading') return;
        if (authStatus === 'unauthenticated') {
            router.replace('/login?redirect=/dashboard/admin');
        } else if (!isAdmin) {
            router.replace('/dashboard/customer');
        }
    }, [authStatus, isAdmin, router]);

    if (authStatus === 'loading' || authStatus === 'unauthenticated' || !isAdmin) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-10 h-10 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-zinc-400 font-mono">Verifying Administrator Privileges...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
