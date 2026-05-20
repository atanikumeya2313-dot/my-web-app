import { Transaction } from '../types';

const fmt = (n: number) => n.toLocaleString('ja-JP');

function diff(curr: number, prev: number): { value: number; sign: '+' | '-' } | null {
  const d = curr - prev;
  if (d === 0) return null;
  return { value: Math.abs(d), sign: d > 0 ? '+' : '-' };
}

interface Props {
  transactions: Transaction[];
  prevTransactions?: Transaction[];
}

export default function Summary({ transactions, prevTransactions }: Props) {
  const income  = transactions.filter(t => t.type === 'income').reduce((s, t)  => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const prevIncome  = prevTransactions?.filter(t => t.type === 'income').reduce((s, t)  => s + t.amount, 0) ?? null;
  const prevExpense = prevTransactions?.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? null;
  const prevBalance = prevIncome !== null && prevExpense !== null ? prevIncome - prevExpense : null;

  const dIncome  = prevIncome  !== null ? diff(income,  prevIncome)  : null;
  const dExpense = prevExpense !== null ? diff(expense, prevExpense) : null;
  const dBalance = prevBalance !== null ? diff(balance, prevBalance) : null;

  // 支出は増えたら赤（悪化）、減ったら緑（改善）
  const diffColor = (key: 'income' | 'expense' | 'balance', sign: '+' | '-') => {
    if (key === 'expense') return sign === '+' ? 'text-red-400' : 'text-green-500';
    return sign === '+' ? 'text-green-500' : 'text-red-400';
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-xs text-green-600 mb-1">収入</p>
          <p className="font-bold text-green-700 text-sm">¥{fmt(income)}</p>
          {dIncome && (
            <p className={`text-[10px] mt-0.5 ${diffColor('income', dIncome.sign)}`}>
              {dIncome.sign}¥{fmt(dIncome.value)}
            </p>
          )}
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-xs text-red-600 mb-1">支出</p>
          <p className="font-bold text-red-700 text-sm">¥{fmt(expense)}</p>
          {dExpense && (
            <p className={`text-[10px] mt-0.5 ${diffColor('expense', dExpense.sign)}`}>
              {dExpense.sign}¥{fmt(dExpense.value)}
            </p>
          )}
        </div>
        <div className={`${balance >= 0 ? 'bg-blue-50' : 'bg-orange-50'} rounded-xl p-3 text-center`}>
          <p className={`text-xs mb-1 ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>残高</p>
          <p className={`font-bold text-sm ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>¥{fmt(balance)}</p>
          {dBalance && (
            <p className={`text-[10px] mt-0.5 ${diffColor('balance', dBalance.sign)}`}>
              {dBalance.sign}¥{fmt(dBalance.value)}
            </p>
          )}
        </div>
      </div>
      {prevTransactions && (
        <p className="text-[10px] text-gray-400 text-right">※ 数値は先月比</p>
      )}
    </div>
  );
}
