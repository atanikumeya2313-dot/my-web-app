import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface BookResult {
  title: string;
  author: string;
  genre: string;
  thumbnail?: string;
  isbn?: string;
}

function extractTag(block: string, tag: string): string {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`).exec(block);
  return (m?.[1] ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .trim();
}

function extractAllTags(block: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'g');
  const out: string[] = [];
  let m;
  while ((m = re.exec(block)) !== null) {
    out.push(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').trim());
  }
  return out;
}

function findISBN13(ids: string[]): string | undefined {
  for (const id of ids) {
    const m = /\b(97[89]\d{10})\b/.exec(id.replace(/-/g, ''));
    if (m) return m[1];
  }
  return undefined;
}

function cleanAuthor(raw: string): string {
  return raw
    .replace(/∥.*/g, '')
    .split(',')
    .filter(p => !/^\d{4}/.test(p.trim()))
    .join(' ')
    .trim();
}

async function fetchWithTimeout(url: string, ms = 7000): Promise<Response> {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
  } finally {
    clearTimeout(id);
  }
}

async function ndlSearch(query: string): Promise<BookResult[]> {
  const url = `https://ndlsearch.ndl.go.jp/api/opensearch?title=${encodeURIComponent(query)}&cnt=20`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return [];
  const xml = await res.text();

  const results: BookResult[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) !== null && results.length < 8) {
    const block  = m[1];
    const title  = extractTag(block, 'title');
    const author = cleanAuthor(extractTag(block, 'dc:creator'));
    const ids    = extractAllTags(block, 'dc:identifier');
    const isbn   = findISBN13(ids);

    if (!title) continue;

    results.push({
      title,
      author,
      genre: '',
      thumbnail: isbn ? `https://cover.openbd.jp/${isbn}.jpg` : undefined,
      isbn,
    });
  }
  return results;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const isbn = searchParams.get('isbn');
  const q    = searchParams.get('q');

  /* ── ISBN検索 ── */
  if (isbn) {
    const clean = isbn.replace(/-/g, '');

    // OpenBD
    try {
      const r = await fetchWithTimeout(`https://api.openbd.jp/v1/get?isbn=${clean}`);
      if (r.ok) {
        const data = await r.json();
        const s = data?.[0]?.summary;
        if (s?.title) {
          return NextResponse.json([{
            title:     s.title,
            author:    cleanAuthor(s.author ?? ''),
            genre:     '',
            thumbnail: s.cover || `https://cover.openbd.jp/${clean}.jpg`,
            isbn:      s.isbn ?? clean,
          }]);
        }
      }
    } catch { /* fall through */ }

    // NDL fallback (ISBN as keyword)
    try {
      const results = await ndlSearch(clean);
      if (results.length > 0) return NextResponse.json(results.slice(0, 1));
    } catch { /* fall through */ }

    return NextResponse.json([]);
  }

  /* ── キーワード検索 ── */
  if (q) {
    try {
      const results = await ndlSearch(q);
      return NextResponse.json(results);
    } catch { /* fall through */ }
    return NextResponse.json([]);
  }

  return NextResponse.json([]);
}
