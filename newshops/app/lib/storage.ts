import { Shop } from '../types';

const KEY = 'newshops_shops';

export function loadShops(): Shop[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); }
  catch { return []; }
}
export function saveShops(shops: Shop[]) {
  localStorage.setItem(KEY, JSON.stringify(shops));
}

export function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// オープン日までの日数（負=過去）。日付不明なら null
export function daysUntil(ymd?: string): number | null {
  if (!ymd) return null;
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const d = new Date(ymd + 'T00:00:00');
  return Math.round((d.getTime() - t0.getTime()) / 86_400_000);
}

export function mapUrl(name: string, area: string): string {
  const q = encodeURIComponent(`${name} ${area} 愛媛`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

// ── バックアップ ──────────────────────────────
export interface BackupData { version: number; exportedAt: string; shops: Shop[]; }
export function exportData(): BackupData {
  return { version: 1, exportedAt: new Date().toISOString(), shops: loadShops() };
}
export function importData(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const d = raw as Partial<BackupData>;
  if (!Array.isArray(d.shops)) return false;
  saveShops(d.shops);
  return true;
}
