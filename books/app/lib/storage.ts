import { Book } from '../types';

const KEY = 'books_books';

export function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadBooks(): Book[] {
  try {
    const s = localStorage.getItem(KEY);
    const arr: Book[] = s ? JSON.parse(s) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveBooks(books: Book[]) {
  localStorage.setItem(KEY, JSON.stringify(books));
}

// ── バックアップ ──
export function exportData(): string {
  return JSON.stringify({ app: 'books', version: 1, books: loadBooks() }, null, 2);
}

export function importData(raw: string): boolean {
  try {
    const d = JSON.parse(raw);
    if (!Array.isArray(d?.books)) return false;
    saveBooks(d.books);
    return true;
  } catch {
    return false;
  }
}
