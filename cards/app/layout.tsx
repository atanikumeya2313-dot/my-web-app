import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI暗記カード",
  description: "文章・トピック・写真からAIが暗記カードを作成。間隔反復で覚える。",
  manifest: "/cards/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "暗記カード",
  },
  icons: {
    icon: "/cards/icon-192.png",
    apple: "/cards/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-slate-50 text-gray-800 min-h-screen">{children}</body>
    </html>
  );
}
