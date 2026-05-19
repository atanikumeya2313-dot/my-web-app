import { Transaction } from '../types';

const fmt = (n: number) => n.toLocaleString('ja-JP');

export default function Summary({ transactions }: { transactions: Transaction[] }) {
  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-green-50 rounded-xl p-3 text-center">
        <p className="text-xs text-green-600 mb-1">収入</p>
        <p className="font-bold text-green-700 text-sm">¥{fmt(income)}</p>
      </div>
      <div className="bg-red-50 rounded-xl p-3 text-center">
        <p className="text-xs text-red-600 mb-1">支出</p>
        <p className="font-bold text-red-700 text-sm">¥{fmt(expense)}</p>
      </div>
      <div className={`${balance >= 0 ? 'bg-blue-50' : 'bg-orange-50'} rounded-xl p-3 text-center`}>
        <p className={`text-xs mb-1 ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>残高</p>
        <p className={`font-bold text-sm ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>¥{fmt(balance)}</p>
      </div>
    </div>
  );
}
