import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import ConditionalChrome from '@/components/ConditionalChrome';
import './globals.css';

export const metadata: Metadata = {
  title: 'ShopVault — Premium Multi-Vendor E-Commerce',
  description: 'Premium multi-vendor marketplace with 3-tier role management. Browse exclusive products from verified vendors.',
  keywords: 'ecommerce, marketplace, multi-vendor, shop, secure, products',
  openGraph: {
    title: 'ShopVault — Premium Multi-Vendor E-Commerce',
    description: 'Secure Multi-Vendor E-Commerce Platform',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ConditionalChrome>{children}</ConditionalChrome>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#1a1a1a',
                color: '#f0f0f0',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: 500,
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              },
              success: { iconTheme: { primary: '#3b82f6', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
