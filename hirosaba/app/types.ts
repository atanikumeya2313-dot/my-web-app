// ヒロサバ（僕のヒーローアカデミア UNITED SURVIVAL）のキャラ育成管理

export type Priority = 'top' | 'active' | 'done' | 'later';

export const PRIORITIES: { value: Priority; label: string; cls: string }[] = [
  { value: 'top',    label: '最優先', cls: 'bg-red-500 text-white' },
  { value: 'active', label: '育成中', cls: 'bg-emerald-500 text-white' },
  { value: 'done',   label: '完成',   cls: 'bg-blue-500 text-white' },
  { value: 'later',  label: '後回し', cls: 'bg-gray-300 text-gray-600' },
];

export function priorityMeta(p: Priority) {
  return PRIORITIES.find(x => x.value === p) ?? PRIORITIES[1];
}

// 育成チェックリストの1項目
export interface Task { id: string; label: string; done: boolean }

// よく使う育成項目（新規キャラ作成時の初期チェックリスト）
export const DEFAULT_TASKS = ['レベル上げ', 'トレーニング', 'レアリティUP'];

// レアリティ（R < SR < UR < LR）。キャラ・コレクション共通。
export type Rarity = 'R' | 'SR' | 'UR' | 'LR';
export const RARITIES: Rarity[] = ['R', 'SR', 'UR', 'LR'];
export const RARITY_CLS: Record<Rarity, string> = {
  R:  'bg-gray-200 text-gray-600',
  SR: 'bg-slate-300 text-slate-700',
  UR: 'bg-amber-100 text-amber-700',
  LR: 'bg-yellow-200 text-yellow-800',
};
export const RARITY_ORDER: Record<Rarity, number> = { LR: 0, UR: 1, SR: 2, R: 3 };

export interface Character {
  id: string;
  name: string;
  title: string;       // 二つ名（例：見出した力の形）
  rarity: Rarity;
  group: string;       // グループ
  intimacy: number;    // 親密度
  level: number;       // レベル（現在）
  levelMax: number;    // レベル上限
  atk: number;         // 攻撃力
  hp: number;          // HP
  power: number;       // 戦闘力（強化段階）
  priority: Priority;
  tasks: Task[];
  memo: string;
  emoji: string;       // 未使用（後方互換のため残す）
  createdAt: string;
}

// 装備・コレクション（共通の育成アイテム）
export interface Gear {
  id: string;
  name: string;
  emoji: string;
  rarity: number;      // レアリティ（★）
  level: number;       // レベル
  grade: number;       // 装備=グレード / コレクション=ランク
  sub: string;         // 装備=スロット/タイプ / コレクション=元ネタ（名シーン）
  effect: string;      // 強化効果メモ
  priority: Priority;
  tasks: Task[];
  memo: string;
  createdAt: string;
}

export type GearKind = 'equip';

export interface GearConfig {
  title: string;
  emoji: string;
  subLabel: string;
  subPlaceholder: string;
  gradeLabel: string;
  defaultTasks: string[];
  emojiChoices: string[];
}

export const GEAR_CONFIG: Record<GearKind, GearConfig> = {
  equip: {
    title: '装備',
    emoji: '🛡️',
    subLabel: 'スロット/タイプ',
    subPlaceholder: '例：武器スロット / 攻撃タイプ',
    gradeLabel: 'グレード',
    defaultTasks: ['レベル上げ', '欠片を集める', 'グレードUP', 'スキル解放'],
    emojiChoices: ['🛡️', '⚔️', '🥊', '👟', '🧤', '🎽', '💍', '🔮', '📿', '🗡️', '🏹', '💊'],
  },
};

// ── コレクション（実ゲーム仕様） ──
export type CollectionRarity = Rarity;                          // 後方互換エイリアス
export const COLLECTION_RARITIES = RARITIES;
export const COLL_RARITY_CLS = RARITY_CLS;                      // 後方互換
export const COLLECTION_EVOLUTION_MAX = 4;
export const COLL_STAT_TYPES = ['最大HP', '攻撃速度', '攻撃力', '防御力', 'HP回復量', 'クリティカル値', 'スキル威力'];

export interface CollStat { type: string; value: number }      // 実数値（例: 最大HP 6667）

export interface Collection {
  id: string;
  name: string;
  rarity: Rarity;
  level: number;          // レベル（現在）
  levelMax: number;       // レベル上限
  evolution: number;      // 進化段階（0〜4）
  power: number;          // 戦闘力
  stats: CollStat[];      // 最大HP・攻撃速度など（実数値・2枠想定）
  effectText: string;     // コレクションスキルの効果メモ
  priority: Priority;
  tasks: Task[];
  memo: string;
  emoji: string;          // 未使用（後方互換のため残す）
  createdAt: string;
}

// パーティ編成（キャラ3人＋コレクション4つ）
export const PARTY_MAX_CHARS = 3;
export const PARTY_MAX_COLLECTIONS = 4;

export interface Party {
  id: string;
  name: string;
  charIds: string[];        // 最大3
  collectionIds: string[];  // 最大4
  memo: string;
  createdAt: string;
}

// 育成の進捗率（チェックリストの完了割合。0件なら優先度で判断）
export function progressPct(c: { tasks: Task[]; priority: Priority }): number {
  if (c.tasks.length === 0) return c.priority === 'done' ? 100 : 0;
  const done = c.tasks.filter(t => t.done).length;
  return Math.round((done / c.tasks.length) * 100);
}
