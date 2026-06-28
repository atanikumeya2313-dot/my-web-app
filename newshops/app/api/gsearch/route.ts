import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// Google Places API (New) Text Search で、料理名・店名など自由語で愛媛県内を検索。
// メニュー名（つけ麺など）でもGoogleの索引で拾えるため精度が高い。キーはサーバー側で保持。

interface Body { query?: string; area?: string; }

const PRICE: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: "¥",
  PRICE_LEVEL_MODERATE: "¥¥",
  PRICE_LEVEL_EXPENSIVE: "¥¥¥",
  PRICE_LEVEL_VERY_EXPENSIVE: "¥¥¥¥",
};

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch { body = {}; }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return Response.json({ error: "Google APIキーが設定されていません" }, { status: 503 });
  }
  const q = (body.query ?? "").trim();
  if (!q) return Response.json({ error: "キーワードを入力してください" }, { status: 400 });

  // 愛媛県内に寄せる（エリア名＋愛媛県をクエリに含める）
  const area = body.area && body.area !== "すべて" ? body.area : "";
  const textQuery = [q, area, "愛媛県"].filter(Boolean).join(" ");

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": [
          "places.displayName", "places.formattedAddress", "places.primaryTypeDisplayName",
          "places.rating", "places.userRatingCount", "places.googleMapsUri",
          "places.priceLevel", "places.businessStatus",
        ].join(","),
      },
      body: JSON.stringify({ textQuery, languageCode: "ja", regionCode: "JP", maxResultCount: 20 }),
      cache: "no-store",
    });
    if (!res.ok) {
      let msg = "検索に失敗しました（Google）";
      try { const e = await res.json(); if (e?.error?.message) msg = `Googleエラー: ${e.error.message}`; } catch {}
      return Response.json({ error: msg }, { status: 502 });
    }
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const places: any[] = data?.places ?? [];
    const shops = places
      .filter(p => p?.businessStatus !== "CLOSED_PERMANENTLY")
      .map(p => ({
        name: String(p?.displayName?.text ?? ""),
        genre: String(p?.primaryTypeDisplayName?.text ?? ""),
        address: String(p?.formattedAddress ?? "").replace(/^日本、?\s*/, ""),
        rating: typeof p?.rating === "number" ? p.rating : undefined,
        reviews: typeof p?.userRatingCount === "number" ? p.userRatingCount : undefined,
        price: p?.priceLevel ? (PRICE[p.priceLevel] ?? "") : "",
        url: String(p?.googleMapsUri ?? ""),
        closed: p?.businessStatus === "CLOSED_TEMPORARILY",
      }))
      .filter(s => s.name);
    return Response.json({ shops });
  } catch {
    return Response.json({ error: "検索に失敗しました。少し待ってから再試行してください。" }, { status: 502 });
  }
}
