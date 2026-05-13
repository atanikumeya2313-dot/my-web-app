'use client';

import { Transaction } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export default function TransactionList({ transactions, onDelete }: TransactionListProps) {
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    return (
      <p className="text-center text-gray-400 text-sm py-8">この月のデータはありません</p>
    );
  }

  const fmt = (n: number) =>
    n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

  return (
    <ul className="divide-y divide-gray-100">
      {sorted.map((tx) => (
        <li key={tx.id} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 w-16 shrink-0">{tx.date.slice(5)}</span>
            <div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {tx.category}
              </span>
              {tx.memo && (
                <span className="ml-2 text-sm text-gray-500">{tx.memo}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`font-semibold ${
                tx.type === 'income' ? 'text-blue-600' : 'text-red-500'
              }`}
            >
              {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
            </span>
            <button
              onClick={() => onDelete(tx.id)}
              className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
              aria-label="削除"
            >
              ×
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
