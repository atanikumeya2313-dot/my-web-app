import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "献立アシスタント",
  description: "今ある食材から、AIが今晩の献立を提案。在庫連携・写真読み取り対応",
  manifest: "/kondate/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "献立",
  },
  icons: {
    icon: "/kondate/icon-192.png",
    apple: "/kondate/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f97316",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-orange-50/40 text-gray-800 min-h-screen">{children}</body>
    </html>
  );
}
