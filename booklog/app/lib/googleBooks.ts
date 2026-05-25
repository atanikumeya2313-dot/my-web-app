export interface BookInfo {
  title: string;
  author: string;
  genre: string;
  thumbnail?: string;
  isbn?: string;
}

interface GBVolume {
  volumeInfo: {
    title?: string;
    authors?: string[];
    categories?: string[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
}

function parseVolume(vol: GBVolume['volumeInfo'], fallbackIsbn?: string): BookInfo {
  const isbn = vol.industryIdentifiers?.find(x => x.type === 'ISBN_13')?.identifier
    ?? vol.industryIdentifiers?.find(x => x.type === 'ISBN_10')?.identifier
    ?? fallbackIsbn;
  const thumb = vol.imageLinks?.thumbnail ?? vol.imageLinks?.smallThumbnail;
  return {
    title:     vol.title ?? '',
    author:    vol.authors?.join(', ') ?? '',
    genre:     vol.categories?.[0] ?? '',
    thumbnail: thumb ? thumb.replace('http://', 'https://') : undefined,
    isbn,
  };
}

export async function searchByISBN(isbn: string): Promise<BookInfo | null> {
  try {
    const res  = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`);
    if (!res.ok) return null;
    const data = await res.json();
    const item: GBVolume | undefined = data.items?.[0];
    if (!item) return null;
    return parseVolume(item.volumeInfo, isbn);
  } catch { return null; }
}

export async function searchByKeyword(query: string): Promise<BookInfo[]> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).map((item: GBVolume) => parseVolume(item.volumeInfo));
  } catch { return []; }
}
