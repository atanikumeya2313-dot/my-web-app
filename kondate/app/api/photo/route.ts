import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 45;

// 冷蔵庫などの写真から、写っている食材名を Gemini（マルチモーダル）で読み取る。
// 画像はクライアント側で縮小して data(base64) で送る。

interface Body { image?: { mimeType?: string; data?: string } }

function parseNames(text: string): string[] {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const s = t.indexOf("["), e = t.lastIndexOf("]");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  try {
    const a = JSON.parse(t);
    return Array.isArray(a) ? a.map(x => String(x).trim()).filter(Boolean) : [];
  } catch { return []; }
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch { body = {}; }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "AI機能はまだ準備中です（APIキー未設定）" }, { status: 503 });
  }
  const data = body.image?.data;
  const mimeType = body.image?.mimeType || "image/jpeg";
  if (!data) return Response.json({ error: "画像がありません" }, { status: 400 });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `この写真に写っている食材・食品を挙げてください。
- 日本語の一般的な名称で（例: にんじん, 鶏むね肉, 卵, 牛乳）。
- 食材・食品以外（食器・容器・背景など）は含めない。はっきり分かるものだけ。
- 出力は文字列のJSON配列だけ（説明やコードフェンスなし）: ["食材",...]`;

  let raw = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [
            { text: prompt },
            { inlineData: { mimeType, data } },
          ] },
        ],
        config: { responseMimeType: "application/json" },
      });
      raw = response.text?.trim() ?? "";
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
        { error: overloaded ? "AIが混雑しています。少し時間をおいてから再実行してください。" : "写真の読み取りに失敗しました" },
        { status: 502 },
      );
    }
  }

  // 重複除去
  const ingredients = [...new Set(parseNames(raw))].slice(0, 30);
  return Response.json({ ingredients });
}
