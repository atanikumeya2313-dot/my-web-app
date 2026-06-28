import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "アプリ改善メモ",
  description: "各アプリの不便な点をいつでもメモ。週末にまとめて直す。",
  manifest: "/appnotes/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "改善メモ",
  },
  icons: {
    icon: "/appnotes/icon-192.png",
    apple: "/appnotes/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ea580c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-orange-50/40 text-gray-800 min-h-screen">{children}</body>
    </html>
  );
}
