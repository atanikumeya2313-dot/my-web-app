import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// ホットペッパー グルメ Webサービスでの標準検索（ジャンル別）。
// 愛媛県内をエリア名＋ジャンルで検索する。APIキーはサーバー側で保持。

interface Body { area?: string; genre?: string; keyword?: string; }

// APIキーワードはメニュー名を検索できないため、よくある料理名を対応ジャンルに変換する。
const TERM_GENRE: { term: string; genre: string }[] = [
  { term: 'つけ麺', genre: 'G013' }, { term: '油そば', genre: 'G013' }, { term: '家系', genre: 'G013' },
  { term: '二郎', genre: 'G013' }, { term: '中華そば', genre: 'G013' }, { term: 'ラーメン', genre: 'G013' },
  { term: 'お好み焼き', genre: 'G016' }, { term: 'たこ焼き', genre: 'G016' }, { term: 'もんじゃ', genre: 'G016' },
  { term: '焼肉', genre: 'G008' }, { term: 'ホルモン', genre: 'G008' },
  { term: 'カフェ', genre: 'G014' }, { term: 'スイーツ', genre: 'G014' }, { term: 'パンケーキ', genre: 'G014' }, { term: 'ケーキ', genre: 'G014' },
  { term: 'イタリアン', genre: 'G006' }, { term: 'フレンチ', genre: 'G006' }, { term: 'パスタ', genre: 'G006' }, { term: 'ピザ', genre: 'G006' },
  { term: '寿司', genre: 'G004' }, { term: 'すし', genre: 'G004' }, { term: 'そば', genre: 'G004' }, { term: '天ぷら', genre: 'G004' }, { term: '和食', genre: 'G004' },
  { term: '居酒屋', genre: 'G001' }, { term: '焼き鳥', genre: 'G001' }, { term: '焼鳥', genre: 'G001' },
  { term: 'バー', genre: 'G012' }, { term: 'カクテル', genre: 'G012' },
  { term: '中華', genre: 'G007' }, { term: '餃子', genre: 'G007' },
  { term: 'ステーキ', genre: 'G005' }, { term: 'ハンバーグ', genre: 'G005' }, { term: '洋食', genre: 'G005' },
  { term: 'エスニック', genre: 'G009' }, { term: 'タイ', genre: 'G009' }, { term: 'カレー', genre: 'G015' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pick(s: any) {
  return {
    name: String(s?.name ?? ""),
    genre: String(s?.genre?.name ?? ""),
    address: String(s?.address ?? ""),
    access: String(s?.access ?? ""),
    budget: String(s?.budget?.name ?? ""),
    url: String(s?.urls?.pc ?? ""),
    photo: String(s?.photo?.mobile?.s ?? s?.photo?.pc?.s ?? ""),
    catch: String(s?.catch ?? ""),
  };
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch { body = {}; }

  const key = process.env.HOTPEPPER_API_KEY;
  if (!key) {
    return Response.json({ error: "ホットペッパーのAPIキーが設定されていません" }, { status: 503 });
  }

  // 「愛媛」を必ずAND条件に含めて他県（例：埼玉県東松山市）の誤ヒットを防ぐ。
  // キーワードは店名・住所などのAND部分一致。
  const base = ["愛媛"];
  if (body.area && body.area !== "すべて" && body.area !== "愛媛") base.push(body.area);
  const free = (body.keyword ?? "").trim();
  let genre = body.genre && /^G\d{3}$/.test(body.genre) ? body.genre : "";

  // ジャンル未選択のとき、料理名キーワードを対応ジャンルに変換して検索（語自体はキーワードに使わない）
  let mappedGenre = "";
  let literalFree = free;
  if (!genre && free) {
    const hit = TERM_GENRE.find(m => free.includes(m.term));
    if (hit) { genre = hit.genre; mappedGenre = hit.genre; literalFree = ""; }
  }

  async function fetchShops(keyword: string) {
    const params = new URLSearchParams({ key: key!, keyword, count: "20", order: "4", format: "json" });
    if (genre) params.set("genre", genre);
    const res = await fetch(`https://webservice.recruit.co.jp/hotpepper/gourmet/v1/?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("http");
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data?.results?.shop ?? []) as any[]).map(pick);
  }

  try {
    let shops = await fetchShops([...base, literalFree].filter(Boolean).join(" "));
    let relaxed = false;
    // 文字キーワードで0件なら、その語を外して（エリア＋ジャンルで）再検索
    if (shops.length === 0 && literalFree) {
      shops = await fetchShops(base.join(" "));
      relaxed = true;
    }
    return Response.json({ shops, relaxed, mappedGenre: mappedGenre || undefined, keyword: free });
  } catch {
    return Response.json({ error: "検索に失敗しました。少し待ってから再試行してください。" }, { status: 502 });
  }
}
