import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '複利計算機',
  description: '元本と年利から将来の金額を計算',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
