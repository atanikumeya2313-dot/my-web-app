import { NextRequest, NextResponse } from 'next/server';

interface GBVolume {
  volumeInfo: {
    title?: string;
    authors?: string[];
    categories?: string[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
}

function parseGB(vol: GBVolume['volumeInfo'], fallbackIsbn?: string) {
  const isbn =
    vol.industryIdentifiers?.find(x => x.type === 'ISBN_13')?.identifier ??
    vol.industryIdentifiers?.find(x => x.type === 'ISBN_10')?.identifier ??
    fallbackIsbn;
  const thumb = vol.imageLinks?.thumbnail ?? vol.imageLinks?.smallThumbnail;
  return {
    title:     vol.title ?? '',
    author:    vol.authors?.join(', ') ?? '',
    genre:     vol.categories?.[0] ?? '',
    thumbnail: thumb ? thumb.replace('http://', 'https://') : undefined,
    isbn,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const isbn = searchParams.get('isbn');
  const q    = searchParams.get('q');

  if (isbn) {
    // OpenBD (日本書籍専用、APIキー不要)
    try {
      const res  = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`);
      if (res.ok) {
        const data = await res.json();
        const book = data?.[0];
        if (book?.summary) {
          return NextResponse.json([{
            title:     book.summary.title     ?? '',
            author:    book.summary.author    ?? '',
            genre:     '',
            thumbnail: book.summary.cover     || undefined,
            isbn:      book.summary.isbn,
          }]);
        }
      }
    } catch { /* fall through */ }

    // フォールバック: Google Books
    try {
      const res  = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`);
      if (res.ok) {
        const data = await res.json();
        const item: GBVolume | undefined = data.items?.[0];
        if (item) return NextResponse.json([parseGB(item.volumeInfo, isbn)]);
      }
    } catch { /* fall through */ }

    return NextResponse.json([]);
  }

  if (q) {
    try {
      const res  = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8`);
      if (res.ok) {
        const data = await res.json();
        const items: GBVolume[] = data.items ?? [];
        return NextResponse.json(items.map(i => parseGB(i.volumeInfo)));
      }
    } catch { /* fall through */ }
    return NextResponse.json([]);
  }

  return NextResponse.json([]);
}
