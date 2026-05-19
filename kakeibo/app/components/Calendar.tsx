'use client';
import { useState } from 'react';
import { Transaction, Category } from '../types';

const abbr = (n: number) => {
  if (n === 0) return '';
  if (n >= 10000) return `${Math.round(n / 10000)}万`;
  if (n >= 1000)  return `${Math.round(n / 1000)}k`;
  return String(n);
};

interface Props {
  yearMonth: string;
  transactions: Transaction[];
  categories: Category[];
}

export default function Calendar({ yearMonth, transactions, categories }: Props) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [y, m] = yearMonth.split('-').map(Number);
  const firstDay    = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const today       = new Date();

  const catName = (id: string) => categories.find(c => c.id === id)?.name ?? id;

  const daily: Record<number, { inc: number; exp: number }> = {};
  for (const t of transactions) {
    const d = Number(t.date.split('-')[2]);
    if (!daily[d]) daily[d] = { inc: 0, exp: 0 };
    if (t.type === 'income') daily[d].inc += t.amount;
    else daily[d].exp += t.amount;
  }

  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const isToday = (d: number) =>
    today.getFullYear() === y && today.getMonth() + 1 === m && today.getDate() === d;

  const dayTxs = selectedDay
    ? transactions
        .filter(t => Number(t.date.split('-')[2]) === selectedDay)
        .sort((a, b) => a.type.localeCompare(b.type))
    : [];

  const handleDayClick = (d: number) => {
    setSelectedDay(prev => (prev === d ? null : d));
  };

  return (
    <div>
      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 mb-1">
        {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
          <div key={d} className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((d, di) => {
            const data     = d ? daily[d] : null;
            const selected = d === selectedDay;
            return (
              <div key={di}
                onClick={() => d && handleDayClick(d)}
                className={`min-h-[52px] p-0.5 border-t border-gray-50 cursor-pointer transition-colors
                  ${selected ? 'bg-blue-50 rounded-lg' : 'hover:bg-gray-50'}
                  ${di === 0 ? 'text-red-400' : di === 6 ? 'text-blue-400' : ''}`}>
                {d && (
                  <>
                    <span className={`text-xs font-medium block text-center
                      ${isToday(d) ? 'bg-blue-500 text-white rounded-full w-5 h-5 leading-5 mx-auto' :
                        selected  ? 'text-blue-600 font-bold' : ''}`}>
                      {d}
                    </span>
                    {data?.inc ? <p className="text-green-600 text-[9px] text-center leading-tight">{abbr(data.inc)}</p>  : null}
                    {data?.exp ? <p className="text-red-400   text-[9px] text-center leading-tight">{abbr(data.exp)}</p>  : null}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* 日別詳細パネル */}
      {selectedDay && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">
              {m}月{selectedDay}日の明細
            </h3>
            <button onClick={() => setSelectedDay(null)} className="text-gray-300 text-lg leading-none">×</button>
          </div>

          {dayTxs.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">この日の取引はありません</p>
          ) : (
            <div className="space-y-1.5">
              {dayTxs.map(t => (
                <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.type === 'income' ? 'bg-green-500' : 'bg-red-400'}`} />
                  <span className="text-xs text-gray-400 shrink-0">{catName(t.category)}</span>
                  <span className="text-xs text-gray-600 flex-1 truncate">{t.memo || '—'}</span>
                  <span className={`text-xs font-semibold shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'}¥{t.amount.toLocaleString()}
                  </span>
                </div>
              ))}

              {/* 日計サマリー */}
              {(() => {
                const inc = dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
                const exp = dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
                return (
                  <div className="flex justify-end gap-3 pt-1.5 text-xs text-gray-500">
                    {inc > 0 && <span className="text-green-600 font-medium">収入 ¥{inc.toLocaleString()}</span>}
                    {exp > 0 && <span className="text-red-500 font-medium">支出 ¥{exp.toLocaleString()}</span>}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
