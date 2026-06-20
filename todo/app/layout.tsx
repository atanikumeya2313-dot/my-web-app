import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import BottomNav from "./components/BottomNav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TODO",
  description: "シンプルなTODO管理アプリ（繰り返しタスク対応）",
  manifest: "/todo/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TODO",
  },
  icons: {
    icon: "/todo/icon-192.png",
    apple: "/todo/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#3b82f6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full bg-gray-50">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
