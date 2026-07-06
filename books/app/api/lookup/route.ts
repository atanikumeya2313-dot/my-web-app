import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// タイトル（や著者）から実在する本の候補を Gemini で取得する。
// ブラウザから直接外部APIを叩かずサーバー側で行うため、CORS・混在コンテンツで失敗しない。

interface Body { query?: string }
interface RawBook { title?: string; author?: string; genre?: string; year?: string; synopsis?: string }

const GENRE_HINT = "小説 / ミステリー / SF・ファンタジー / ビジネス・自己啓発 / 実用・趣味 / ノンフィクション / エッセイ / 歴史 / 科学 / マンガ / その他";

function buildPrompt(query: string): string {
  return `あなたは書籍データベースです。次の手がかりに一致する「実在する本」を挙げてください。
手がかり: 「${query}」

出力は次のJSON配列だけを返してください（前後に説明文やコードフェンスは付けない）:
[{"title":"正式なタイトル","author":"著者名","genre":"ジャンル","year":"出版年(西暦4桁, 不明なら空)","synopsis":"20〜60字程度の内容紹介"}]
ルール:
- 実在が確認できる本のみ。想像で存在しない本を作らない。
- 日本語版があれば日本語のタイトル・著者名で。
- genre は次から最も近いものを1つ選ぶ: ${GENRE_HINT}
- タイトルが部分一致・あいまいでも、最も可能性の高い候補から順に最大6件。重複は避ける。`;
}

function parseBooks(text: string): RawBook[] {
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

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch { body = {}; }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "AI機能はまだ準備中です（APIキー未設定）" }, { status: 503 });
  }
  const query = (body.query ?? "").trim();
  if (!query) return Response.json({ error: "タイトルなどを入力してください" }, { status: 400 });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let raw = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildPrompt(query),
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
        { error: overloaded ? "AIが混雑しています。少し時間をおいてから再実行してください。" : "本の検索に失敗しました" },
        { status: 502 },
      );
    }
  }

  const books = parseBooks(raw)
    .map(r => ({
      title: String(r.title ?? "").trim(),
      author: String(r.author ?? "").trim(),
      genre: String(r.genre ?? "").trim() || "その他",
      year: /^\d{4}$/.test(String(r.year ?? "")) ? String(r.year) : "",
      synopsis: String(r.synopsis ?? "").trim(),
    }))
    .filter(r => r.title)
    .slice(0, 6);

  return Response.json({ books });
}
