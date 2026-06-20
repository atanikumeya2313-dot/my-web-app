import { Transaction, FixedItem } from '../types';
import { fmtFull } from '../lib/format';

interface Props {
  transactions: Transaction[]; // 当月の取引
  fixedItems: FixedItem[];
  yearMonth: string;           // YYYY-MM（当月のみ表示される想定）
}

export default function MonthEndForecast({ transactions, fixedItems, yearMonth }: Props) {
  const [y, m] = yearMonth.split('-').map(Number);
  const D = new Date(y, m, 0).getDate();         // 当月日数
  const d = Math.min(new Date().getDate(), D);   // 経過日数

  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  if (income === 0 && expense === 0) return null;

  // 固定費（リストと一致する自動追加取引）は満額計上済みなので外挿しない
  const isFixed = (t: Transaction) =>
    fixedItems.some(f => f.type === t.type && f.name === t.memo && f.amount === t.amount && f.category === t.category);
  const fixedExpense    = transactions.filter(t => t.type === 'expense' && isFixed(t)).reduce((s, t) => s + t.amount, 0);
  const variableExpense = expense - fixedExpense;

  // 変動費だけを日割りで月末まで外挿（収入は給与等で既に計上済みのため実績のまま）
  const projVariable = d > 0 ? Math.round(variableExpense / d * D) : variableExpense;
  const projExpense  = fixedExpense + projVariable;
  const projNet      = income - projExpense;
  const currentNet   = income - expense;

  const sign = (n: number) => (n >= 0 ? '+' : '−');

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-600">📅 月末の予測</h2>
        <span className="text-[10px] text-gray-400">{d}/{D}日経過</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-gray-50 rounded-lg py-2">
          <p className="text-[10px] text-gray-400 mb-0.5">現在の収支</p>
          <p className={`text-sm font-bold ${currentNet >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            {sign(currentNet)}{fmtFull(Math.abs(currentNet))}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg py-2">
          <p className="text-[10px] text-blue-400 mb-0.5">月末の予測収支</p>
          <p className={`text-sm font-bold ${projNet >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
            {sign(projNet)}{fmtFull(Math.abs(projNet))}
          </p>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between items-center text-[11px]">
        <span className="text-gray-500">予測支出 {fmtFull(projExpense)}</span>
        <span className="text-gray-400">固定 {fmtFull(fixedExpense)} ＋ 変動 {fmtFull(projVariable)}</span>
      </div>
      <p className="text-[10px] text-gray-300 mt-1">変動費を現在のペースで月末まで外挿した目安です（収入は実績）</p>
    </div>
  );
}
