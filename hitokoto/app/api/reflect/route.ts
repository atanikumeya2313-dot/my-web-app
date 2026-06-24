import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// 一定期間（今週/今月）の日記をもとに、やさしい「ふりかえり」を返す。
// 送るのは日記本文（有料tierのため学習対象外）。

const SYSTEM = `あなたは日記に寄り添う、おだやかで優しい相棒です。
ユーザーのこの期間の日記（日付と一言）をもとに、日本語でやさしい「ふりかえり」を返してください。

守ること:
- 全体で3〜5文程度。見出しや箇条書き、前置きは不要。
- この期間に繰り返し出てきた話題や気分の流れにそっと触れ、がんばりやよかったことをねぎらう。
- 説教・評価・アドバイスの押し付けはしない。指図しない。
- 日記に書かれていないことを推測で断定しない。
- 最後にささやかな前向きの一言を添える。絵文字は最大1つ。`;

interface Body {
  period?: "week" | "month";
  entries?: { date?: string; text?: string }[];
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const entries = (body.entries ?? [])
    .filter(e => e && typeof e.text === "string" && e.text.trim())
    .slice(-60);
  if (entries.length === 0) {
    return Response.json({ error: "ふりかえる記録がありません" }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "APIキーが設定されていません" }, { status: 503 });
  }

  const label = body.period === "month" ? "今月" : "この1週間";
  const list = entries
    .map(e => `${e.date ?? ""}: ${String(e.text).slice(0, 200)}`)
    .join("\n");
  const contents = `${label}の日記です。やさしくふりかえってください。\n\n${list.slice(0, 6000)}`;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let reflection = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: { systemInstruction: SYSTEM },
      });
      reflection = response.text?.trim() ?? "";
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
      if (attempt === 0 && transient) {
        await new Promise(r => setTimeout(r, 2500));
        continue;
      }
      return Response.json(
        { error: overloaded ? "AIが混雑しています。少し時間をおいてから再実行してください。" : "AIの応答に失敗しました" },
        { status: 502 },
      );
    }
  }

  if (!reflection) {
    return Response.json({ error: "ふりかえりを生成できませんでした" }, { status: 502 });
  }
  return Response.json({ reflection });
}
