'use client';
import { Category, Budget, FixedItem, Asset, Template, Goal } from '../types';
import {
  saveCategories, saveBudgets, saveFixed, saveAssets, saveTemplates,
  loadCategories, loadBudgets, loadFixed, loadAssets, loadTemplates,
  loadTransactions, saveTransactions, loadGoal, saveGoal,
} from '../lib/storage';
import { useStored } from '../lib/useStored';
import CategoryManager from '../components/CategoryManager';
import BudgetManager from '../components/BudgetManager';
import FixedManager from '../components/FixedManager';
import AssetManager from '../components/AssetManager';
import TemplateManager from '../components/TemplateManager';
import GoalManager from '../components/GoalManager';
import CSVExport from '../components/CSVExport';
import CSVImport from '../components/CSVImport';
import JSONBackup from '../components/JSONBackup';

export default function Settings() {
  const [cats,      setCats]      = useStored<Category[]>(loadCategories, []);
  const [budgets,   setBudgets]   = useStored<Budget[]>(loadBudgets, []);
  const [fixed,     setFixed]     = useStored<FixedItem[]>(loadFixed, []);
  const [assets,    setAssets]    = useStored<Asset[]>(loadAssets, []);
  const [templates, setTemplates] = useStored<Template[]>(loadTemplates, []);
  const [goal,      setGoal]      = useStored<Goal | null>(loadGoal, null);

  const handleCats      = (c: Category[])  => { saveCategories(c);  setCats(c); };
  const handleBudgets   = (b: Budget[])    => { saveBudgets(b);     setBudgets(b); };
  const handleFixed     = (f: FixedItem[]) => { saveFixed(f);       setFixed(f); };
  const handleAssets    = (a: Asset[])     => { saveAssets(a);      setAssets(a); };
  const handleTemplates = (t: Template[])  => { saveTemplates(t);   setTemplates(t); };
  const handleGoal      = (g: Goal)        => { saveGoal(g);        setGoal(g); };

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

  function handleFixedEdited(oldItem: FixedItem, newItem: FixedItem) {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const allTxs = loadTransactions();
    // 当月、旧固定費の内容で自動追加された取引を探す
    const related = allTxs.filter(t =>
      t.date.startsWith(currentMonth) &&
      t.memo === oldItem.name &&
      t.amount === oldItem.amount &&
      t.category === oldItem.category &&
      t.type === oldItem.type
    );
    if (related.length === 0) return;

    const label = `${today.getFullYear()}年${today.getMonth() + 1}月`;
    if (!confirm(`${label}に自動追加された「${oldItem.name}」（${related.length}件）も新しい内容に更新しますか？`)) return;

    const maxDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const newDate = `${currentMonth}-${String(Math.min(newItem.day, maxDay)).padStart(2, '0')}`;
    const relatedIds = new Set(related.map(t => t.id));
    saveTransactions(allTxs.map(t => relatedIds.has(t.id)
      ? { ...t, memo: newItem.name, amount: newItem.amount, category: newItem.category, type: newItem.type, date: newDate }
      : t
    ));
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
        <GoalManager goal={goal} onChange={handleGoal} />
        <FixedManager items={fixed} categories={cats} onChange={handleFixed} onDelete={handleFixedDelete} onEdited={handleFixedEdited} />
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
