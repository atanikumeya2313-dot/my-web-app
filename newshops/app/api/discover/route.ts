import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// 愛媛県内の「最近オープン/オープン予定」の店舗候補を、GeminiのGoogle検索連携で探す。
// 結果はあくまで候補（要確認）。完全・正確を保証するものではない。

interface Body { area?: string; keyword?: string; }
interface RawShop { name?: string; category?: string; area?: string; status?: string; openDate?: string; note?: string }

function buildPrompt(area?: string, keyword?: string): string {
  const where = area && area !== "すべて" ? `特に「${area}」周辺を優先。` : "";
  const kw = keyword ? `カテゴリ/キーワード: ${keyword}。` : "";
  return `あなたは地域情報のリサーチャーです。Google検索の結果に基づいて、愛媛県内で「最近オープンした」または「これからオープン予定」の店舗・施設を挙げてください。${where}${kw}
直近数ヶ月かつ検索で確認できる確かな情報を優先し、不確かなものは無理に含めないでください。
出力は次のJSON配列だけを返してください（前後に説明文やコードフェンスは付けない）:
[{"name":"店名","category":"カテゴリ","area":"市町","status":"planned|open","openDate":"YYYY-MM-DD または空","note":"一言（特徴や場所）"}]
ルール:
- status は オープン予定=planned / オープン済=open。
- openDate は分かる場合のみ。不明なら空文字。
- 直近（ここ数ヶ月）の確かなものを優先し、最大6件に絞る。重複は避ける。`;
}

function parseShops(text: string): RawShop[] {
  let t = text.trim();
  // コードフェンス除去
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  // 最初の [ から最後の ] までを抽出
  const s = t.indexOf("["), e = t.lastIndexOf("]");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  try {
    const arr = JSON.parse(t);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch { body = {}; }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "APIキーが設定されていません" }, { status: 503 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let raw = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let meta: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildPrompt(body.area, body.keyword),
        config: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools: [{ googleSearch: {} }] as any,
        },
      });
      raw = response.text?.trim() ?? "";
      meta = response.candidates?.[0]?.groundingMetadata ?? null;
      break;
    } catch (e) {
      const m = String((e as { message?: string })?.message ?? e);
      if (/429|RESOURCE_EXHAUSTED|quota|rate limit/i.test(m)) {
        return Response.json(
          { error: "短時間に多く実行したため、一時的に回数制限に達しました。少し待ってから再実行してください。" },
          { status: 429 },
        );
      }
      const overloaded = /503|UNAVAILABLE|overloaded/i.test(m);
      const transient = overloaded || /\b500\b|INTERNAL|deadline|ETIMEDOUT|ECONNRESET|fetch failed|network/i.test(m);
      if (attempt === 0 && transient) { await new Promise(r => setTimeout(r, 2500)); continue; }
      return Response.json(
        { error: overloaded ? "AIが混雑しています。少し時間をおいてから再実行してください。" : "AIの検索に失敗しました" },
        { status: 502 },
      );
    }
  }

  const shops = parseShops(raw)
    .map(r => ({
      name: String(r.name ?? "").trim(),
      category: String(r.category ?? "").trim() || "その他",
      area: String(r.area ?? "").trim(),
      status: r.status === "open" ? "open" : "planned",
      openDate: /^\d{4}-\d{2}-\d{2}$/.test(String(r.openDate ?? "")) ? String(r.openDate) : "",
      note: String(r.note ?? "").trim(),
    }))
    .filter(r => r.name)
    .slice(0, 8);

  // 情報源（グラウンディングの参照リンク）
  interface Source { title: string; uri: string }
  const sources: Source[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (meta?.groundingChunks ?? []) as any[]) {
    if (c?.web?.uri) sources.push({ title: c.web.title || c.web.uri, uri: c.web.uri });
    if (sources.length >= 6) break;
  }

  return Response.json({ shops, sources });
}
