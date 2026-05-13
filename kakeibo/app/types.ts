export type TransactionType = 'income' | 'expense';

export const EXPENSE_CATEGORIES = ['食費', '交通費', '娯楽費', '光熱費', '日用品', '医療費', 'その他'] as const;
export const INCOME_CATEGORIES = ['給料', '副収入', 'その他'] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type Category = ExpenseCategory | IncomeCategory;

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: Category;
  memo: string;
}
