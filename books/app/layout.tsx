import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI本だな",
  description: "読んだ本を記録して、傾向からAIが次のおすすめを教えてくれる読書ノート",
  manifest: "/books/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "本だな",
  },
  icons: {
    icon: "/books/icon-192.png",
    apple: "/books/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#d97706",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-amber-50/40 text-gray-800 min-h-screen">{children}</body>
    </html>
  );
}
