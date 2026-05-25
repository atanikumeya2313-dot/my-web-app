export type Category = '食品・飲料' | '日用品・消耗品' | '薬・医療品' | 'その他';

export const CATEGORIES: Category[] = ['食品・飲料', '日用品・消耗品', '薬・医療品', 'その他'];

export const CATEGORY_ICONS: Record<Category, string> = {
  '食品・飲料': '🥫',
  '日用品・消耗品': '🧴',
  '薬・医療品': '💊',
  'その他': '📦',
};

export const UNITS = ['個', '本', '袋', '缶', '箱', '枚', 'g', 'ml', 'L', 'kg'];

export interface StockItem {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  minQuantity: number;
  unit: string;
  memo?: string;
  addedAt: string;
}
