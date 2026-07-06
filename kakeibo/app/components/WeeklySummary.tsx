'use client';
import { useState } from 'react';
import { Transaction, Category } from '../types';

interface Props {
  transactions: Transaction[];
  yearMonth: string; // YYYY-MM
  categories: Category[];
}

function fmt(n: number) { return `¥${n.toLocaleString()}`; }

export default function WeeklySummary({ transactions, yearMonth, categories }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const catName = (id: string) => categories.find(c => c.id === id)?.name ?? id;

  const [y, m] = yearMonth.split('-').map(Number);
  const today   = new Date();
  const isCurrentMonth = today.getFullYear() === y && today.getMonth() + 1 === m;
  const todayDay = isCurrentMonth ? today.getDate() : -1;
  const daysInM  = new Date(y, m, 0).getDate();

  const weekRanges = [
    { start: 1,  end: 7 },
    { start: 8,  end: 14 },
    { start: 15, end: 21 },
    { start: 22, end: 28 },
    { start: 29, end: daysInM },
  ].filter(w => w.start <= daysInM);

  const weeks = weekRanges.map((range, i) => {
    const weekTxs = transactions.filter(t => {
      const day = parseInt(t.date.split('-')[2]);
      return day >= range.start && day <= range.end;
    });
    return {
      label:    `第${i + 1}週`,
      dateRange:`${m}/${range.start}〜${m}/${range.end}`,
      startDay: range.start,
      endDay:   range.end,
      income:   weekTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense:  weekTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      txs:      [...weekTxs].sort((a, b) => a.date.localeCompare(b.date)),
    };
  });

  const maxExpense = Math.max(...weeks.map(w => w.expense), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-600 mb-3">週次サマリー</h2>
      <p className="text-[11px] text-gray-400 mb-2">週をタップするとその週の明細が見られます</p>
      <div className="space-y-2">
        {weeks.map((week, i) => {
          const isCurrent = todayDay >= week.startDay && todayDay <= week.endDay;
          const net       = week.income - week.expense;
          const isOpen    = openIdx === i;

          return (
            <div key={i}
              className={`rounded-lg ${isCurrent ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
              <button onClick={() => setOpenIdx(isOpen ? null : i)}
                className="w-full text-left px-3 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-gray-300 text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>▸</span>
                    <span className="text-xs font-semibold text-gray-700">{week.label}</span>
                    <span className="text-[10px] text-gray-400">{week.dateRange}</span>
                    {isCurrent && (
                      <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                        今週
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-bold ${net >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                    {net >= 0 ? '+' : ''}{fmt(net)}
                  </span>
                </div>

                <div className="flex gap-4 text-[11px] mb-1.5 pl-4">
                  <span className="text-green-600">収入 {fmt(week.income)}</span>
                  <span className="text-red-500">支出 {fmt(week.expense)}</span>
                </div>

                <div className="h-1 bg-gray-200 rounded-full overflow-hidden ml-4">
                  <div
                    className={`h-full rounded-full transition-all ${isCurrent ? 'bg-blue-400' : 'bg-red-300'}`}
                    style={{ width: `${week.expense > 0 ? (week.expense / maxExpense) * 100 : 0}%` }}
                  />
                </div>
              </button>

              {/* その週の明細 */}
              {isOpen && (
                <div className="px-3 pb-2.5 pt-0.5">
                  {week.txs.length === 0 ? (
                    <p className="text-center text-gray-400 text-xs py-3">この週の取引はありません</p>
                  ) : (
                    <ul className="space-y-1 border-t border-gray-200/70 pt-2">
                      {week.txs.map(t => (
                        <li key={t.id} className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 shrink-0 w-9">{t.date.slice(5).replace('-', '/')}</span>
                          <div className="flex-1 min-w-0 flex items-center gap-1.5">
                            {t.type === 'transfer'
                              ? <span className="text-[10px] bg-purple-50 text-purple-600 rounded px-1.5 py-0.5 shrink-0">振替</span>
                              : <span className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 shrink-0">{catName(t.category)}</span>}
                            {t.memo && <span className="text-[11px] text-gray-500 truncate">{t.memo}</span>}
                          </div>
                          <span className={`text-xs font-semibold shrink-0 ${
                            t.type === 'income' ? 'text-green-600' : t.type === 'transfer' ? 'text-purple-500' : 'text-red-500'
                          }`}>
                            {t.type === 'income' ? '+' : t.type === 'transfer' ? '↔' : '-'}{fmt(t.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
