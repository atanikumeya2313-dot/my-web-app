'use client';
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction, Category } from '../types';

const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'];

export default function ExpensePieChart({ transactions, categories }: { transactions: Transaction[]; categories: Category[] }) {
  const catName = (id: string) => categories.find(c => c.id === id)?.name ?? id;

  const grouped: Record<string, number> = {};
  for (const t of transactions.filter(t => t.type === 'expense')) {
    grouped[t.category] = (grouped[t.category] ?? 0) + t.amount;
  }
  const data = Object.entries(grouped).map(([id, value], i) => ({
    name: catName(id), value, fill: COLORS[i % COLORS.length],
  }));

  if (data.length === 0) return <p className="text-center text-gray-400 text-sm py-6">支出データがありません</p>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={false} />
        <Tooltip formatter={(v) => typeof v === 'number' ? `¥${v.toLocaleString()}` : v} />
        <Legend iconSize={10} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}
