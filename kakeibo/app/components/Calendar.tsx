'use client';

import { Transaction } from '../types';

interface CalendarProps {
  yearMonth: string;
  transactions: Transaction[];
}

const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'];

function abbr(n: number): string {
  if (n >= 100000) return `${Math.floor(n / 10000)}万`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${Math.floor(n / 1000)}k`;
  return String(n);
}

export default function Calendar({ yearMonth, transactions }: CalendarProps) {
  const [year, month] = yearMonth.split('-').map(Number);
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const daily: Record<number, { income: number; expense: number }> = {};
  for (const t of transactions) {
    const day = parseInt(t.date.slice(8), 10);
    if (!daily[day]) daily[day] = { income: 0, expense: 0 };
    if (t.type === 'income') daily[day].income += t.amount;
    else daily[day].expense += t.amount;
  }

  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDate = today.getDate();

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 h-fit">
      <h2 className="text-sm font-semibold text-gray-600 mb-3">カレンダー</h2>
      <div className="grid grid-cols-7 gap-px">
        {WEEK_DAYS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const d = daily[day];
          const isToday = isCurrentMonth && day === todayDate;
          const dow = (firstDow + day - 1) % 7;
          return (
            <div
              key={day}
              className={`min-h-[56px] rounded-lg p-1 flex flex-col ${
                isToday ? 'bg-blue-50 ring-1 ring-blue-300' : 'bg-gray-50'
              }`}
            >
              <span
                className={`text-xs font-medium leading-none mb-0.5 ${
                  isToday
                    ? 'text-blue-600'
                    : dow === 0
                    ? 'text-red-400'
                    : dow === 6
                    ? 'text-blue-400'
                    : 'text-gray-500'
                }`}
              >
                {day}
              </span>
              {d?.income > 0 && (
                <span className="text-[10px] leading-tight text-blue-500 font-medium truncate">
                  +{abbr(d.income)}
                </span>
              )}
              {d?.expense > 0 && (
                <span className="text-[10px] leading-tight text-red-500 font-medium truncate">
                  -{abbr(d.expense)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
