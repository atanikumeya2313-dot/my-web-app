'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/',          label: 'タスク',      icon: '✓' },
  { href: '/calendar',  label: 'カレンダー',  icon: '📅' },
  { href: '/stats',     label: '統計',        icon: '📊' },
  { href: '/settings',  label: '設定',        icon: '⚙' },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-30 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto flex">
        {ITEMS.map(item => (
          <Link key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-medium transition-colors
              ${path === item.href ? 'text-blue-500' : 'text-gray-400'}`}>
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
