// 在庫管理アプリ（同一オリジン・ハブ配下）へ書き戻す。
// ・作った → 使った食材の在庫を1つ減らす（履歴も残す）
// ・買い足し → 在庫に「在庫切れ」で追加（要補充リスト代わり）
// データ構造は inventory アプリに準拠。

interface StockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  targetQuantity?: number;
  unit: string;
  memo?: string;
  expiryDate?: string;
  addedAt: string;
}
interface HistoryEntry {
  id: string;
  itemId: string;
  itemName: string;
  delta: number;
  quantityAfter: number;
  date: string;
}

const ITEMS_KEY = 'inventory_items';
const HISTORY_KEY = 'inventory_history';
const MAX_HISTORY = 200;

function loadItems(): StockItem[] {
  try { const a = JSON.parse(localStorage.getItem(ITEMS_KEY) || '[]'); return Array.isArray(a) ? a : []; }
  catch { return []; }
}
function saveItems(items: StockItem[]) { localStorage.setItem(ITEMS_KEY, JSON.stringify(items)); }

function loadHistory(): HistoryEntry[] {
  try { const a = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); return Array.isArray(a) ? a : []; }
  catch { return []; }
}
function saveHistory(list: HistoryEntry[]) { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY))); }

const norm = (s: string) => s.trim().toLowerCase();

// 名前が在庫（数量>0）にあるものだけ返す（作った時の確認用）
export function inStock(names: string[]): string[] {
  const items = loadItems();
  return names.filter(n => items.some(it => norm(it.name) === norm(n) && it.quantity > 0));
}

// 指定した食材の在庫を1つずつ減らし、履歴を残す。実際に減らせた名前を返す。
export function decrementInventory(names: string[]): string[] {
  const items = loadItems();
  const history = loadHistory();
  const done: string[] = [];
  const now = new Date().toISOString();
  for (const name of names) {
    const it = items.find(i => norm(i.name) === norm(name) && i.quantity > 0);
    if (!it) continue;
    it.quantity = Math.max(0, it.quantity - 1);
    history.unshift({ id: crypto.randomUUID(), itemId: it.id, itemName: it.name, delta: -1, quantityAfter: it.quantity, date: now });
    done.push(it.name);
  }
  if (done.length) { saveItems(items); saveHistory(history); }
  return done;
}

// 買い足し食材を在庫に「在庫切れ（数量0・警告1）」で追加。すでにある名前は追加しない。追加した数を返す。
export function addMissingToInventory(names: string[]): number {
  const items = loadItems();
  const now = new Date().toISOString();
  let added = 0;
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    if (items.some(i => norm(i.name) === norm(name))) continue;
    items.push({
      id: crypto.randomUUID(), name, category: '食品・飲料',
      quantity: 0, minQuantity: 1, unit: '個', addedAt: now,
    });
    added++;
  }
  if (added) saveItems(items);
  return added;
}
