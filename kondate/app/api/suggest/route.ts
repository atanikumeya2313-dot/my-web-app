import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 45;

// 手持ち食材と条件から、作れる家庭料理の献立を Gemini が提案する。

interface Body {
  ingredients?: { name: string; soon?: boolean }[];
  servings?: number;
  cuisine?: string;
  maxTime?: string;
  useUp?: boolean;
  recent?: string[];   // 最近作った献立（重複回避）
}
interface RawMeal {
  title?: string; description?: string; cuisine?: string; timeMin?: number;
  used?: unknown; missing?: unknown; steps?: unknown;
}

const asList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean) : [];

function buildPrompt(b: Body): string {
  const names = (b.ingredients ?? []).map(i => i.name);
  const soon  = (b.ingredients ?? []).filter(i => i.soon).map(i => i.name);
  const cond: string[] = [];
  if (b.servings)            cond.push(`${b.servings}人分`);
  if (b.cuisine && b.cuisine !== "指定なし") cond.push(`ジャンルは${b.cuisine}`);
  if (b.maxTime)             cond.push(`調理時間は${b.maxTime}分以内`);
  const useUpLine = b.useUp && soon.length
    ? `特に「${soon.join("、")}」は消費期限が近いので、できるだけ使い切るメニューを優先してください。`
    : "";
  const recentLine = (b.recent ?? []).length
    ? `最近作った「${(b.recent ?? []).slice(0, 8).join("、")}」とは違うものを提案してください。`
    : "";

  return `あなたは家庭料理の献立アシスタントです。次の手持ち食材で作れる、現実的で作りやすい家庭料理を提案してください。
手持ち食材: ${names.join("、") || "（指定なし）"}
${cond.length ? `条件: ${cond.join(" / ")}` : ""}
${useUpLine}
${recentLine}
前提:
- 塩・こしょう・砂糖・醤油・味噌・みりん・酒・油・だし・にんにく・生姜などの基本調味料は家にある前提にしてよい。
- 手持ちにない主要な食材だけを missing に入れる（調味料は入れない）。
- 手持ち食材をなるべく活用し、無理な食材の組み合わせは避ける。

出力は次のJSON配列だけを返してください（前後に説明文やコードフェンスは付けない）:
[{"title":"料理名","description":"どんな料理か一言(40字程度)","cuisine":"和食/洋食/中華/エスニック等","timeMin":30,"used":["使う手持ち食材",...],"missing":["買い足す食材",...],"steps":["手順1","手順2",...]}]
ルール:
- 3〜4件。バリエーション（主菜中心・さっと作れる等）を持たせる。
- steps は3〜6ステップで簡潔に。
- timeMin は数値（分）。`;
}

function parseMeals(text: string): RawMeal[] {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const s = t.indexOf("["), e = t.lastIndexOf("]");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  try { const a = JSON.parse(t); return Array.isArray(a) ? a : []; } catch { return []; }
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch { body = {}; }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "AI機能はまだ準備中です（APIキー未設定）" }, { status: 503 });
  }
  if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
    return Response.json({ error: "先に食材を追加してください" }, { status: 400 });
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
        { error: overloaded ? "AIが混雑しています。少し時間をおいてから再実行してください。" : "献立の提案に失敗しました" },
        { status: 502 },
      );
    }
  }

  const meals = parseMeals(raw)
    .map(r => ({
      title: String(r.title ?? "").trim(),
      description: String(r.description ?? "").trim(),
      cuisine: String(r.cuisine ?? "").trim(),
      timeMin: typeof r.timeMin === "number" ? r.timeMin : undefined,
      used: asList(r.used),
      missing: asList(r.missing),
      steps: asList(r.steps),
    }))
    .filter(r => r.title)
    .slice(0, 4);

  return Response.json({ meals });
}
