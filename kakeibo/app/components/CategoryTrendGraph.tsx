'use client';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Transaction, Category, TxType } from '../types';

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#84cc16', '#6366f1',
];

const fmt = (v: number) => v >= 10000 ? `${Math.round(v / 10000)}万` : String(v);

interface Props {
  transactions: Transaction[];
  categories: Category[];
}

export default function CategoryTrendGraph({ transactions, categories }: Props) {
  const [type, setType]           = useState<TxType>('expense');
  const [hiddenCats, setHiddenCats] = useState<Set<string>>(new Set());

  const filteredCats = categories.filter(c => c.type === type);

  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d  = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getMonth() + 1}月`;
    const monthTxs = transactions.filter(t => t.date.startsWith(ym) && t.type === type);

    const entry: Record<string, string | number> = { label };
    for (const cat of filteredCats) {
      entry[cat.id] = monthTxs
        .filter(t => t.category === cat.id)
        .reduce((s, t) => s + t.amount, 0);
    }
    return entry;
  });

  const hasData = months.some(m =>
    filteredCats.some(c => (m[c.id] as number) > 0)
  );

  const toggleCat = (id: string) => {
    setHiddenCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div>
      {/* 収入・支出 切り替え */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-4">
        {(['expense', 'income'] as TxType[]).map(t => (
          <button key={t} onClick={() => { setType(t); setHiddenCats(new Set()); }}
            className={`flex-1 py-1.5 text-sm font-medium transition-colors ${type === t ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}>
            {t === 'expense' ? '支出' : '収入'}
          </button>
        ))}
      </div>

      {/* カテゴリ切り替えチップ */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {filteredCats.map((cat, i) => {
          const color  = COLORS[i % COLORS.length];
          const hidden = hiddenCats.has(cat.id);
          return (
            <button key={cat.id} onClick={() => toggleCat(cat.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${hidden ? 'bg-white text-gray-400 border-gray-200' : 'text-white border-transparent'}`}
              style={hidden ? {} : { backgroundColor: color }}>
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* グラフ */}
      {!hasData ? (
        <p className="text-center text-gray-400 text-sm py-6">データがありません</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={months} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} width={36} />
            <Tooltip
              formatter={(v, name) => {
                const cat = filteredCats.find(c => c.id === name);
                return [typeof v === 'number' ? `¥${v.toLocaleString()}` : v, cat?.name ?? name];
              }}
            />
            {filteredCats.map((cat, i) =>
              hiddenCats.has(cat.id) ? null : (
                <Line
                  key={cat.id}
                  type="monotone"
                  dataKey={cat.id}
                  name={cat.id}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
