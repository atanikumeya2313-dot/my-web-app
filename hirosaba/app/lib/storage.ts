import { Character, Gear, GearKind, Task, Priority } from '../types';

const KEY = 'hirosaba_chars';
const GEAR_KEY: Record<GearKind, string> = { equip: 'hirosaba_equip', collection: 'hirosaba_collection' };

// 旧フォーマット（type/curLv 等）を新項目へ吸収して読み込む
function migrate(c: Partial<Character> & Record<string, unknown>): Character {
  return {
    id:        String(c.id ?? `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    name:      String(c.name ?? ''),
    emoji:     String(c.emoji ?? '🦸'),
    rarity:    Number(c.rarity ?? 0) || 0,
    intimacy:  Number(c.intimacy ?? 0) || 0,
    group:     String(c.group ?? c.type ?? ''),
    level:     Number(c.level ?? c.curLv ?? 0) || 0,
    power:     Number(c.power ?? 0) || 0,
    priority:  (['top', 'active', 'done', 'later'].includes(String(c.priority)) ? c.priority : 'active') as Priority,
    tasks:     Array.isArray(c.tasks) ? (c.tasks as Task[]) : [],
    memo:      String(c.memo ?? ''),
    createdAt: String(c.createdAt ?? new Date().toISOString()),
  };
}

export function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadChars(): Character[] {
  try {
    const s = localStorage.getItem(KEY);
    const a = s ? JSON.parse(s) : [];
    return Array.isArray(a) ? a.map(migrate) : [];
  } catch { return []; }
}

export function saveChars(list: Character[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

// ── 装備・コレクション ──
function migrateGear(g: Partial<Gear> & Record<string, unknown>): Gear {
  return {
    id:        String(g.id ?? `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    name:      String(g.name ?? ''),
    emoji:     String(g.emoji ?? '🛡️'),
    rarity:    Number(g.rarity ?? 0) || 0,
    level:     Number(g.level ?? 0) || 0,
    grade:     Number(g.grade ?? 0) || 0,
    sub:       String(g.sub ?? ''),
    effect:    String(g.effect ?? ''),
    priority:  (['top', 'active', 'done', 'later'].includes(String(g.priority)) ? g.priority : 'active') as Priority,
    tasks:     Array.isArray(g.tasks) ? (g.tasks as Task[]) : [],
    memo:      String(g.memo ?? ''),
    createdAt: String(g.createdAt ?? new Date().toISOString()),
  };
}
export function loadGear(kind: GearKind): Gear[] {
  try {
    const s = localStorage.getItem(GEAR_KEY[kind]);
    const a = s ? JSON.parse(s) : [];
    return Array.isArray(a) ? a.map(migrateGear) : [];
  } catch { return []; }
}
export function saveGear(kind: GearKind, list: Gear[]) {
  localStorage.setItem(GEAR_KEY[kind], JSON.stringify(list));
}

// ── バックアップ / クラウド同期 ──
export function exportData(): string {
  return JSON.stringify({
    app: 'hirosaba', version: 2, exportedAt: new Date().toISOString(),
    chars: loadChars(), equip: loadGear('equip'), collection: loadGear('collection'),
  });
}

export function importData(raw: string): boolean {
  try {
    const d = JSON.parse(raw);
    if (!Array.isArray(d?.chars) && !Array.isArray(d?.equip) && !Array.isArray(d?.collection)) return false;
    if (Array.isArray(d.chars))      saveChars(d.chars.map(migrate));
    if (Array.isArray(d.equip))      saveGear('equip', d.equip.map(migrateGear));
    if (Array.isArray(d.collection)) saveGear('collection', d.collection.map(migrateGear));
    return true;
  } catch { return false; }
}

export function hasData(): boolean {
  try { return loadChars().length > 0 || loadGear('equip').length > 0 || loadGear('collection').length > 0; }
  catch { return false; }
}
