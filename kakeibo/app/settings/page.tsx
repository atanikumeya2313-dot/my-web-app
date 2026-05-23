'use client';
import { useEffect, useState } from 'react';
import { Category, Budget, FixedItem, Asset, Template } from '../types';
import {
  loadCategories, saveCategories, loadBudgets, saveBudgets,
  loadFixed, saveFixed, loadAssets, saveAssets, loadTemplates, saveTemplates,
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

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-3">
          <h1 className="text-base font-bold text-gray-800">設定</h1>
        </div>
      </header>
      <main className="px-4 py-4 space-y-4">
        <AssetManager assets={assets} onChange={handleAssets} />
        <FixedManager items={fixed} categories={cats} onChange={handleFixed} />
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
