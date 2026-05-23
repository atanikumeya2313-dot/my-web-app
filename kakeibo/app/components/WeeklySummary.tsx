'use client';
import { Transaction } from '../types';

interface Props {
  transactions: Transaction[];
  yearMonth: string; // YYYY-MM
}

function fmt(n: number) { return `¥${n.toLocaleString()}`; }

export default function WeeklySummary({ transactions, yearMonth }: Props) {
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
    };
  });

  const maxExpense = Math.max(...weeks.map(w => w.expense), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">週次サマリー</h2>
      <div className="space-y-2">
        {weeks.map((week, i) => {
          const isCurrent = todayDay >= week.startDay && todayDay <= week.endDay;
          const net       = week.income - week.expense;

          return (
            <div key={i}
              className={`rounded-lg px-3 py-2.5 ${isCurrent ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 flex-wrap">
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

              <div className="flex gap-4 text-[11px] mb-1.5">
                <span className="text-green-600">収入 {fmt(week.income)}</span>
                <span className="text-red-500">支出 {fmt(week.expense)}</span>
              </div>

              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isCurrent ? 'bg-blue-400' : 'bg-red-300'}`}
                  style={{ width: `${week.expense > 0 ? (week.expense / maxExpense) * 100 : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
