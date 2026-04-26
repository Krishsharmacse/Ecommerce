import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import AnimatedBackground from '@/components/AnimatedBackground';
import './globals.css';

export const metadata: Metadata = {
  title: 'ShopVault — Secure Multi-Vendor E-Commerce',
  description: 'Premium multi-vendor marketplace with 3-tier role management. Browse exclusive products from verified vendors.',
  keywords: 'ecommerce, marketplace, multi-vendor, shop, secure, products',
  openGraph: {
    title: 'ShopVault',
    description: 'Secure Multi-Vendor E-Commerce Platform',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AnimatedBackground />
          <Navbar />
          <main>{children}</main>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: 500,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(20px)',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
