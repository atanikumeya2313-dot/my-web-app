'use client';
import { useEffect, useState } from 'react';
import { Transaction, Category, Budget, Goal } from '../types';
import { loadInsights, saveInsight } from '../lib/storage';

interface Props {
  yearMonth: string;
  isCurrentMonth: boolean;
  transactions: Transaction[];      // 当月（当月表示時は同期間スライス済み）
  prevTransactions: Transaction[];  // 先月（同期間）
  categories: Category[];
  budgets: Budget[];
  goal: Goal | null;
  paceFraction?: number;            // 当月の経過割合（着地見込みに使用）
}

interface CategoryAgg { name: string; amount: number; prev: number; budget?: number }

const sum = (txs: Transaction[], type: 'income' | 'expense') =>
  txs.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);

function daysInMonthOf(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export default function AiInsight({
  yearMonth, isCurrentMonth, transactions, prevTransactions, categories, budgets, goal, paceFraction,
}: Props) {
  const [text,    setText]    = useState('');
  const [at,      setAt]      = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [stale,   setStale]   = useState(false);

  const income  = sum(transactions, 'income');
  const expense = sum(transactions, 'expense');

  // 支出カテゴリ別の集計（当月・先月・予算）
  const catMap    = new Map(categories.map(c => [c.id, c.name]));
  const budgetMap = new Map(budgets.map(b => [b.categoryId, b.amount]));
  const byCat = (txs: Transaction[]) => {
    const m = new Map<string, number>();
    for (const t of txs) if (t.type === 'expense') m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
    return m;
  };
  const curMap  = byCat(transactions);
  const prevMap = byCat(prevTransactions);
  const catIds  = new Set<string>([...curMap.keys(), ...prevMap.keys(), ...budgetMap.keys()]);
  const cats: CategoryAgg[] = [...catIds]
    .map(id => ({
      name: catMap.get(id) ?? 'その他',
      amount: curMap.get(id) ?? 0,
      prev: prevMap.get(id) ?? 0,
      budget: budgetMap.get(id),
    }))
    .filter(c => c.amount > 0 || c.prev > 0 || c.budget !== undefined)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const projectedExpense = isCurrentMonth && paceFraction && paceFraction > 0
    ? Math.round(expense / paceFraction)
    : undefined;

  const hasData = income > 0 || expense > 0;

  // 集計のシグネチャ。これが変わったらキャッシュは「古い」とみなす
  const sig = JSON.stringify([
    income, expense,
    cats.map(c => [c.name, c.amount, c.prev, c.budget ?? -1]),
    projectedExpense ?? -1, goal?.monthlyTarget ?? -1,
  ]);

  // 表示月が変わったら、その月のキャッシュを読み直す
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const cached = loadInsights()[yearMonth];
    if (cached) {
      setText(cached.text);
      setAt(cached.at);
      setStale(cached.sig !== sig);
    } else {
      setText(''); setAt(''); setStale(false);
    }
    setError('');
  // sig は意図的に依存に含めない（生成直後の自己再評価で stale 化させないため）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearMonth]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function generate() {
    if (loading || !hasData) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/kakeibo/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearMonth, isCurrentMonth,
          daysElapsed: isCurrentMonth ? Math.round((paceFraction ?? 0) * daysInMonthOf(yearMonth)) : daysInMonthOf(yearMonth),
          daysInMonth: daysInMonthOf(yearMonth),
          income, expense,
          prevIncome: sum(prevTransactions, 'income'),
          prevExpense: sum(prevTransactions, 'expense'),
          samePeriod: isCurrentMonth,
          projectedExpense,
          goalTarget: goal?.monthlyTarget,
          categories: cats,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.insight) {
        setError(res.status === 503 ? 'AI機能はまだ準備中です（APIキー未設定）' : (data?.error ?? '生成に失敗しました'));
        return;
      }
      const now = new Date().toISOString();
      setText(data.insight);
      setAt(now);
      setStale(false);
      saveInsight(yearMonth, { text: data.insight, at: now, sig });
    } catch {
      setError('通信に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  if (!hasData) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🤖</span>
          <h2 className="text-sm font-bold text-gray-700">AIマンスリーレビュー</h2>
        </div>
        {text && (
          <button onClick={generate} disabled={loading}
            className="text-xs text-violet-500 font-medium disabled:opacity-40 flex items-center gap-1">
            {loading && <span className="w-3 h-3 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />}
            再生成
          </button>
        )}
      </div>

      {!text && (
        <>
          <p className="text-xs text-gray-400 mb-3">
            この月の集計（カテゴリ別の合計・先月比・予算）をAIが要約し、気づきをお伝えします。明細やメモは送信しません。
          </p>
          <button onClick={generate} disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-blue-500 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? '分析中…' : 'この月をAIでふりかえる'}
          </button>
        </>
      )}

      {text && (
        <div className="space-y-2">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p>
          {stale && (
            <p className="text-[11px] text-amber-600">
              ※ この後にデータが変わっています。「再生成」で最新の内容に更新できます。
            </p>
          )}
          {at && !stale && (
            <p className="text-[10px] text-gray-300 text-right">
              生成: {new Date(at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
