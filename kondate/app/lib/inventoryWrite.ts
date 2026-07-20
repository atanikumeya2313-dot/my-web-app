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

// 調味料・少量しか使わないもの（作った時に自動で減らす対象から外す既定）
const SEASONING_INCLUDES = [
  '醤油', 'しょうゆ', '味噌', 'みそ', '砂糖', 'みりん', 'だし', '出汁', 'つゆ', 'めんつゆ', '白だし',
  'ケチャップ', 'マヨ', 'ソース', 'タレ', 'たれ', 'ドレッシング', 'ぽん酢', 'ポン酢', 'オイスター',
  'こしょう', '胡椒', 'コショウ', 'にんにく', 'ニンニク', '生姜', 'しょうが', 'ショウガ',
  'バター', 'マーガリン', '片栗粉', '小麦粉', '薄力粉', '強力粉', 'パン粉', 'はちみつ', '蜂蜜', 'ジャム',
  '七味', '一味', '山椒', 'カレー粉', 'コンソメ', '鶏がら', 'がらスープ', 'だしの素', '和風だし',
  'コチュジャン', '豆板醤', '甜麺醤', 'ウスター', 'ナンプラー', 'わさび', 'からし', 'マスタード', 'ラー油',
];
// 末尾一致（「油揚げ」を油と誤判定しないよう、油/酒/塩/酢は末尾でのみ調味料扱い）
const SEASONING_SUFFIX = ['油', '酒', '塩', '酢'];

export function isSeasoning(name: string): boolean {
  const n = name.trim();
  if (!n) return false;
  if (SEASONING_INCLUDES.some(k => n.includes(k))) return true;
  if (SEASONING_SUFFIX.some(suf => n.endsWith(suf))) return true;
  return false;
}

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
