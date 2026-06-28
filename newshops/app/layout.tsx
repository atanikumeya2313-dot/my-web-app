import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "えひめ新店チェック",
  description: "愛媛県内で最近オープン・オープン予定のお店を、AIで探して記録",
  manifest: "/newshops/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "新店チェック",
  },
  icons: {
    icon: "/newshops/icon-192.png",
    apple: "/newshops/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#10b981",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-emerald-50/40 text-gray-800 min-h-screen">{children}</body>
    </html>
  );
}
