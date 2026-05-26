import { StockItem, HistoryEntry, DEFAULT_CATEGORIES } from '../types';

const ITEMS_KEY      = 'inventory_items';
const HISTORY_KEY    = 'inventory_history';
const CATEGORIES_KEY = 'inventory_categories';
const MAX_HISTORY    = 200;

// ── Items ──────────────────────────────────────────────

export function loadItems(): StockItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(ITEMS_KEY) ?? '[]'); }
  catch { return []; }
}

function saveItems(items: StockItem[]): StockItem[] {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  return items;
}

export function addItem(item: StockItem): StockItem[] {
  return saveItems([...loadItems(), item]);
}

export function updateItem(item: StockItem): StockItem[] {
  return saveItems(loadItems().map(i => i.id === item.id ? item : i));
}

export function deleteItem(id: string): StockItem[] {
  return saveItems(loadItems().filter(i => i.id !== id));
}

// ── Categories ─────────────────────────────────────────

export function loadCategories(): string[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  try {
    const saved = localStorage.getItem(CATEGORIES_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  } catch { return DEFAULT_CATEGORIES; }
}

export function saveCategories(cats: string[]): void {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
}

// ── History ────────────────────────────────────────────

export function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); }
  catch { return []; }
}

export function addHistoryEntry(entry: Omit<HistoryEntry, 'id'>): HistoryEntry[] {
  const history = loadHistory();
  const next = [{ ...entry, id: crypto.randomUUID() }, ...history].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

// ── Consumption pace ───────────────────────────────────

export function calcDaysRemaining(item: StockItem, history: HistoryEntry[]): number | null {
  const consumptions = history
    .filter(h => h.itemId === item.id && h.delta < 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (consumptions.length < 2) return null;

  const totalConsumed = consumptions.reduce((s, e) => s + Math.abs(e.delta), 0);
  const first = new Date(consumptions[0].date).getTime();
  const last  = new Date(consumptions[consumptions.length - 1].date).getTime();
  const daySpan = Math.max(1, (last - first) / 86_400_000);
  const ratePerDay = totalConsumed / daySpan;

  if (ratePerDay <= 0) return null;
  return Math.round(item.quantity / ratePerDay);
}

// ── Export / Import ────────────────────────────────────

export function exportData(): void {
  const data = {
    exportedAt: new Date().toISOString(),
    items:      loadItems(),
    history:    loadHistory(),
    categories: loadCategories(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `inventory_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(json: string): { items: StockItem[]; history: HistoryEntry[]; categories: string[] } | null {
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data.items)) return null;
    const items: StockItem[]      = data.items;
    const history: HistoryEntry[] = Array.isArray(data.history)    ? data.history    : [];
    const categories: string[]    = Array.isArray(data.categories) ? data.categories : DEFAULT_CATEGORIES;
    saveItems(items);
    localStorage.setItem(HISTORY_KEY,    JSON.stringify(history.slice(0, MAX_HISTORY)));
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    return { items, history, categories };
  } catch {
    return null;
  }
}
