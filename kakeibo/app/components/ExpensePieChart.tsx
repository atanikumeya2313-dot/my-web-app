'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction } from '../types';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

interface ExpensePieChartProps {
  transactions: Transaction[];
}

export default function ExpensePieChart({ transactions }: ExpensePieChartProps) {
  const expenses = transactions.filter((t) => t.type === 'expense');

  const data = expenses.reduce<{ name: string; value: number }[]>((acc, t) => {
    const existing = acc.find((d) => d.name === t.category);
    if (existing) {
      existing.value += t.amount;
    } else {
      acc.push({ name: t.category, value: t.amount });
    }
    return acc;
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        支出データがありません
      </div>
    );
  }

  const fmt = (value: number) =>
    value.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => fmt(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
