import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "サブスク管理",
  description: "契約中のサブスクを登録して、次回更新日と月・年の合計を見える化",
  manifest: "/subsc/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "サブスク",
  },
  icons: {
    icon: "/subsc/icon-192.png",
    apple: "/subsc/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-violet-50/40 text-gray-800 min-h-screen">{children}</body>
    </html>
  );
}
