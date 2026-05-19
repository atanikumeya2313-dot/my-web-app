'use client';
import { Category, Budget } from '../types';

interface Props { categories: Category[]; budgets: Budget[]; onChange: (b: Budget[]) => void; }

export default function BudgetManager({ categories, budgets, onChange }: Props) {
  const expCats = categories.filter(c => c.type === 'expense');
  const getAmt = (id: string) => budgets.find(b => b.categoryId === id)?.amount ?? 0;

  function setAmt(id: string, amt: number) {
    const rest = budgets.filter(b => b.categoryId !== id);
    onChange(amt > 0 ? [...rest, { categoryId: id, amount: amt }] : rest);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-600 mb-1">月次予算（カテゴリ別）</h2>
      <p className="text-xs text-gray-400 mb-3">0または空欄＝予算未設定</p>
      <div className="space-y-3">
        {expCats.map(cat => (
          <div key={cat.id} className="flex items-center gap-3">
            <span className="text-sm text-gray-700 w-20 shrink-0">{cat.name}</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
              <input type="number" min="0"
                value={getAmt(cat.id) || ''}
                onChange={e => setAmt(cat.id, Number(e.target.value))}
                placeholder="未設定"
                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
