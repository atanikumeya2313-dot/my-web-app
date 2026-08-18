import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ヒロサバ育成管理",
  description: "僕のヒーローアカデミア UNITED SURVIVAL のキャラ育成を管理・見える化",
  manifest: "/hirosaba/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ヒロサバ育成",
  },
  icons: {
    icon: "/hirosaba/icon-192.png",
    apple: "/hirosaba/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#334155",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-800 min-h-screen">{children}</body>
    </html>
  );
}
