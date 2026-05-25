export interface BookInfo {
  title: string;
  author: string;
  genre: string;
  thumbnail?: string;
  isbn?: string;
}

export async function searchByISBN(isbn: string): Promise<BookInfo | null> {
  try {
    const res = await fetch(`/api/books?isbn=${encodeURIComponent(isbn)}`);
    if (!res.ok) return null;
    const data: BookInfo[] = await res.json();
    return data[0] ?? null;
  } catch { return null; }
}

export async function searchByKeyword(query: string): Promise<BookInfo[]> {
  try {
    const res = await fetch(`/api/books?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}
