'use client';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction, Category, TxType } from '../types';
import { fmtAxis, fmtFull } from '../lib/format';

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#84cc16', '#6366f1',
];

interface Props {
  transactions: Transaction[];
  categories: Category[];
}

export default function CategoryTrendGraph({ transactions, categories }: Props) {
  const [type,       setType]       = useState<TxType>('expense');
  const [hiddenCats, setHiddenCats] = useState<Set<string>>(new Set());
  const [showTable,  setShowTable]  = useState(false);

  const filteredCats = categories.filter(c => c.type === type);

  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d   = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const ym  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getMonth() + 1}月`;
    const monthTxs = transactions.filter(t => t.date.startsWith(ym) && t.type === type);

    const entry: Record<string, string | number> = { label, ym };
    for (const cat of filteredCats) {
      entry[cat.id] = monthTxs
        .filter(t => t.category === cat.id)
        .reduce((s, t) => s + t.amount, 0);
    }
    return entry;
  });

  const visibleCats = filteredCats.filter(c => !hiddenCats.has(c.id));
  const hasData = months.some(m => filteredCats.some(c => (m[c.id] as number) > 0));

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
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={months} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10 }} width={44} domain={['auto', 'auto']} />
            <Tooltip
              formatter={(v, name) => {
                const cat = filteredCats.find(c => c.id === name);
                return [typeof v === 'number' ? fmtFull(v) : v, cat?.name ?? name];
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

      {/* 月別金額テーブル */}
      {hasData && (
        <div className="mt-3">
          <button onClick={() => setShowTable(v => !v)}
            className="w-full flex items-center justify-between py-2 text-xs font-medium text-gray-500">
            <span>月別金額テーブル</span>
            <span className="text-gray-400">{showTable ? '▲ 閉じる' : '▼ 開く'}</span>
          </button>

          {showTable && (
            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="text-xs w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium sticky left-0 bg-gray-50 whitespace-nowrap">月</th>
                    {visibleCats.map((cat) => (
                      <th key={cat.id} className="px-3 py-2 text-right font-medium whitespace-nowrap"
                        style={{ color: COLORS[filteredCats.indexOf(cat) % COLORS.length] }}>
                        {cat.name}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right text-gray-500 font-medium whitespace-nowrap">合計</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map(m => {
                    const total = visibleCats.reduce((s, c) => s + (m[c.id] as number), 0);
                    return (
                      <tr key={m.ym as string} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-600 font-medium sticky left-0 bg-white whitespace-nowrap">{m.label}</td>
                        {visibleCats.map(cat => {
                          const val = m[cat.id] as number;
                          return (
                            <td key={cat.id} className={`px-3 py-2 text-right whitespace-nowrap ${val > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                              {val > 0 ? fmtFull(val) : '—'}
                            </td>
                          );
                        })}
                        <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${total > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                          {total > 0 ? fmtFull(total) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* 合計行 */}
                <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                  <tr>
                    <td className="px-3 py-2 text-gray-600 font-semibold sticky left-0 bg-gray-50">合計</td>
                    {visibleCats.map(cat => {
                      const total = months.reduce((s, m) => s + (m[cat.id] as number), 0);
                      return (
                        <td key={cat.id} className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                          {fmtFull(total)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-bold text-gray-800 whitespace-nowrap">
                      {fmtFull(months.reduce((s, m) => s + visibleCats.reduce((cs, c) => cs + (m[c.id] as number), 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
