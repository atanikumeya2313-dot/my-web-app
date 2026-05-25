import { Book } from '../types';

const KEY = 'booklog_books';

export function loadBooks(): Book[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function saveBooks(books: Book[]) {
  localStorage.setItem(KEY, JSON.stringify(books));
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
