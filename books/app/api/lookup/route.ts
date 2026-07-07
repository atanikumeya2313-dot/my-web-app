import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// タイトル（や著者）から実在する本の候補を Gemini で取得する。
// ブラウザから直接外部APIを叩かずサーバー側で行うため、CORS・混在コンテンツで失敗しない。

interface Body { query?: string }
interface RawBook { title?: string; author?: string; genre?: string; year?: string; synopsis?: string }

const GENRE_HINT = "小説 / ミステリー / SF・ファンタジー / ビジネス・自己啓発 / 実用・趣味 / ノンフィクション / エッセイ / 歴史 / 科学 / マンガ / その他";

function buildPrompt(query: string): string {
  return `あなたは書籍検索アシスタントです。次の手がかりに合いそうな本の候補を挙げてください。
手がかり: 「${query}」

出力は次のJSON配列だけを返してください（前後に説明文やコードフェンスは付けない）:
[{"title":"正式なタイトル","author":"著者名","genre":"ジャンル","year":"出版年(西暦4桁, 不明なら空)","synopsis":"20〜60字程度の内容紹介"}]
ルール:
- できるだけ実在する本を、確度の高い順に挙げる。想像で存在しない本を作るのは避けるが、確信が持てなくても近い候補は返してよい。
- タイトルの一部・ひらがな/漢字違い・シリーズ名・著者名だけ・作品テーマなど、あいまいな手がかりでも、思い当たる本を幅広く候補に含める。
- 同名や似たタイトルが複数あるときは、有名なもの・可能性の高いものから順に複数挙げる。
- 日本語版があれば日本語のタイトル・著者名で。
- genre は次から最も近いものを1つ選ぶ: ${GENRE_HINT}
- 最大8件。重複は避ける。該当がまったく思い当たらない場合のみ空配列 []。`;
}

// 配列そのもの、または {books:[...]} / {results:[...]} のようにオブジェクトで包まれていても取り出す
function parseBooks(text: string): RawBook[] {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  // まず配列として抽出を試みる
  const s = t.indexOf("["), e = t.lastIndexOf("]");
  const arrStr = s >= 0 && e > s ? t.slice(s, e + 1) : t;
  try {
    const arr = JSON.parse(arrStr);
    if (Array.isArray(arr)) return arr;
  } catch { /* fall through */ }
  // オブジェクトで包まれているケース
  try {
    const obj = JSON.parse(t);
    if (obj && typeof obj === "object") {
      for (const v of Object.values(obj)) if (Array.isArray(v)) return v as RawBook[];
    }
  } catch { /* ignore */ }
  return [];
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
    .slice(0, 8);

  return Response.json({ books });
}
