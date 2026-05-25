'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const path = usePathname();
  const active = (href: string) => path === href ? 'text-blue-500' : 'text-gray-400';
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around z-50">
      <Link href="/" className={`flex flex-col items-center text-xs px-8 py-2 ${active('/')}`}>
        <span className="text-xl">📚</span>ホーム
      </Link>
    </nav>
  );
}
