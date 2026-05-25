export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

interface BookInput {
  title: string;
  author: string;
  genre: string;
  status: string;
  rating?: number;
}

export interface Recommendation {
  title: string;
  author: string;
  thumbnail?: string;
  isbn?: string;
  reason: string;
}

// ── XML helpers ──────────────────────────────────────────────
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
  while ((m = re.exec(block)) !== null)
    out.push(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim());
  return out;
}

function findISBN13(ids: string[]): string | undefined {
  for (const id of ids) {
    const m = /\b(97[89]\d{10})\b/.exec(id.replace(/-/g, ''));
    if (m) return m[1];
  }
}

function cleanAuthor(raw: string): string {
  return raw.replace(/∥.*/g, '').split(',').filter(p => !/^\d{4}/.test(p.trim())).join(' ').trim();
}

async function ndlSearch(param: string, value: string) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(
      `https://ndlsearch.ndl.go.jp/api/opensearch?${param}=${encodeURIComponent(value)}&cnt=20`,
      { signal: ctrl.signal, cache: 'no-store' },
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const results: { title: string; author: string; isbn?: string; thumbnail?: string }[] = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const block  = m[1];
      const title  = extractTag(block, 'title');
      const author = cleanAuthor(extractTag(block, 'dc:creator'));
      const isbn   = findISBN13(extractAllTags(block, 'dc:identifier'));
      if (title) results.push({ title, author, isbn, thumbnail: isbn ? `https://cover.openbd.jp/${isbn}.jpg` : undefined });
    }
    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(tid);
  }
}

function normalize(t: string) {
  return t.toLowerCase().replace(/[\s　　・]/g, '').replace(/[ー−]/g, 'ー');
}

// ── POST handler ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { books }: { books: BookInput[] } = await req.json();

  const done = books.filter(b => b.status === 'done');
  if (done.length < 2) return NextResponse.json([]);

  // Preference analysis
  const authorScore: Record<string, { sum: number; cnt: number }> = {};
  const genreScore:  Record<string, number> = {};

  for (const b of done) {
    const r = b.rating ?? 3;
    if (b.author?.trim()) {
      authorScore[b.author] ??= { sum: 0, cnt: 0 };
      authorScore[b.author].sum += r;
      authorScore[b.author].cnt++;
    }
    if (b.genre?.trim()) {
      genreScore[b.genre] = (genreScore[b.genre] ?? 0) + r;
    }
  }

  const topAuthors = Object.entries(authorScore)
    .map(([a, s]) => ({ a, avg: s.sum / s.cnt, cnt: s.cnt }))
    .sort((x, y) => y.avg - x.avg || y.cnt - x.cnt)
    .slice(0, 2).map(x => x.a);

  const topGenres = Object.entries(genreScore)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 2).map(([g]) => g);

  const existing = new Set(books.map(b => normalize(b.title)));
  const added    = new Set<string>();
  const result:  Recommendation[] = [];

  const push = (items: { title: string; author: string; isbn?: string; thumbnail?: string }[], reason: string) => {
    for (const item of items) {
      if (result.length >= 6) break;
      const key = normalize(item.title);
      if (existing.has(key) || added.has(key)) continue;
      added.add(key);
      result.push({ ...item, reason });
    }
  };

  // Run all searches in parallel
  const searches = await Promise.allSettled([
    ...topAuthors.map(a => ndlSearch('creator', a).then(items => ({ items, reason: `「${a}」の他の作品` }))),
    ...topGenres .map(g => ndlSearch('title',   g).then(items => ({ items, reason: `よく読む「${g}」ジャンルの本` }))),
  ]);

  for (const r of searches) {
    if (r.status === 'fulfilled') push(r.value.items, r.value.reason);
    if (result.length >= 6) break;
  }

  return NextResponse.json(result);
}
