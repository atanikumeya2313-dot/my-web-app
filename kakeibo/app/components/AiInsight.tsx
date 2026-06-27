'use client';
import { useEffect, useState } from 'react';
import { Transaction, Category, Budget, Goal } from '../types';
import { loadInsights, saveInsight } from '../lib/storage';

interface Props {
  // 月（表示中の月）
  yearMonth: string;
  isCurrentMonth: boolean;
  monthTx: Transaction[];          // 表示中の月（当月表示時は同期間スライス済み）
  prevMonthTx: Transaction[];      // 先月（同期間）
  paceFraction?: number;           // 当月の経過割合（着地見込み）
  goal: Goal | null;
  // 週（今週・日曜〜今日）
  weekKey: string;                 // 週の識別子（日曜のYYYY-MM-DD）
  weekLabel: string;               // 表示用ラベル
  weekTx: Transaction[];
  prevWeekTx: Transaction[];       // 先週同期間
  // 共通
  categories: Category[];
  budgets: Budget[];
}

interface CategoryAgg { name: string; amount: number; prev: number; budget?: number }

const sum = (txs: Transaction[], type: 'income' | 'expense') =>
  txs.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);

function daysInMonthOf(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export default function AiInsight(props: Props) {
  const {
    yearMonth, isCurrentMonth, monthTx, prevMonthTx, paceFraction, goal,
    weekKey, weekLabel, weekTx, prevWeekTx, categories, budgets,
  } = props;

  const [period,  setPeriod]  = useState<'month' | 'week'>('month');
  const [text,    setText]    = useState('');
  const [at,      setAt]      = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [stale,   setStale]   = useState(false);

  const isMonth = period === 'month';
  const transactions     = isMonth ? monthTx : weekTx;
  const prevTransactions = isMonth ? prevMonthTx : prevWeekTx;

  const [yy, mm] = yearMonth.split('-').map(Number);
  const monthLabel = `${yy}年${mm}月`;
  const label       = isMonth ? `${monthLabel}${isCurrentMonth ? '（今月・進行中）' : ''}` : weekLabel;
  const shortLabel  = isMonth ? monthLabel : weekLabel;
  const cacheKey    = isMonth ? yearMonth : `w:${weekKey}`;
  const compareLabel = isMonth ? '先月' : '先週';
  const samePeriod   = isMonth ? isCurrentMonth : true;

  const income  = sum(transactions, 'income');
  const expense = sum(transactions, 'expense');

  // 支出カテゴリ別の集計（予算は月のときのみ）
  const catMap    = new Map(categories.map(c => [c.id, c.name]));
  const budgetMap = new Map(budgets.map(b => [b.categoryId, b.amount]));
  const byCat = (txs: Transaction[]) => {
    const m = new Map<string, number>();
    for (const t of txs) if (t.type === 'expense') m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
    return m;
  };
  const curMap  = byCat(transactions);
  const prevMap = byCat(prevTransactions);
  const catIds  = new Set<string>([...curMap.keys(), ...prevMap.keys(), ...(isMonth ? budgetMap.keys() : [])]);
  const cats: CategoryAgg[] = [...catIds]
    .map(id => ({
      name: catMap.get(id) ?? 'その他',
      amount: curMap.get(id) ?? 0,
      prev: prevMap.get(id) ?? 0,
      budget: isMonth ? budgetMap.get(id) : undefined,
    }))
    .filter(c => c.amount > 0 || c.prev > 0 || c.budget !== undefined)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const projectedExpense = isMonth && isCurrentMonth && paceFraction && paceFraction > 0
    ? Math.round(expense / paceFraction)
    : undefined;
  const goalTarget = isMonth ? goal?.monthlyTarget : undefined;

  const hasData      = income > 0 || expense > 0;
  const monthHasData = sum(monthTx, 'income') > 0 || sum(monthTx, 'expense') > 0;
  const weekHasData  = sum(weekTx, 'income') > 0 || sum(weekTx, 'expense') > 0;

  const sig = JSON.stringify([
    period, income, expense,
    cats.map(c => [c.name, c.amount, c.prev, c.budget ?? -1]),
    projectedExpense ?? -1, goalTarget ?? -1,
  ]);

  // 期間（月/週・対象キー）が変わったらキャッシュを読み直す
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const cached = loadInsights()[cacheKey];
    if (cached) {
      setText(cached.text);
      setAt(cached.at);
      setStale(cached.sig !== sig);
    } else {
      setText(''); setAt(''); setStale(false);
    }
    setError('');
  // sig は依存に含めない（生成直後の自己 stale 化を防ぐ）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function generate() {
    if (loading || !hasData) return;
    setLoading(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        periodLabel: label,
        compareLabel,
        samePeriod,
        income, expense,
        prevIncome: sum(prevTransactions, 'income'),
        prevExpense: sum(prevTransactions, 'expense'),
        categories: cats,
      };
      if (isMonth) {
        payload.yearMonth = yearMonth;
        payload.isCurrentMonth = isCurrentMonth;
        payload.daysElapsed = isCurrentMonth ? Math.round((paceFraction ?? 0) * daysInMonthOf(yearMonth)) : daysInMonthOf(yearMonth);
        payload.daysInMonth = daysInMonthOf(yearMonth);
        payload.projectedExpense = projectedExpense;
        payload.goalTarget = goalTarget;
      }

      // 通信断は最大3回再試行。混雑/一時エラーの再試行はサーバー側で行う。
      let res!: Response;
      for (let attempt = 0; ; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 65000);
        try {
          res = await fetch('/kakeibo/api/insight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: ctrl.signal,
          });
        } catch (e) {
          if (attempt < 2) { await new Promise(r => setTimeout(r, 800 * (attempt + 1))); continue; }
          throw e;
        } finally {
          clearTimeout(timer);
        }
        break;
      }
      let data: { insight?: string; error?: string } | null = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok || !data?.insight) {
        setError(res.status === 503 ? 'AI機能はまだ準備中です（APIキー未設定）' : (data?.error ?? '生成に失敗しました'));
        return;
      }
      const insight = data.insight;
      const now = new Date().toISOString();
      setText(insight);
      setAt(now);
      setStale(false);
      saveInsight(cacheKey, { text: insight, at: now, sig });
    } catch (e) {
      setError((e as Error)?.name === 'AbortError'
        ? 'AIの応答に時間がかかっています。少し待ってからお試しください。'
        : '通信に失敗しました。少し待ってから再試行してください。');
    } finally {
      setLoading(false);
    }
  }

  if (!monthHasData && !weekHasData) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🤖</span>
          <h2 className="text-sm font-bold text-gray-700">AIレビュー</h2>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-[11px]">
          {(['week', 'month'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 font-medium transition-colors ${period === p ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}>
              {p === 'week' ? '週' : '月'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400">{shortLabel}</p>
        {text && (
          <button onClick={generate} disabled={loading}
            className="text-xs text-violet-500 font-medium disabled:opacity-40 flex items-center gap-1">
            {loading && <span className="w-3 h-3 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />}
            再生成
          </button>
        )}
      </div>

      {!hasData ? (
        <p className="text-sm text-gray-400 text-center py-4">{shortLabel}の記録がありません</p>
      ) : !text ? (
        <>
          <p className="text-xs text-gray-400 mb-3">
            {isMonth ? 'この月' : 'この1週間'}の集計（カテゴリ別の合計・{compareLabel}比{isMonth ? '・予算' : ''}）をAIが要約し、気づきをお伝えします。明細やメモは送信しません。
          </p>
          <button onClick={generate} disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-blue-500 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? '分析中…' : `${isMonth ? 'この月' : 'この週'}をAIでふりかえる`}
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p>
          {stale && (
            <p className="text-[11px] text-amber-600">※ この後にデータが変わっています。「再生成」で最新の内容に更新できます。</p>
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
