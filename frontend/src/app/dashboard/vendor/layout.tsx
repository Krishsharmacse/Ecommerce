'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
    const { authStatus, isVendor, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (authStatus === 'loading') return;
        if (authStatus === 'unauthenticated') {
            router.replace('/login?redirect=/dashboard/vendor');
        } else if (!isVendor && !isAdmin) {
            router.replace('/dashboard/customer');
        }
    }, [authStatus, isVendor, isAdmin, router]);

    if (authStatus === 'loading' || authStatus === 'unauthenticated' || (!isVendor && !isAdmin)) {
        return (
            <div className="min-h-[calc(100vh-var(--navbar-h))] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-10 h-10 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-[var(--foreground-muted)] font-mono">Loading Vendor Workspace...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
