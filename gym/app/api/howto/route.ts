import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// 種目のやり方・効く部位・コツを説明する。結果はクライアント側でキャッシュされる。

interface Body { name?: string; part?: string }

function buildPrompt(b: Body): string {
  const name = (b.name ?? "").trim();
  return `あなたは親切なパーソナルトレーナーです。ジム初心者に「${name}」というトレーニング種目${b.part ? `（部位: ${b.part}）` : ""}を説明してください。

出力は次のJSONオブジェクトだけを返してください（前後に説明やコードフェンスは付けない）:
{"summary":"どんな種目かを50〜80字で","target":"主に効く筋肉を20字程度で","steps":["手順1","手順2","手順3","手順4"],"tips":["コツ1","コツ2","コツ3"],"mistakes":["よくある間違い1","よくある間違い2"],"beginner":"初心者の目安（重量の決め方・回数・セット数）を50字程度で"}
ルール:
- steps は3〜5個。開始姿勢→動作→戻すの順で、その場で真似できる具体さにする。
- tips は呼吸・可動域・スピードなど、安全とフォームに関わるものを優先。
- mistakes は2〜3個。ケガにつながりやすいものを挙げる。
- 重量は「まず軽い重量で10回できる範囲から」のように、断定せず目安として書く。
- 医療・治療の助言はしない。痛みが出る場合は中止してジムのスタッフに相談するよう促す。
- 実在しない種目名や曖昧な名前の場合は、最も近い一般的な種目として説明する。`;
}

interface Raw { summary?: string; target?: string; steps?: unknown; tips?: unknown; mistakes?: unknown; beginner?: string }

function strList(v: unknown, max: number): string[] {
  return (Array.isArray(v) ? v : [])
    .map(x => String(x ?? "").trim())
    .filter(Boolean)
    .slice(0, max);
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch { body = {}; }
  if (!body.name?.trim()) {
    return Response.json({ error: "種目名がありません" }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "AI機能はまだ準備中です（APIキー未設定）" }, { status: 503 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let raw = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildPrompt(body),
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
        { error: overloaded ? "AIが混雑しています。少し時間をおいてから再実行してください。" : "説明の取得に失敗しました" },
        { status: 502 },
      );
    }
  }

  let t = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  let o: Raw = {};
  try { o = JSON.parse(t) as Raw; } catch { o = {}; }

  const howto = {
    summary:  String(o.summary ?? "").trim(),
    target:   String(o.target ?? "").trim(),
    steps:    strList(o.steps, 6),
    tips:     strList(o.tips, 5),
    mistakes: strList(o.mistakes, 4),
    beginner: String(o.beginner ?? "").trim(),
  };

  if (!howto.summary && howto.steps.length === 0) {
    return Response.json({ error: "説明を作れませんでした" }, { status: 502 });
  }
  return Response.json(howto);
}
