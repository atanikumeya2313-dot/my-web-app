import { Note } from '../types';

const KEY = 'appnotes_notes';
const LAST_APP_KEY = 'appnotes_last_app';

export function loadNotes(): Note[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); }
  catch { return []; }
}
export function saveNotes(notes: Note[]) {
  localStorage.setItem(KEY, JSON.stringify(notes));
}

// 直前に選んだアプリを覚えておく（素早く連続メモするため）
export function loadLastApp(): string | null {
  try { return localStorage.getItem(LAST_APP_KEY); } catch { return null; }
}
export function saveLastApp(app: string) {
  try { localStorage.setItem(LAST_APP_KEY, app); } catch {}
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── バックアップ ──
export interface BackupData { version: number; exportedAt: string; notes: Note[]; }
export function exportData(): BackupData {
  return { version: 1, exportedAt: new Date().toISOString(), notes: loadNotes() };
}
export function importData(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const d = raw as Partial<BackupData>;
  if (!Array.isArray(d.notes)) return false;
  saveNotes(d.notes);
  return true;
}
