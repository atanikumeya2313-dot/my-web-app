import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ブラウザ RPG",
  description: "シンプルなターン制RPG",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-gray-900">{children}</body>
    </html>
  );
}
