export type Category = string;

export const DEFAULT_CATEGORIES: Category[] = ['食品・飲料', '日用品・消耗品', '薬・医療品', 'その他'];

// 食材とみなさないカテゴリ（0になっても在庫に残す＝要補充リスト用）。
// これ以外（食品・飲料／その他／自作カテゴリ）は食材扱いで、0になったら在庫から削除する。
export const NON_FOOD_CATEGORIES: Category[] = ['日用品・消耗品', '薬・医療品'];
export function isFoodCategory(category: string): boolean {
  return !NON_FOOD_CATEGORIES.includes(category);
}

export const CATEGORY_ICONS: Record<string, string> = {
  '食品・飲料': '🥫',
  '日用品・消耗品': '🧴',
  '薬・医療品': '💊',
  'その他': '📦',
};

export function getCategoryIcon(category: string, customIcons?: Record<string, string>): string {
  return customIcons?.[category] ?? CATEGORY_ICONS[category] ?? '📦';
}

export const UNITS = ['個', '本', '袋', '缶', '箱', '枚', 'g', 'ml', 'L', 'kg'];

export interface StockItem {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  minQuantity: number;
  targetQuantity?: number; // 目標在庫数（補充済の設定先・プログレスバー基準）
  unit: string;
  memo?: string;
  expiryDate?: string; // YYYY-MM-DD
  addedAt: string;
}

export interface HistoryEntry {
  id: string;
  itemId: string;
  itemName: string;
  delta: number;
  quantityAfter: number;
  date: string;
}

export type SortKey = 'name' | 'low-stock' | 'category' | 'expiry';
