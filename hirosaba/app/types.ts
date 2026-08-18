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
export const DEFAULT_TASKS = ['レベル上げ', 'スキル強化', '必殺技の解放', '育成素材を集める'];

export interface Character {
  id: string;
  name: string;
  emoji: string;       // アイコン絵文字
  rarity: number;      // レアリティ（★の数。0=未設定）
  intimacy: number;    // 親密度
  group: string;       // グループ
  level: number;       // レベル
  power: number;       // 戦闘力
  priority: Priority;
  tasks: Task[];
  memo: string;
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
export type CollectionRarity = 'R' | 'SR' | 'UR' | 'LR';
export const COLLECTION_RARITIES: CollectionRarity[] = ['R', 'SR', 'UR', 'LR'];
export const COLL_RARITY_CLS: Record<CollectionRarity, string> = {
  R:  'bg-gray-200 text-gray-600',
  SR: 'bg-blue-100 text-blue-600',
  UR: 'bg-purple-100 text-purple-600',
  LR: 'bg-amber-100 text-amber-700',
};
export const COLLECTION_EVOLUTION_MAX = 5;
export const COLL_STAT_TYPES = ['最大HP', '攻撃力', '防御力', '攻撃速度', 'HP回復量', 'クリティカル率', 'スキル威力', '移動速度'];
export const COLL_EMOJIS = ['🎴', '🖼️', '🌟', '💫', '🔥', '⚡', '💥', '🌀', '🏆', '🎬', '📸', '💚'];

export interface CollStat { type: string; pct: number }   // 例: {type:'最大HP', pct:15}

export interface Collection {
  id: string;
  name: string;
  emoji: string;
  rarity: CollectionRarity;
  level: number;
  levelMax: number;
  evolution: number;      // 進化段階（0〜5）
  stats: CollStat[];      // ステータス上昇（2枠想定）
  effectText: string;     // 「〇〇グループの攻撃力を◯%アップ」など
  priority: Priority;
  tasks: Task[];
  memo: string;
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
