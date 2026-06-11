export type Category = string;

export const DEFAULT_CATEGORIES: Category[] = ['食品・飲料', '日用品・消耗品', '薬・医療品', 'その他'];

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
