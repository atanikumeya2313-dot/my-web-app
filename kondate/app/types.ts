// 手持ち食材（パントリー）
export interface Ingredient {
  name: string;
  soon?: boolean;   // 消費期限が近い＝使い切りたい
}

// AIの献立提案
export interface Suggestion {
  title: string;
  description: string;
  cuisine?: string;
  timeMin?: number;    // 調理時間の目安（分）
  used: string[];      // 手持ちから使う食材
  missing: string[];   // 買い足しが必要な主な食材
  steps: string[];     // 作り方の手順
}

export interface SavedMeal extends Suggestion {
  id: string;
  savedAt: string;
}

export interface HistoryEntry {
  id: string;
  title: string;
  date: string;   // YYYY-MM-DD
}

export interface CookOptions {
  servings: number;   // 何人分
  cuisine: string;    // 指定なし / 和食 / 洋食 / 中華 / エスニック
  maxTime: string;    // 指定なし / 15 / 30 / 60（分・以内）
  useUp: boolean;     // 使い切りを優先
}

export const CUISINES = ['指定なし', '和食', '洋食', '中華', 'エスニック'];
export const TIME_OPTIONS: { value: string; label: string }[] = [
  { value: '',   label: '指定なし' },
  { value: '15', label: '15分以内' },
  { value: '30', label: '30分以内' },
  { value: '60', label: '60分以内' },
];
