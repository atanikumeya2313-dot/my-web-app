import { StockItem, HistoryEntry } from '../types';

const ITEMS_KEY   = 'inventory_items';
const HISTORY_KEY = 'inventory_history';
const MAX_HISTORY = 200;

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

// ── Export / Import ────────────────────────────────────

export function exportData(): void {
  const data = {
    exportedAt: new Date().toISOString(),
    items: loadItems(),
    history: loadHistory(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `inventory_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(json: string): { items: StockItem[]; history: HistoryEntry[] } | null {
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data.items)) return null;
    const items: StockItem[] = data.items;
    const history: HistoryEntry[] = Array.isArray(data.history) ? data.history : [];
    saveItems(items);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
    return { items, history };
  } catch {
    return null;
  }
}
