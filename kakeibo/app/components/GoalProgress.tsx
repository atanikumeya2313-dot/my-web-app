import { Transaction, Goal } from '../types';

const fmt = (n: number) => n.toLocaleString('ja-JP');

interface Props {
  goal: Goal | null;
  transactions: Transaction[]; // 当月の取引
}

export default function GoalProgress({ goal, transactions }: Props) {
  if (!goal || goal.monthlyTarget <= 0) return null;

  const income  = transactions.filter(t => t.type === 'income').reduce((s, t)  => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const saved   = income - expense;

  const target = goal.monthlyTarget;
  const pct     = Math.max(Math.min((saved / target) * 100, 100), 0);
  const reached = saved >= target;
  const remain  = target - saved;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-600">🎯 今月の貯金目標</h2>
        <span className={`text-xs font-semibold ${reached ? 'text-green-500' : saved < 0 ? 'text-red-400' : 'text-gray-500'}`}>
          ¥{fmt(saved)} / ¥{fmt(target)}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${reached ? 'bg-green-400' : 'bg-blue-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs mt-2 text-right">
        {reached
          ? <span className="text-green-500 font-medium">🎉 目標達成！（+¥{fmt(saved - target)}）</span>
          : saved < 0
            ? <span className="text-red-400">今月は支出超過です</span>
            : <span className="text-gray-400">あと ¥{fmt(remain)} で達成</span>}
      </p>
    </div>
  );
}
