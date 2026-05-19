export type TxType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TxType;
  category: string;
  memo: string;
}

export interface Category {
  id: string;
  name: string;
  type: TxType;
  isDefault: boolean;
}

export interface Budget {
  categoryId: string;
  amount: number;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'exp_food',          name: '食費',   type: 'expense', isDefault: true },
  { id: 'exp_transport',     name: '交通費', type: 'expense', isDefault: true },
  { id: 'exp_utility',       name: '光熱費', type: 'expense', isDefault: true },
  { id: 'exp_housing',       name: '住居費', type: 'expense', isDefault: true },
  { id: 'exp_daily',         name: '日用品', type: 'expense', isDefault: true },
  { id: 'exp_entertainment', name: '娯楽費', type: 'expense', isDefault: true },
  { id: 'exp_other',         name: 'その他', type: 'expense', isDefault: true },
  { id: 'inc_salary',        name: '給与',   type: 'income',  isDefault: true },
  { id: 'inc_extra',         name: '臨時収入', type: 'income', isDefault: true },
  { id: 'inc_other',         name: 'その他', type: 'income',  isDefault: true },
];
