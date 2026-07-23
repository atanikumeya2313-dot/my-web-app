import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ジム記録",
  description: "筋トレ・有酸素を記録して、連続記録と進捗を見える化。AIメニュー提案つき",
  manifest: "/gym/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ジム記録",
  },
  icons: {
    icon: "/gym/icon-192.png",
    apple: "/gym/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#e11d48",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-rose-50/40 text-gray-800 min-h-screen">{children}</body>
    </html>
  );
}
