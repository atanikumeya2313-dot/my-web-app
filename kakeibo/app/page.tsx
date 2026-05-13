'use client';

import { useEffect, useState } from 'react';
import { Transaction } from './types';
import { loadTransactions, addTransaction, deleteTransaction } from './lib/storage';
import Summary from './components/Summary';
import ExpensePieChart from './components/ExpensePieChart';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import Calendar from './components/Calendar';

function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatYearMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${y}年${parseInt(m)}月`;
}

function addMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return toYearMonth(date);
}

export default function Home() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(toYearMonth(today));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setTransactions(loadTransactions());
  }, []);

  const monthTransactions = transactions.filter((t) =>
    t.date.startsWith(currentMonth)
  );

  const handleAdd = (tx: Transaction) => {
    const updated = addTransaction(tx);
    setTransactions(updated);
  };

  const handleDelete = (id: string) => {
    const updated = deleteTransaction(id);
    setTransactions(updated);
  };

  const defaultDate = `${currentMonth}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-800">家計簿</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* 月切り替え */}
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm mb-6">
          <button
            onClick={() => setCurrentMonth((m) => addMonth(m, -1))}
            className="text-gray-400 hover:text-gray-600 text-xl px-2 transition-colors"
          >
            ‹
          </button>
          <span className="font-semibold text-gray-700">{formatYearMonth(currentMonth)}</span>
          <button
            onClick={() => setCurrentMonth((m) => addMonth(m, 1))}
            className="text-gray-400 hover:text-gray-600 text-xl px-2 transition-colors"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
          {/* 左カラム */}
          <div className="space-y-6">
            <Summary transactions={monthTransactions} />

            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-600 mb-2">支出の内訳</h2>
              <ExpensePieChart transactions={monthTransactions} />
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-600 mb-2">明細</h2>
              <TransactionList transactions={monthTransactions} onDelete={handleDelete} />
            </div>
          </div>

          {/* 右カラム：カレンダー */}
          <Calendar yearMonth={currentMonth} transactions={monthTransactions} />
        </div>
      </main>

      {/* 追加ボタン */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 text-white rounded-full text-3xl shadow-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
        aria-label="収支を追加"
      >
        +
      </button>

      {showForm && (
        <TransactionForm
          onAdd={handleAdd}
          onClose={() => setShowForm(false)}
          defaultDate={defaultDate}
        />
      )}
    </div>
  );
}
