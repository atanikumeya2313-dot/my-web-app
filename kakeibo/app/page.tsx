'use client';
import { useEffect, useState } from 'react';
import { Transaction, Category, Budget, FixedItem, Asset, Template, Goal } from './types';
import {
  loadTransactions, saveTransactions, addTransaction, updateTransaction, deleteTransaction,
  loadCategories, loadBudgets, loadFixed, loadAppliedMonths, markMonthApplied,
  loadAssets, loadTemplates, saveTemplates, loadGoal,
} from './lib/storage';
import { useStored } from './lib/useStored';
import Summary from './components/Summary';
import BudgetProgress from './components/BudgetProgress';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import Calendar from './components/Calendar';
import ExpensePieChart from './components/ExpensePieChart';
import AnnualGraph from './components/AnnualGraph';
import CategoryTrendGraph from './components/CategoryTrendGraph';
import BalanceTrendGraph from './components/BalanceTrendGraph';
import AssetSummary from './components/AssetSummary';
import WeeklySummary from './components/WeeklySummary';
import QuickTemplates from './components/QuickTemplates';
import GoalProgress from './components/GoalProgress';
import MonthlyReport from './components/MonthlyReport';
import MonthEndForecast from './components/MonthEndForecast';
import AiInsight from './components/AiInsight';

type Tab = '一覧' | 'カレンダー' | 'グラフ' | 'レポート' | '年間' | '推移' | '残高';

