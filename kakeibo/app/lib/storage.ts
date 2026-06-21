import { Transaction, Category, Budget, FixedItem, Asset, Template, SavedSearch, Goal, DEFAULT_CATEGORIES } from '../types';

const KEYS = {
  transactions:   'kakeibo_transactions',
  categories:     'kakeibo_categories',
  budgets:        'kakeibo_budgets',
  fixed:          'kakeibo_fixed',
  appliedMonths:  'kakeibo_applied_months',
  assets:         'kakeibo_assets',
  templates:      'kakeibo_templates',
  savedSearches:  'kakeibo_saved_searches',
  goal:           'kakeibo_goal',
};

// ── Transactions ──────────────────────────────────────────
export function loadTransactions(): Transaction[] {
  try { return JSON.parse(localStorage.getItem(KEYS.transactions) || '[]'); }
  catch { return []; }
}
export function saveTransactions(txs: Transaction[]) {
  localStorage.setItem(KEYS.transactions, JSON.stringify(txs));
}
export function addTransaction(tx: Transaction): Transaction[] {
  const txs = [tx, ...loadTransactions()];
  saveTransactions(txs);
  return txs;
}
export function updateTransaction(updated: Transaction): Transaction[] {
  const txs = loadTransactions().map(t => t.id === updated.id ? updated : t);
  saveTransactions(txs);
  return txs;
}
export function deleteTransaction(id: string): Transaction[] {
  const txs = loadTransactions().filter(t => t.id !== id);
  saveTransactions(txs);
  return txs;
}

// ── Categories ────────────────────────────────────────────
export function loadCategories(): Category[] {
  try {
    const s = localStorage.getItem(KEYS.categories);
    return s ? JSON.parse(s) : DEFAULT_CATEGORIES;
  } catch { return DEFAULT_CATEGORIES; }
}
export function saveCategories(cats: Category[]) {
  localStorage.setItem(KEYS.categories, JSON.stringify(cats));
}

// ── Budgets ───────────────────────────────────────────────
export function loadBudgets(): Budget[] {
  try { return JSON.parse(localStorage.getItem(KEYS.budgets) || '[]'); }
  catch { return []; }
}
export function saveBudgets(budgets: Budget[]) {
  localStorage.setItem(KEYS.budgets, JSON.stringify(budgets));
}

// ── Fixed items ───────────────────────────────────────────
export function loadFixed(): FixedItem[] {
  try { return JSON.parse(localStorage.getItem(KEYS.fixed) || '[]'); }
  catch { return []; }
}
export function saveFixed(items: FixedItem[]) {
  localStorage.setItem(KEYS.fixed, JSON.stringify(items));
}

// ── Assets ────────────────────────────────────────────────
export function loadAssets(): Asset[] {
  try { return JSON.parse(localStorage.getItem(KEYS.assets) || '[]'); }
  catch { return []; }
}
export function saveAssets(assets: Asset[]) {
  localStorage.setItem(KEYS.assets, JSON.stringify(assets));
}

// ── Templates ─────────────────────────────────────────────
export function loadTemplates(): Template[] {
  try { return JSON.parse(localStorage.getItem(KEYS.templates) || '[]'); }
  catch { return []; }
}
export function saveTemplates(ts: Template[]) {
  localStorage.setItem(KEYS.templates, JSON.stringify(ts));
}

// ── Saved searches（保存した検索条件） ─────────────────────
export function loadSavedSearches(): SavedSearch[] {
  try { return JSON.parse(localStorage.getItem(KEYS.savedSearches) || '[]'); }
  catch { return []; }
}
export function saveSavedSearches(items: SavedSearch[]) {
  localStorage.setItem(KEYS.savedSearches, JSON.stringify(items));
}

// ── Goal（貯金目標） ──────────────────────────────────────
export function loadGoal(): Goal | null {
  try {
    const s = localStorage.getItem(KEYS.goal);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}
export function saveGoal(goal: Goal) {
  localStorage.setItem(KEYS.goal, JSON.stringify(goal));
}

// ── AI マンスリーレビュー（月次インサイト）のキャッシュ ────
// 集計値だけをAIに渡して生成した文章を、月ごとにキャッシュする。
// sig は生成元の集計のシグネチャで、データが変わったら再生成を促すために使う。
const AI_INSIGHT_KEY = 'kakeibo_ai_insight';

export interface InsightCache { text: string; at: string; sig: string; }

export function loadInsights(): Record<string, InsightCache> {
  try { return JSON.parse(localStorage.getItem(AI_INSIGHT_KEY) || '{}'); }
  catch { return {}; }
}
export function saveInsight(ym: string, entry: InsightCache) {
  const all = loadInsights();
  all[ym] = entry;
  localStorage.setItem(AI_INSIGHT_KEY, JSON.stringify(all));
}

// ── Applied months（固定費を適用済みの月） ─────────────────
export function loadAppliedMonths(): string[] {
  try { return JSON.parse(localStorage.getItem(KEYS.appliedMonths) || '[]'); }
  catch { return []; }
}
export function markMonthApplied(ym: string) {
  const list = loadAppliedMonths();
  if (!list.includes(ym)) {
    localStorage.setItem(KEYS.appliedMonths, JSON.stringify([...list, ym]));
  }
}
