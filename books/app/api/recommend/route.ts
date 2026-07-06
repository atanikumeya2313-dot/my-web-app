import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// 読んだ本の傾向から、次に読むおすすめを Gemini が提案する。
// 実在しない本を勧めないよう「実在確認できる本のみ」を指示する。

interface InBook { title: string; author?: string; genre?: string; rating?: number }
interface Body { read?: InBook[]; exclude?: string[] }
interface RawRec { title?: string; author?: string; genre?: string; reason?: string }

const GENRE_HINT = "小説 / ミステリー / SF・ファンタジー / ビジネス・自己啓発 / 実用・趣味 / ノンフィクション / エッセイ / 歴史 / 科学 / マンガ / その他";

function buildPrompt(read: InBook[], exclude: string[]): string {
  const list = read
    .map(b => `・「${b.title}」${b.author ? ` / ${b.author}` : ""}${b.genre ? `（${b.genre}）` : ""}${typeof b.rating === "number" ? ` ★${b.rating}` : ""}`)
    .join("\n");
  const ex = exclude.length ? `\n次の本はすでに登録済みなので、おすすめに含めないでください:\n${exclude.map(t => `・${t}`).join("\n")}` : "";
  return `あなたは読書アドバイザーです。あるユーザーがこれまでに読んだ本のリストは次の通りです（★は5段階評価）:
${list}
${ex}

このユーザーの読書傾向（好きなジャンル・作家・テーマ・評価の高い傾向）を分析し、次に読むとよい「実在する本」を提案してください。
出力は次のJSONオブジェクトだけを返してください（前後に説明文やコードフェンスは付けない）:
{"analysis":"読書傾向の分析を80〜120字程度で","recommendations":[{"title":"本のタイトル","author":"著者名","genre":"ジャンル","reason":"この人におすすめする理由を40〜80字で"}]}
ルール:
- 実在が確認できる本のみ。存在しない本を作らない。
- 日本語版があれば日本語のタイトル・著者名で。
- genre は次から最も近いものを1つ: ${GENRE_HINT}
- すでに読んだ本・除外リストの本は含めない。評価(★)の高いジャンル/作家を重視しつつ、少し幅も持たせる。
- recommendations はちょうど5件。`;
}

function parseResult(text: string): { analysis: string; recommendations: RawRec[] } {
  let t = text.trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  try {
    const o = JSON.parse(t);
    return {
      analysis: String(o?.analysis ?? ""),
      recommendations: Array.isArray(o?.recommendations) ? o.recommendations : [],
    };
  } catch {
    return { analysis: "", recommendations: [] };
  }
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch { body = {}; }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "AI機能はまだ準備中です（APIキー未設定）" }, { status: 503 });
  }
  const read = Array.isArray(body.read) ? body.read.filter(b => b?.title) : [];
  if (read.length === 0) {
    return Response.json({ error: "先に「読んだ本」を登録すると、傾向からおすすめできます。" }, { status: 400 });
  }
  const exclude = Array.isArray(body.exclude) ? body.exclude.filter(Boolean).slice(0, 100) : [];

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let raw = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildPrompt(read.slice(0, 60), exclude),
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
        { error: overloaded ? "AIが混雑しています。少し時間をおいてから再実行してください。" : "おすすめの取得に失敗しました" },
        { status: 502 },
      );
    }
  }

  const parsed = parseResult(raw);
  const recommendations = parsed.recommendations
    .map(r => ({
      title: String(r.title ?? "").trim(),
      author: String(r.author ?? "").trim(),
      genre: String(r.genre ?? "").trim() || "その他",
      reason: String(r.reason ?? "").trim(),
    }))
    .filter(r => r.title)
    .slice(0, 5);

  return Response.json({ analysis: parsed.analysis, recommendations });
}
