'use client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Transaction } from '../types';

const fmt = (v: number) => v >= 10000 ? `${Math.round(v / 10000)}万` : v.toLocaleString('ja-JP');

export default function BalanceTrendGraph({ transactions }: { transactions: Transaction[] }) {
  const now = new Date();

  const months = Array.from({ length: 12 }, (_, i) => {
    const d  = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthTxs = transactions.filter(t => t.date.startsWith(ym));
    const income   = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense  = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { label: `${d.getMonth() + 1}月`, net: income - expense };
  });

  const hasData = months.some(m => m.net !== 0);
  if (!hasData) return <p className="text-center text-gray-400 text-sm py-6">データがありません</p>;

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3 text-right">月次収支（収入 − 支出）</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={months} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} width={38} />
          <Tooltip
            formatter={(v) => typeof v === 'number' ? [`¥${v.toLocaleString()}`, '収支'] : v}
          />
          <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="3 3" />
          <Area
            type="monotone" dataKey="net" name="収支"
            stroke="#3b82f6" fill="url(#posGrad)" strokeWidth={2}
            dot={(p) => {
              const { cx, cy, payload } = p;
              return (
                <circle key={payload.label} cx={cx} cy={cy} r={3}
                  fill={payload.net >= 0 ? '#3b82f6' : '#ef4444'}
                  stroke="white" strokeWidth={1} />
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
