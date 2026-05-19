'use client';
import { useEffect, useState } from 'react';
import { Transaction, Category, Budget } from './types';
import { loadTransactions, addTransaction, updateTransaction, deleteTransaction, loadCategories, loadBudgets } from './lib/storage';
import Summary from './components/Summary';
import BudgetProgress from './components/BudgetProgress';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import Calendar from './components/Calendar';
import ExpensePieChart from './components/ExpensePieChart';

type Tab = '一覧' | 'カレンダー' | 'グラフ';

function toYM(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function fmtYM(ym: string) { const [y,m] = ym.split('-'); return `${y}年${parseInt(m)}月`; }
function addMonth(ym: string, d: number) {
  const [y,m] = ym.split('-').map(Number);
  return toYM(new Date(y, m-1+d, 1));
}

export default function Home() {
  const today = new Date();
  const [month, setMonth]     = useState(toYM(today));
  const [txs, setTxs]         = useState<Transaction[]>([]);
  const [cats, setCats]       = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [tab, setTab]         = useState<Tab>('一覧');

  useEffect(() => {
    setTxs(loadTransactions());
    setCats(loadCategories());
    setBudgets(loadBudgets());
  }, []);

  const monthTxs  = txs.filter(t => t.date.startsWith(month));
  const defaultDate = `${month}-${String(today.getDate()).padStart(2,'0')}`;

  const handleSave = (tx: Transaction) => {
    setTxs(editing ? updateTransaction(tx) : addTransaction(tx));
    setEditing(undefined);
  };
  const handleEdit = (tx: Transaction) => { setEditing(tx); setShowForm(true); };
  const handleDelete = (id: string) => { if (confirm('削除しますか？')) setTxs(deleteTransaction(id)); };
  const openAdd = () => { setEditing(undefined); setShowForm(true); };

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">家計簿</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setMonth(m => addMonth(m,-1))} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center text-lg">‹</button>
            <span className="text-sm font-semibold text-gray-700 w-24 text-center">{fmtYM(month)}</span>
            <button onClick={() => setMonth(m => addMonth(m,1))}  className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center text-lg">›</button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        <Summary transactions={monthTxs} />
        <BudgetProgress transactions={monthTxs} categories={cats} budgets={budgets} />

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(['一覧','カレンダー','グラフ'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab===t ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="p-4">
            {tab === '一覧'     && <TransactionList transactions={monthTxs} categories={cats} onDelete={handleDelete} onEdit={handleEdit} />}
            {tab === 'カレンダー' && <Calendar yearMonth={month} transactions={monthTxs} />}
            {tab === 'グラフ'   && <ExpensePieChart transactions={monthTxs} categories={cats} />}
          </div>
        </div>
      </main>

      <button onClick={openAdd}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-500 text-white rounded-full text-2xl shadow-lg hover:bg-blue-600 flex items-center justify-center z-40">
        +
      </button>

      {showForm && (
        <TransactionForm categories={cats} onSave={handleSave} editing={editing}
          onClose={() => { setShowForm(false); setEditing(undefined); }} defaultDate={defaultDate} />
      )}
    </div>
  );
}
