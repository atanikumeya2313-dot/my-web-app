import { Transaction } from '../types';

const abbr = (n: number) => {
  if (n === 0) return '';
  if (n >= 10000) return `${Math.round(n / 10000)}万`;
  if (n >= 1000)  return `${Math.round(n / 1000)}k`;
  return String(n);
};

interface Props {
  yearMonth: string;
  transactions: Transaction[];
}

export default function Calendar({ yearMonth, transactions }: Props) {
  const [y, m] = yearMonth.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const today = new Date();

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

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
          <div key={d} className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((d, di) => {
            const data = d ? daily[d] : null;
            return (
              <div key={di} className={`min-h-[52px] p-0.5 border-t border-gray-50 ${di === 0 ? 'text-red-400' : di === 6 ? 'text-blue-400' : ''}`}>
                {d && (
                  <>
                    <span className={`text-xs font-medium block text-center ${isToday(d) ? 'bg-blue-500 text-white rounded-full w-5 h-5 leading-5 mx-auto' : ''}`}>{d}</span>
                    {data?.inc  ? <p className="text-green-600 text-[9px] text-center leading-tight">{abbr(data.inc)}</p>  : null}
                    {data?.exp  ? <p className="text-red-400   text-[9px] text-center leading-tight">{abbr(data.exp)}</p>  : null}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
