import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// ホットペッパー グルメ Webサービスでの標準検索（ジャンル別）。
// 愛媛県内をエリア名＋ジャンルで検索する。APIキーはサーバー側で保持。

interface Body { area?: string; genre?: string; keyword?: string; }

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
  const genre = body.genre && /^G\d{3}$/.test(body.genre) ? body.genre : "";

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
    // まずキーワード込みで検索
    let shops = await fetchShops([...base, free].filter(Boolean).join(" "));
    let relaxed = false;
    // 0件かつフリーキーワードがあるときは、その語を外して再検索（エリア＋ジャンルのみ）
    if (shops.length === 0 && free) {
      shops = await fetchShops(base.join(" "));
      relaxed = true;
    }
    return Response.json({ shops, relaxed, keyword: free });
  } catch {
    return Response.json({ error: "検索に失敗しました。少し待ってから再試行してください。" }, { status: 502 });
  }
}
