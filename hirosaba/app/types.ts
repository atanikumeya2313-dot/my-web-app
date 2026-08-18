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
  rarity: number;      // ★の数（0=未設定）
  type: string;        // タイプ/属性（自由入力）
  quirk: string;       // 個性メモ
  curLv: number;       // 現在レベル
  targetLv: number;    // 目標レベル
  awaken: number;      // 凸/覚醒段階
  priority: Priority;
  tasks: Task[];
  memo: string;
  createdAt: string;
}

// 育成の進捗率（チェックリストの完了割合。0件なら優先度で判断）
export function progressPct(c: Character): number {
  if (c.tasks.length === 0) return c.priority === 'done' ? 100 : 0;
  const done = c.tasks.filter(t => t.done).length;
  return Math.round((done / c.tasks.length) * 100);
}
