'use client';

import { Transaction } from '../types';

interface SummaryProps {
  transactions: Transaction[];
}

export default function Summary({ transactions }: SummaryProps) {
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expense;

  const fmt = (n: number) =>
    n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-blue-50 rounded-xl p-4 text-center">
        <p className="text-sm text-blue-600 font-medium">収入</p>
        <p className="text-xl font-bold text-blue-700 mt-1">{fmt(income)}</p>
      </div>
      <div className="bg-red-50 rounded-xl p-4 text-center">
        <p className="text-sm text-red-600 font-medium">支出</p>
        <p className="text-xl font-bold text-red-700 mt-1">{fmt(expense)}</p>
      </div>
      <div className={`rounded-xl p-4 text-center ${balance >= 0 ? 'bg-green-50' : 'bg-orange-50'}`}>
        <p className={`text-sm font-medium ${balance >= 0 ? 'text-green-600' : 'text-orange-600'}`}>残高</p>
        <p className={`text-xl font-bold mt-1 ${balance >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
          {fmt(balance)}
        </p>
      </div>
    </div>
  );
}
