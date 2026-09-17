'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function DashboardRedirect() {
  const router = useRouter();
  const { authStatus, isAdmin, isVendor } = useAuth();

  useEffect(() => {
    if (authStatus === 'loading') return;

    if (authStatus === 'unauthenticated') {
      router.replace('/login?redirect=/dashboard');
      return;
    }

    if (isAdmin) {
      router.replace('/dashboard/admin');
    } else if (isVendor) {
      router.replace('/dashboard/vendor');
    } else {
      router.replace('/dashboard/customer');
    }
  }, [authStatus, isAdmin, isVendor, router]);

  return (
    <div className="min-h-[calc(100vh-var(--navbar-h))] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-10 h-10 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--foreground-muted)] font-mono">Routing to your workspace...</p>
      </div>
    </div>
  );
}
