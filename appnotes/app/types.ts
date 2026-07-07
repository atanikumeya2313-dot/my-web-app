export type Kind = 'bug' | 'improve' | 'idea';
export type Priority = 'high' | 'mid' | 'low';
export type Status = 'open' | 'done';

export interface Note {
  id: string;
  app: string;        // 対象アプリ
  text: string;       // 不便な点・改善内容
  kind: Kind;
  priority: Priority;
  status: Status;
  weekend: boolean;   // 今週末やる
  createdAt: string;
  doneAt?: string;
}

// 対象アプリの候補（これまで作ったアプリ）
export const APPS = [
  '家計簿', 'TODO', '資産形成', '在庫管理', 'ひとこと日記',
  'AI暗記カード', 'えひめ新店チェック', 'AI本だな', '献立アシスタント',
  'サブスク管理', 'アプリ改善メモ', '地震・防災', 'ハブ', 'その他',
];

export const KIND_LABEL: Record<Kind, string> = { bug: 'バグ', improve: '改善', idea: 'アイデア' };
export const KIND_CLS: Record<Kind, string> = {
  bug: 'bg-red-100 text-red-600',
  improve: 'bg-blue-100 text-blue-600',
  idea: 'bg-purple-100 text-purple-600',
};
export const PRIORITY_LABEL: Record<Priority, string> = { high: '高', mid: '中', low: '低' };
export const PRIORITY_CLS: Record<Priority, string> = {
  high: 'bg-red-500', mid: 'bg-amber-400', low: 'bg-gray-300',
};
export const PRIORITY_ORDER: Record<Priority, number> = { high: 0, mid: 1, low: 2 };
