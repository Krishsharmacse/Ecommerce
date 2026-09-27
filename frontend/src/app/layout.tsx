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
  icons: {
    icon: [
      { url: '/icon.png' },
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/apple-icon.png' },
    ],
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
                background: '#ffffff',
                color: '#101828',
                border: '1px solid #e4e7ec',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: 600,
                boxShadow: '0 8px 24px rgba(16,24,40,0.1)',
              },
              success: { iconTheme: { primary: '#039855', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#d92d20', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
