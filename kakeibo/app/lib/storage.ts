import { Transaction } from '../types';

const STORAGE_KEY = 'kakeibo_transactions';

export function loadTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveTransactions(transactions: Transaction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

export function addTransaction(tx: Transaction): Transaction[] {
  const all = loadTransactions();
  const updated = [tx, ...all];
  saveTransactions(updated);
  return updated;
}

export function deleteTransaction(id: string): Transaction[] {
  const all = loadTransactions();
  const updated = all.filter((tx) => tx.id !== id);
  saveTransactions(updated);
  return updated;
}
