'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ShopkeeperRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/vendor');
    }, [router]);

    return (
        <div className="min-h-[calc(100vh-var(--navbar-h))] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[var(--foreground-muted)] font-mono">Redirecting to Vendor Workspace...</p>
            </div>
        </div>
    );
}
