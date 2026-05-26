import { Book, ReadingGoal } from '../types';

const BOOKS_KEY = 'booklog_books';
const GOAL_KEY  = 'booklog_goal';

// ── Books ──────────────────────────────────────────────

export function loadBooks(): Book[] {
  try { return JSON.parse(localStorage.getItem(BOOKS_KEY) || '[]'); }
  catch { return []; }
}

export function saveBooks(books: Book[]) {
  localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}

export function addBook(book: Book): Book[] {
  const books = [book, ...loadBooks()];
  saveBooks(books);
  return books;
}

export function updateBook(updated: Book): Book[] {
  const books = loadBooks().map(b => b.id === updated.id ? updated : b);
  saveBooks(books);
  return books;
}

export function deleteBook(id: string): Book[] {
  const books = loadBooks().filter(b => b.id !== id);
  saveBooks(books);
  return books;
}

// ── Goal ───────────────────────────────────────────────

export function loadGoal(): ReadingGoal | null {
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveGoal(goal: ReadingGoal) {
  localStorage.setItem(GOAL_KEY, JSON.stringify(goal));
}

// ── Export / Import ────────────────────────────────────

export function exportData(): void {
  const data = {
    exportedAt: new Date().toISOString(),
    books: loadBooks(),
    goal:  loadGoal(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `booklog_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(json: string): { books: Book[]; goal: ReadingGoal | null } | null {
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data.books)) return null;
    saveBooks(data.books);
    if (data.goal) saveGoal(data.goal);
    return { books: data.books, goal: data.goal ?? null };
  } catch { return null; }
}
