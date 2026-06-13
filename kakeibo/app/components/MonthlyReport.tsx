import { Transaction, Category } from '../types';

const fmt = (n: number) => n.toLocaleString('ja-JP');

interface Props {
  transactions: Transaction[]; // 全期間
  categories: Category[];
  yearMonth: string;           // 表示中の月 (YYYY-MM)
}

function prevYearMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${Number(y) - 1}-${m}`;
}

/** 前年比の表示（金額差・パーセンテージ）。前年が0なら％は出さない */
function delta(curr: number, prev: number) {
  const d = curr - prev;
  const pct = prev > 0 ? Math.round((d / prev) * 100) : null;
  return { d, pct, sign: d > 0 ? '+' : d < 0 ? '−' : '' };
}

export default function MonthlyReport({ transactions, categories, yearMonth }: Props) {
  const prevYM = prevYearMonth(yearMonth);
  const [py, pm] = prevYM.split('-');
  const [cy, cm] = yearMonth.split('-');

  const sum = (ym: string, type: 'income' | 'expense', catId?: string) =>
    transactions
      .filter(t => t.date.startsWith(ym) && t.type === type && (catId === undefined || t.category === catId))
      .reduce((s, t) => s + t.amount, 0);

  const rows = [
    { key: 'income',  label: '収入', curr: sum(yearMonth, 'income'),  prev: sum(prevYM, 'income')  },
    { key: 'expense', label: '支出', curr: sum(yearMonth, 'expense'), prev: sum(prevYM, 'expense') },
  ].map(r => ({ ...r, ...delta(r.curr, r.prev) }));

  const currBalance = rows[0].curr - rows[1].curr;
  const prevBalance = rows[0].prev - rows[1].prev;
  const balDelta    = delta(currBalance, prevBalance);

  // 支出カテゴリ別の前年比（どちらかの期間で金額があるカテゴリのみ、当月支出の多い順）
  const expCats = categories
    .filter(c => c.type === 'expense')
    .map(c => ({ name: c.name, curr: sum(yearMonth, 'expense', c.id), prev: sum(prevYM, 'expense', c.id) }))
    .filter(c => c.curr > 0 || c.prev > 0)
    .sort((a, b) => b.curr - a.curr);

  const hasData = rows.some(r => r.curr > 0 || r.prev > 0);
  if (!hasData) {
    return <p className="text-center text-gray-400 text-sm py-6">この月のデータがありません</p>;
  }

  // 前年比バッジの色：支出は増＝赤、収入・収支は増＝緑
  const deltaColor = (key: string, d: number) => {
    if (d === 0) return 'text-gray-400';
    const up = d > 0;
    if (key === 'expense') return up ? 'text-red-400' : 'text-green-500';
    return up ? 'text-green-500' : 'text-red-400';
  };

  const DeltaLabel = ({ k, d, pct, sign }: { k: string; d: number; pct: number | null; sign: string }) => (
    <span className={`text-xs font-medium ${deltaColor(k, d)}`}>
      {d === 0 ? '±0' : `${sign}¥${fmt(Math.abs(d))}`}
      {pct !== null && d !== 0 && <span className="ml-1 opacity-70">({sign}{Math.abs(pct)}%)</span>}
    </span>
  );

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3 text-right">
        {cy}年{Number(cm)}月 ／ 前年同月（{py}年{Number(pm)}月）比
      </p>

      {/* サマリー3行 */}
      <div className="space-y-2 mb-4">
        {rows.map(r => (
          <div key={r.key} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-sm text-gray-600 w-12">{r.label}</span>
            <div className="flex-1 text-right mr-3">
              <span className="text-sm font-bold text-gray-800">¥{fmt(r.curr)}</span>
              <span className="text-[10px] text-gray-400 ml-2">前年 ¥{fmt(r.prev)}</span>
            </div>
            <DeltaLabel k={r.key} d={r.d} pct={r.pct} sign={r.sign} />
          </div>
        ))}
        <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
          <span className="text-sm text-blue-700 w-12 font-medium">収支</span>
          <div className="flex-1 text-right mr-3">
            <span className={`text-sm font-bold ${currBalance >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>¥{fmt(currBalance)}</span>
            <span className="text-[10px] text-blue-400 ml-2">前年 ¥{fmt(prevBalance)}</span>
          </div>
          <DeltaLabel k="balance" d={balDelta.d} pct={balDelta.pct} sign={balDelta.sign} />
        </div>
      </div>

      {/* 支出カテゴリ別 前年比 */}
      {expCats.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 mb-2">支出カテゴリ別 前年比</h3>
          <div className="space-y-1.5">
            {expCats.map(c => {
              const { d, pct, sign } = delta(c.curr, c.prev);
              return (
                <div key={c.name} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <span className="text-xs text-gray-600 w-20 shrink-0">{c.name}</span>
                  <div className="flex-1 text-right mr-3">
                    <span className="text-xs font-semibold text-gray-700">¥{fmt(c.curr)}</span>
                    <span className="text-[10px] text-gray-400 ml-1.5">前年 ¥{fmt(c.prev)}</span>
                  </div>
                  <DeltaLabel k="expense" d={d} pct={pct} sign={sign} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
