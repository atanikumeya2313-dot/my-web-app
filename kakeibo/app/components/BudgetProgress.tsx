import { Transaction, Category, Budget } from '../types';

const abbr = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString();

interface Props {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
}

export default function BudgetProgress({ transactions, categories, budgets }: Props) {
  const budgeted = categories.filter(c =>
    c.type === 'expense' && budgets.some(b => b.categoryId === c.id && b.amount > 0)
  );
  if (budgeted.length === 0) return null;

  const rows = budgeted.map(cat => {
    const budget = budgets.find(b => b.categoryId === cat.id)!.amount;
    const spent  = transactions
      .filter(t => t.type === 'expense' && t.category === cat.id)
      .reduce((s, t) => s + t.amount, 0);
    const pct = Math.min((spent / budget) * 100, 100);
    return { cat, budget, spent, pct, over: spent > budget, warn: spent / budget >= 0.8 };
  });

  const alerts = rows.filter(r => r.over);
  const warns  = rows.filter(r => !r.over && r.warn);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      {/* 警告バナー */}
      {alerts.length > 0 && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold text-red-600 mb-1">⚠ 予算超過</p>
          <p className="text-xs text-red-500">
            {alerts.map(r => `${r.cat.name}（+¥${abbr(r.spent - r.budget)}）`).join('　')}
          </p>
        </div>
      )}
      {alerts.length === 0 && warns.length > 0 && (
        <div className="mb-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold text-orange-500 mb-1">予算80%超過</p>
          <p className="text-xs text-orange-400">
            {warns.map(r => r.cat.name).join('　')}
          </p>
        </div>
      )}

      <h2 className="text-sm font-semibold text-gray-600 mb-3">予算</h2>
      <div className="space-y-3">
        {rows.map(({ cat, budget, spent, pct, over }) => (
          <div key={cat.id}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">{cat.name}</span>
              <span className={over ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                ¥{abbr(spent)} / ¥{abbr(budget)}{over && ' ⚠'}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : pct > 80 ? 'bg-orange-400' : 'bg-blue-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
