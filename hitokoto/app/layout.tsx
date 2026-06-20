import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ひとこと日記",
  description: "一日一言の記録に、AIがそっと一言を返します",
  manifest: "/diary/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ひとこと日記",
  },
  icons: {
    icon: "/diary/icon-192.png",
    apple: "/diary/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#b45309",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-[#faf8f4] text-gray-800 min-h-screen">{children}</body>
    </html>
  );
}
