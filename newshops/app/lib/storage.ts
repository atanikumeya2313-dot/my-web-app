import { Shop, MyEvent } from '../types';

const KEY = 'newshops_shops';
const EVENT_KEY = 'newshops_events';

export function loadShops(): Shop[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); }
  catch { return []; }
}
export function saveShops(shops: Shop[]) {
  localStorage.setItem(KEY, JSON.stringify(shops));
}

export function loadEvents(): MyEvent[] {
  try { return JSON.parse(localStorage.getItem(EVENT_KEY) ?? '[]'); }
  catch { return []; }
}
export function saveEvents(events: MyEvent[]) {
  localStorage.setItem(EVENT_KEY, JSON.stringify(events));
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

// イベントの開催状況。startDate基準で、endDateがあれば会期を考慮する。
// 返り値: { state, days } state=upcoming|ongoing|ended|unknown, days=開始までの日数
export function eventStatus(startDate?: string, endDate?: string):
  { state: 'upcoming' | 'ongoing' | 'ended' | 'unknown'; days: number | null } {
  if (!startDate) return { state: 'unknown', days: null };
  const start = daysUntil(startDate);
  const end = daysUntil(endDate || startDate);
  if (start === null) return { state: 'unknown', days: null };
  if (start > 0) return { state: 'upcoming', days: start };          // これから
  if (end !== null && end >= 0) return { state: 'ongoing', days: 0 }; // 会期中
  return { state: 'ended', days: start };                            // 終了
}

// ── バックアップ ──────────────────────────────
export interface BackupData { version: number; exportedAt: string; shops: Shop[]; events?: MyEvent[]; }
export function exportData(): BackupData {
  return { version: 2, exportedAt: new Date().toISOString(), shops: loadShops(), events: loadEvents() };
}
export function importData(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const d = raw as Partial<BackupData>;
  if (!Array.isArray(d.shops)) return false;
  saveShops(d.shops);
  if (Array.isArray(d.events)) saveEvents(d.events);   // 旧バックアップ(v1)にevents無し→そのまま
  return true;
}
