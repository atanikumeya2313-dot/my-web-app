import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from './components/BottomNav';

export const metadata: Metadata = {
  title: '読書記録',
  description: '読んだ本を記録するアプリ',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '読書記録',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b82f6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-800 antialiased">
        <div className="max-w-lg mx-auto min-h-screen pb-20">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
