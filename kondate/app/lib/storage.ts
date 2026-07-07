import { Ingredient, SavedMeal, HistoryEntry } from '../types';

const PANTRY_KEY  = 'kondate_pantry';
const SAVED_KEY   = 'kondate_saved';
const HISTORY_KEY = 'kondate_history';

export function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── 手持ち食材 ──
export function loadPantry(): Ingredient[] {
  try { const s = localStorage.getItem(PANTRY_KEY); const a = s ? JSON.parse(s) : []; return Array.isArray(a) ? a : []; }
  catch { return []; }
}
export function savePantry(list: Ingredient[]) {
  localStorage.setItem(PANTRY_KEY, JSON.stringify(list));
}

// ── お気に入り献立 ──
export function loadSaved(): SavedMeal[] {
  try { const s = localStorage.getItem(SAVED_KEY); const a = s ? JSON.parse(s) : []; return Array.isArray(a) ? a : []; }
  catch { return []; }
}
export function saveSaved(list: SavedMeal[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(list));
}

// ── 作った履歴 ──
export function loadHistory(): HistoryEntry[] {
  try { const s = localStorage.getItem(HISTORY_KEY); const a = s ? JSON.parse(s) : []; return Array.isArray(a) ? a : []; }
  catch { return []; }
}
export function saveHistory(list: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 100)));
}

// ── バックアップ ──
export function exportData(): string {
  return JSON.stringify({ app: 'kondate', version: 1, pantry: loadPantry(), saved: loadSaved(), history: loadHistory() }, null, 2);
}
export function importData(raw: string): boolean {
  try {
    const d = JSON.parse(raw);
    if (!Array.isArray(d?.pantry) && !Array.isArray(d?.saved)) return false;
    if (Array.isArray(d.pantry))  savePantry(d.pantry);
    if (Array.isArray(d.saved))   saveSaved(d.saved);
    if (Array.isArray(d.history)) saveHistory(d.history);
    return true;
  } catch { return false; }
}
