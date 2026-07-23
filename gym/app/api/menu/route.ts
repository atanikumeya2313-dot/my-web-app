import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 45;

// 目的・頻度・経験・器具から、初心者向けのトレーニングメニューを提案する。

interface Body {
  goal?: string;      // 目的
  freq?: string;      // 頻度
  level?: string;     // 経験
  equip?: string;     // 使える器具
  part?: string;      // 鍛えたい部位（任意）
}
interface RawItem { name?: string; part?: string; sets?: number; reps?: string; tip?: string }

const PART_HINT = "胸 / 背中 / 脚 / 肩 / 腕 / 腹 / 有酸素";

function buildPrompt(b: Body): string {
  const cond: string[] = [];
  if (b.goal)  cond.push(`目的: ${b.goal}`);
  if (b.freq)  cond.push(`頻度: ${b.freq}`);
  if (b.level) cond.push(`経験: ${b.level}`);
  if (b.equip) cond.push(`使える器具: ${b.equip}`);
  if (b.part)  cond.push(`特に鍛えたい: ${b.part}`);
  return `あなたは親切なパーソナルトレーナーです。次の条件のジム初心者向けに、その日のトレーニングメニューを提案してください。
${cond.join(" / ") || "（一般的な初心者向け）"}

出力は次のJSONオブジェクトだけを返してください（前後に説明やコードフェンスは付けない）:
{"advice":"全体のアドバイスを60〜100字で","items":[{"name":"種目名","part":"部位","sets":3,"reps":"10回","tip":"フォームや注意のコツを30字程度で"}]}
ルール:
- items は5〜7種目。無理なく安全に、ウォームアップと主要部位をバランスよく。
- part は次から選ぶ: ${PART_HINT}。
- sets は数値、reps は「10回」「30秒」「20分」など文字列。
- 初心者が続けやすい現実的な内容に。ケガ予防を重視。`;
}

function parse(text: string): { advice: string; items: RawItem[] } {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  try {
    const o = JSON.parse(t);
    return { advice: String(o?.advice ?? ""), items: Array.isArray(o?.items) ? o.items : [] };
  } catch { return { advice: "", items: [] }; }
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch { body = {}; }
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
        { error: overloaded ? "AIが混雑しています。少し時間をおいてから再実行してください。" : "メニューの提案に失敗しました" },
        { status: 502 },
      );
    }
  }

  const p = parse(raw);
  const items = p.items
    .map(r => ({
      name: String(r.name ?? "").trim(),
      part: String(r.part ?? "").trim() || "その他",
      sets: typeof r.sets === "number" ? r.sets : undefined,
      reps: String(r.reps ?? "").trim(),
      tip: String(r.tip ?? "").trim(),
    }))
    .filter(r => r.name)
    .slice(0, 8);

  return Response.json({ advice: p.advice, items });
}
