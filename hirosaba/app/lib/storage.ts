import { Character, Gear, GearKind, Collection, Rarity, Party, Task, Priority } from '../types';

const KEY = 'hirosaba_chars';
const GEAR_KEY: Record<GearKind, string> = { equip: 'hirosaba_equip' };
const COLL_KEY = 'hirosaba_collection';
const PARTY_KEY = 'hirosaba_parties';

// 旧フォーマット（type/curLv 等）を新項目へ吸収して読み込む
function migrate(c: Partial<Character> & Record<string, unknown>): Character {
  const rar = String(c.rarity);
  return {
    id:        String(c.id ?? `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    name:      String(c.name ?? ''),
    title:     String(c.title ?? ''),
    rarity:    (['R', 'SR', 'UR', 'LR'].includes(rar) ? rar : 'R') as Rarity,
    group:     String(c.group ?? c.type ?? ''),
    intimacy:  Number(c.intimacy ?? 0) || 0,
    level:     Number(c.level ?? c.curLv ?? 0) || 0,
    levelMax:  Number(c.levelMax ?? 0) || 0,
    atk:       Number(c.atk ?? 0) || 0,
    hp:        Number(c.hp ?? 0) || 0,
    power:     Number(c.power ?? 0) || 0,
    priority:  (['top', 'active', 'done', 'later'].includes(String(c.priority)) ? c.priority : 'active') as Priority,
    tasks:     Array.isArray(c.tasks) ? (c.tasks as Task[]) : [],
    memo:      String(c.memo ?? ''),
    emoji:     '',
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

// ── コレクション ──
function migrateColl(c: Partial<Collection> & Record<string, unknown>): Collection {
  const rar = String(c.rarity);
  return {
    id:         String(c.id ?? `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    name:       String(c.name ?? ''),
    emoji:      String(c.emoji ?? '🎴'),
    rarity:     (['R', 'SR', 'UR', 'LR'].includes(rar) ? rar : 'R') as Rarity,
    level:      Number(c.level ?? 0) || 0,
    levelMax:   Number(c.levelMax ?? 0) || 0,
    evolution:  Number(c.evolution ?? 0) || 0,
    power:      Number(c.power ?? 0) || 0,
    stats:      Array.isArray(c.stats)
      ? c.stats.map(s => ({ type: String((s as { type?: unknown })?.type ?? ''), value: Number((s as { value?: unknown; pct?: unknown })?.value ?? (s as { pct?: unknown })?.pct ?? 0) || 0 }))
      : [],
    effectText: String(c.effectText ?? c.effect ?? ''),
    priority:   (['top', 'active', 'done', 'later'].includes(String(c.priority)) ? c.priority : 'active') as Priority,
    tasks:      Array.isArray(c.tasks) ? (c.tasks as Task[]) : [],
    memo:       String(c.memo ?? ''),
    createdAt:  String(c.createdAt ?? new Date().toISOString()),
  };
}
export function loadCollections(): Collection[] {
  try {
    const s = localStorage.getItem(COLL_KEY);
    const a = s ? JSON.parse(s) : [];
    return Array.isArray(a) ? a.map(migrateColl) : [];
  } catch { return []; }
}
export function saveCollections(list: Collection[]) {
  localStorage.setItem(COLL_KEY, JSON.stringify(list));
}

// ── パーティ ──
function migrateParty(p: Partial<Party> & Record<string, unknown>): Party {
  return {
    id:            String(p.id ?? `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    name:          String(p.name ?? ''),
    charIds:       Array.isArray(p.charIds) ? p.charIds.map(String) : [],
    collectionIds: Array.isArray(p.collectionIds) ? p.collectionIds.map(String) : [],
    memo:          String(p.memo ?? ''),
    createdAt:     String(p.createdAt ?? new Date().toISOString()),
  };
}
export function loadParties(): Party[] {
  try {
    const s = localStorage.getItem(PARTY_KEY);
    const a = s ? JSON.parse(s) : [];
    return Array.isArray(a) ? a.map(migrateParty) : [];
  } catch { return []; }
}
export function saveParties(list: Party[]) {
  localStorage.setItem(PARTY_KEY, JSON.stringify(list));
}

// ── バックアップ / クラウド同期 ──
export function exportData(): string {
  return JSON.stringify({
    app: 'hirosaba', version: 3, exportedAt: new Date().toISOString(),
    chars: loadChars(), equip: loadGear('equip'), collection: loadCollections(), parties: loadParties(),
  });
}

export function importData(raw: string): boolean {
  try {
    const d = JSON.parse(raw);
    if (!Array.isArray(d?.chars) && !Array.isArray(d?.equip) && !Array.isArray(d?.collection) && !Array.isArray(d?.parties)) return false;
    if (Array.isArray(d.chars))      saveChars(d.chars.map(migrate));
    if (Array.isArray(d.equip))      saveGear('equip', d.equip.map(migrateGear));
    if (Array.isArray(d.collection)) saveCollections(d.collection.map(migrateColl));
    if (Array.isArray(d.parties))    saveParties(d.parties.map(migrateParty));
    return true;
  } catch { return false; }
}

export function hasData(): boolean {
  try {
    return loadChars().length > 0 || loadGear('equip').length > 0
      || loadCollections().length > 0 || loadParties().length > 0;
  } catch { return false; }
}
