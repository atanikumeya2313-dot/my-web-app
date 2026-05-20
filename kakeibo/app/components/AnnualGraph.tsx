'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction } from '../types';

const fmt = (v: number) => v >= 10000 ? `${Math.round(v / 10000)}万` : v.toLocaleString('ja-JP');

export default function AnnualGraph({ transactions }: { transactions: Transaction[] }) {
  const now = new Date();

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getMonth() + 1}月`;
    const monthTxs = transactions.filter(t => t.date.startsWith(ym));
    const income  = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { label, income, expense };
  });

  const hasData = months.some(m => m.income > 0 || m.expense > 0);
  if (!hasData) return <p className="text-center text-gray-400 text-sm py-6">データがありません</p>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={months} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} width={36} />
        <Tooltip formatter={(v) => typeof v === 'number' ? `¥${v.toLocaleString()}` : v} />
        <Legend iconSize={10} iconType="circle" />
        <Bar dataKey="income"  name="収入" fill="#10b981" radius={[3,3,0,0]} />
        <Bar dataKey="expense" name="支出" fill="#ef4444" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}