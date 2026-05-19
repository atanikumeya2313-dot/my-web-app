'use client';
import { useEffect, useState } from 'react';
import { Category, Budget } from '../types';
import { loadCategories, saveCategories, loadBudgets, saveBudgets } from '../lib/storage';
import CategoryManager from '../components/CategoryManager';
import BudgetManager from '../components/BudgetManager';
import CSVExport from '../components/CSVExport';

export default function Settings() {
  const [cats, setCats]       = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  useEffect(() => { setCats(loadCategories()); setBudgets(loadBudgets()); }, []);

  const handleCats = (c: Category[]) => { saveCategories(c); setCats(c); };
  const handleBudgets = (b: Budget[]) => { saveBudgets(b); setBudgets(b); };

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-3">
          <h1 className="text-base font-bold text-gray-800">設定</h1>
        </div>
      </header>
      <main className="px-4 py-4 space-y-4">
        <CategoryManager categories={cats} onChange={handleCats} />
        <BudgetManager categories={cats} budgets={budgets} onChange={handleBudgets} />
        <CSVExport />
      </main>
    </div>
  );
}
