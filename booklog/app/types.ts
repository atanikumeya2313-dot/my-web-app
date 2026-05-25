export type BookStatus = 'want' | 'reading' | 'done';

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  thumbnail?: string;
  isbn?: string;
  status: BookStatus;
  rating?: number;    // 1-5
  memo?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  addedAt: string;    // ISO string
}
