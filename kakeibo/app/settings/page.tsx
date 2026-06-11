'use client';
import { useEffect, useState } from 'react';
import { Category, Budget, FixedItem, Asset, Template } from '../types';
import {
  loadCategories, saveCategories, loadBudgets, saveBudgets,
  loadFixed, saveFixed, loadAssets, saveAssets, loadTemplates, saveTemplates,
  loadTransactions, saveTransactions,
} from '../lib/storage';
import CategoryManager from '../components/CategoryManager';
import BudgetManager from '../components/BudgetManager';
import FixedManager from '../components/FixedManager';
import AssetManager from '../components/AssetManager';
import TemplateManager from '../components/TemplateManager';
import CSVExport from '../components/CSVExport';
import CSVImport from '../components/CSVImport';
import JSONBackup from '../components/JSONBackup';

export default function Settings() {
  const [cats,      setCats]      = useState<Category[]>([]);
  const [budgets,   setBudgets]   = useState<Budget[]>([]);
  const [fixed,     setFixed]     = useState<FixedItem[]>([]);
  const [assets,    setAssets]    = useState<Asset[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    setCats(loadCategories());
    setBudgets(loadBudgets());
    setFixed(loadFixed());
    setAssets(loadAssets());
    setTemplates(loadTemplates());
  }, []);

  const handleCats      = (c: Category[])  => { saveCategories(c);  setCats(c); };
  const handleBudgets   = (b: Budget[])    => { saveBudgets(b);     setBudgets(b); };
  const handleFixed     = (f: FixedItem[]) => { saveFixed(f);       setFixed(f); };
  const handleAssets    = (a: Asset[])     => { saveAssets(a);      setAssets(a); };
  const handleTemplates = (t: Template[])  => { saveTemplates(t);   setTemplates(t); };

  function handleFixedDelete(id: string) {
    const item = fixed.find(f => f.id === id);
    if (!item) return;
    if (!confirm(`「${item.name}」を固定費から削除しますか？`)) return;

    handleFixed(fixed.filter(f => f.id !== id));

    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const allTxs = loadTransactions();
    const related = allTxs.filter(t =>
      t.date.startsWith(currentMonth) &&
      t.memo === item.name &&
      t.amount === item.amount &&
      t.category === item.category
    );

    if (related.length > 0) {
      const label = `${today.getFullYear()}年${today.getMonth() + 1}月`;
      if (confirm(`${label}に自動追加された関連取引（${related.length}件）も削除しますか？`)) {
        const relatedIds = new Set(related.map(t => t.id));
        saveTransactions(allTxs.filter(t => !relatedIds.has(t.id)));
      }
    }
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-3">
          <h1 className="text-base font-bold text-gray-800">設定</h1>
        </div>
      </header>
      <main className="px-4 py-4 space-y-4">
        <AssetManager assets={assets} onChange={handleAssets} />
        <FixedManager items={fixed} categories={cats} onChange={handleFixed} onDelete={handleFixedDelete} />
        <TemplateManager templates={templates} categories={cats} onChange={handleTemplates} />
        <CategoryManager categories={cats} onChange={handleCats} />
        <BudgetManager categories={cats} budgets={budgets} onChange={handleBudgets} />
        <CSVImport />
        <CSVExport />
        <JSONBackup />
      </main>
    </div>
  );
}
