import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '資産形成シミュレーター',
  description: '複利計算・シナリオ比較と、積み立て・NISA・取り崩しシミュレーション',
  manifest: '/interest/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '資産形成シミュレーター',
  },
  icons: {
    icon: '/interest/icon-192.png',
    apple: '/interest/icon-192.png',
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
      <body>{children}</body>
    </html>
  );
}
