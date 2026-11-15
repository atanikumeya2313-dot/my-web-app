import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// 愛媛県内の「これから開催 / 開催中」のイベントを、GeminiのGoogle検索連携で探す。
// 結果はあくまで候補（要確認）。日程・会場は公式情報で確認すること。

interface Body { area?: string; keyword?: string; }
interface RawEvent {
  name?: string; category?: string; area?: string; venue?: string;
  startDate?: string; endDate?: string; note?: string;
}

function buildPrompt(area?: string, keyword?: string): string {
  const where = area && area !== "すべて" ? `特に「${area}」周辺を優先。` : "";
  const kw = keyword ? `ジャンル/キーワード: ${keyword}。` : "";
  const today = new Date().toISOString().slice(0, 10);
  return `あなたは地域のイベント情報のリサーチャーです。本日は${today}です。Google検索の結果に基づいて、愛媛県内で「これから開催される」または「現在開催中」のイベント（祭り・花火・マルシェ・ポップアップ・グルメ催事・展示・ライブ・ワークショップなど）を挙げてください。${where}${kw}
今日以降に開催されるもの、または会期中のものだけを対象にし、すでに終了したものは含めないでください。検索で確認できる確かな情報を優先し、不確かなものは無理に含めないでください。
出力は次のJSON配列だけを返してください（前後に説明文やコードフェンスは付けない）:
[{"name":"イベント名","category":"ジャンル","area":"市町","venue":"会場名","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD または空","note":"一言（内容・料金・時間など）"}]
ルール:
- startDate は開始日。分かる場合のみ。不明なら空文字。
- endDate は終了日。単日開催や不明なら空文字。
- 今日(${today})以降・会期中の確かなものを優先し、最大6件に絞る。重複は避ける。`;
}

function parseEvents(text: string): RawEvent[] {
  let t = text.trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const s = t.indexOf("["), e = t.lastIndexOf("]");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  try {
    const arr = JSON.parse(t);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const isYmd = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ""));

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

  const events = parseEvents(raw)
    .map(r => ({
      name: String(r.name ?? "").trim(),
      category: String(r.category ?? "").trim() || "その他",
      area: String(r.area ?? "").trim(),
      venue: String(r.venue ?? "").trim(),
      startDate: isYmd(r.startDate) ? String(r.startDate) : "",
      endDate: isYmd(r.endDate) ? String(r.endDate) : "",
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

  return Response.json({ events, sources });
}