function toYM(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function fmtYM(ym: string) { const [y,m] = ym.split('-'); return `${y}年${parseInt(m)}月`; }
function shiftMonth(ym: string, d: number) {
  const [y,m] = ym.split('-').map(Number);
  return toYM(new Date(y, m-1+d, 1));
}
function daysInMonth(ym: string) {
  const [y,m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export default function Home() {
  const today     = new Date();
  const thisMonth = toYM(today);

  const [month,     setMonth]     = useState(thisMonth);
  const [txs,       setTxs]       = useState<Transaction[]>([]);
  const [cats]                    = useStored<Category[]>(loadCategories, []);
  const [budgets]                 = useStored<Budget[]>(loadBudgets, []);
  const [assets]                  = useStored<Asset[]>(loadAssets, []);
  const [templates, setTemplates] = useStored<Template[]>(loadTemplates, []);
  const [goal]                    = useStored<Goal | null>(loadGoal, null);
  const [fixed]                   = useStored<FixedItem[]>(loadFixed, []);
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState<Transaction | undefined>();
  const [prefill,   setPrefill]   = useState<Partial<Transaction> | undefined>();
  const [tab,       setTab]       = useState<Tab>('一覧');

  // 固定費の今月分を自動適用する。localStorage への書き込みを伴うため effect で行う。
  useEffect(() => {
    const allTxs   = loadTransactions();
    const allFixed = loadFixed();
    let initial = allTxs;

    if (allFixed.length > 0 && !loadAppliedMonths().includes(thisMonth)) {
      const maxDay = daysInMonth(thisMonth);
      const newTxs: Transaction[] = allFixed.map((f: FixedItem) => ({
        id: crypto.randomUUID(),
        date: `${thisMonth}-${String(Math.min(f.day, maxDay)).padStart(2,'0')}`,
        amount: f.amount,
        type: f.type,
        category: f.category,
        memo: f.name,
      }));
      initial = [...newTxs, ...allTxs];
      saveTransactions(initial);
      markMonthApplied(thisMonth);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTxs(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthTxs  = txs.filter(t => t.date.startsWith(month));
  const prevMonth = shiftMonth(month, -1);

  // 先月同期間比：当月表示中は同じ日付まで、過去月は全期間
  const isCurrMonth = month === thisMonth;
  const prevMonthTxs = txs.filter(t => {
    if (!t.date.startsWith(prevMonth)) return false;
    if (isCurrMonth) {
      return parseInt(t.date.split('-')[2]) <= today.getDate();
    }
    return true;
  });

  const defaultDate = `${month}-${String(today.getDate()).padStart(2,'0')}`;

  // 当月の経過割合（予算ペースの目安に使用）
  const paceFraction = isCurrMonth
    ? Math.min(today.getDate(), daysInMonth(thisMonth)) / daysInMonth(thisMonth)
    : undefined;

  const handleSave = (tx: Transaction) => {
    setTxs(editing ? updateTransaction(tx) : addTransaction(tx));
    setEditing(undefined);
    setPrefill(undefined);
  };
  const handleEdit   = (tx: Transaction) => { setEditing(tx); setPrefill(undefined); setShowForm(true); };
  const handleDelete = (id: string) => { if (confirm('削除しますか？')) setTxs(deleteTransaction(id)); };
  const openAdd      = () => { setEditing(undefined); setPrefill(undefined); setShowForm(true); };

  function handleTemplateSelect(t: Template) {
    setPrefill({ type: t.type, amount: t.amount, category: t.category, memo: t.memo });
    setEditing(undefined);
    setShowForm(true);
  }

  function handleSaveTemplate(t: Template) {
    const next = [...templates, t];
    saveTemplates(next);
    setTemplates(next);
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">家計簿</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setMonth(m => shiftMonth(m,-1))} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center text-lg">‹</button>
            <span className="text-sm font-semibold text-gray-700 w-24 text-center">{fmtYM(month)}</span>
            <button onClick={() => setMonth(m => shiftMonth(m,1))}  className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center text-lg">›</button>
          </div>
        </div>
      </header>

      {/* クイックテンプレート */}
      <QuickTemplates templates={templates} categories={cats} onSelect={handleTemplateSelect} />

      <main className="px-4 py-4 space-y-4">
        <AssetSummary assets={assets} transactions={txs} />
        <Summary transactions={monthTxs} prevTransactions={prevMonthTxs} samePeriod={isCurrMonth} />
        {isCurrMonth && <GoalProgress goal={goal} transactions={monthTxs} />}
        {isCurrMonth && <MonthEndForecast transactions={monthTxs} fixedItems={fixed} yearMonth={month} />}
        <BudgetProgress transactions={monthTxs} categories={cats} budgets={budgets} paceFraction={paceFraction} />
        <WeeklySummary transactions={monthTxs} yearMonth={month} />
        <AiInsight
          yearMonth={month}
          isCurrentMonth={isCurrMonth}
          transactions={monthTxs}
          prevTransactions={prevMonthTxs}
          categories={cats}
          budgets={budgets}
          goal={goal}
          paceFraction={paceFraction}
        />

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* タブバー（スクロール対応） */}
          <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide">
            {(['一覧','カレンダー','グラフ','レポート','年間','推移','残高'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`shrink-0 px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${tab===t ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="p-4">
            {tab === '一覧'      && <TransactionList transactions={monthTxs} categories={cats} onDelete={handleDelete} onEdit={handleEdit} />}
            {tab === 'カレンダー' && <Calendar yearMonth={month} transactions={monthTxs} categories={cats} />}
            {tab === 'グラフ'    && <ExpensePieChart transactions={monthTxs} categories={cats} />}
            {tab === 'レポート'  && <MonthlyReport transactions={txs} categories={cats} yearMonth={month} />}
            {tab === '年間'      && <AnnualGraph transactions={txs} />}
            {tab === '推移'      && <CategoryTrendGraph transactions={txs} categories={cats} />}
            {tab === '残高'      && <BalanceTrendGraph transactions={txs} />}
          </div>
        </div>
      </main>

      <button onClick={openAdd}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-500 text-white rounded-full text-2xl shadow-lg hover:bg-blue-600 flex items-center justify-center z-40">
        +
      </button>

      {showForm && (
        <TransactionForm
          categories={cats}
          assets={assets}
          onSave={handleSave}
          editing={editing}
          prefill={prefill}
          onClose={() => { setShowForm(false); setEditing(undefined); setPrefill(undefined); }}
          defaultDate={defaultDate}
          onSaveTemplate={handleSaveTemplate}
        />
      )}
    </div>
  );
}
