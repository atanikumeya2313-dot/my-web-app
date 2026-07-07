import { Sub, Cycle } from '../types';

const KEY = 'subsc_subs';

export function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 更新日を1周期ぶん進める
export function addCycle(ymd: string, cycle: Cycle): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (cycle === 'week')       dt.setDate(dt.getDate() + 7);
  else if (cycle === 'month') dt.setMonth(dt.getMonth() + 1);
  else                        dt.setFullYear(dt.getFullYear() + 1);
  return toYMD(dt);
}

// 今日までに過ぎた更新日を、次回（未来）まで繰り上げる
export function rollForward(subs: Sub[]): { subs: Sub[]; changed: boolean } {
  const today = todayYMD();
  let changed = false;
  const next = subs.map(s => {
    if (!s.nextDate) return s;
    let nd = s.nextDate;
    let guard = 0;
    while (nd < today && guard < 600) { nd = addCycle(nd, s.cycle); guard++; }
    if (nd !== s.nextDate) { changed = true; return { ...s, nextDate: nd }; }
    return s;
  });
  return { subs: next, changed };
}

// 残り日数（今日=0、過去はマイナス）
export function daysUntil(ymd: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [y, m, d] = ymd.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function loadSubs(): Sub[] {
  try {
    const s = localStorage.getItem(KEY);
    const a = s ? JSON.parse(s) : [];
    return Array.isArray(a) ? a : [];
  } catch { return []; }
}

export function saveSubs(subs: Sub[]) {
  localStorage.setItem(KEY, JSON.stringify(subs));
}

// ── バックアップ ──
export function exportData(): string {
  return JSON.stringify({ app: 'subsc', version: 1, subs: loadSubs() }, null, 2);
}
export function importData(raw: string): boolean {
  try {
    const d = JSON.parse(raw);
    if (!Array.isArray(d?.subs)) return false;
    saveSubs(d.subs);
    return true;
  } catch { return false; }
}
