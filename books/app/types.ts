export type Shelf = 'read' | 'want';   // 読んだ / 読みたい

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;        // ジャンル
  year?: string;        // 出版年など（任意・文字列）
  synopsis?: string;    // あらすじ・概要（任意）
  rating?: number;      // 1〜5（読んだ本のみ）
  memo?: string;        // 感想・メモ
  finishedAt?: string;  // 読了日 YYYY-MM-DD（任意）
  shelf: Shelf;
  source?: string;      // 'ai' など（AI検索/おすすめ由来の目印）
  addedAt: string;
}

// Gemini から返る本の候補（検索用・保存前）
export interface BookCandidate {
  title: string;
  author: string;
  genre: string;
  year?: string;
  synopsis?: string;
}

// おすすめ（保存前）
export interface Recommendation {
  title: string;
  author: string;
  genre: string;
  reason: string;
}

export const GENRES = [
  '小説', 'ミステリー', 'SF・ファンタジー', 'ビジネス・自己啓発',
  '実用・趣味', 'ノンフィクション', 'エッセイ', '歴史', '科学', 'マンガ', 'その他',
];

// タイトルから安定した色を作る（プレースホルダー表紙用）
export function coverColors(title: string): { from: string; to: string } {
  const palette = [
    ['#f59e0b', '#d97706'], ['#10b981', '#059669'], ['#3b82f6', '#2563eb'],
    ['#8b5cf6', '#7c3aed'], ['#ef4444', '#dc2626'], ['#ec4899', '#db2777'],
    ['#14b8a6', '#0d9488'], ['#f97316', '#ea580c'], ['#6366f1', '#4f46e5'],
  ];
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  const [from, to] = palette[h % palette.length];
  return { from, to };
}
