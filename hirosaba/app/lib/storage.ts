import { Character } from '../types';

const KEY = 'hirosaba_chars';

export function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadChars(): Character[] {
  try {
    const s = localStorage.getItem(KEY);
    const a = s ? JSON.parse(s) : [];
    return Array.isArray(a) ? a : [];
  } catch { return []; }
}

export function saveChars(list: Character[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

// ── バックアップ / クラウド同期 ──
export function exportData(): string {
  return JSON.stringify({ app: 'hirosaba', version: 1, exportedAt: new Date().toISOString(), chars: loadChars() });
}

export function importData(raw: string): boolean {
  try {
    const d = JSON.parse(raw);
    if (!Array.isArray(d?.chars)) return false;
    saveChars(d.chars);
    return true;
  } catch { return false; }
}

export function hasData(): boolean {
  try { return loadChars().length > 0; } catch { return false; }
}
