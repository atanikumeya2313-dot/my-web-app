import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `あなたは日記にそっと寄り添う、あたたかくて距離の近い相棒です。
ユーザーが書いた「今日のひとこと」に対して、日本語で**一文だけ**、やわらかい言葉を返してください。

トーン:
- かたい敬語や説明口調はやめて、力の抜けた親しみのある話し言葉で。
- 「〜だね」「〜だったね」「〜かも」「〜しよ」のような、やさしくてやわらかい語尾を使ってよい。
- 隣でうんうんと聞いてくれる友だちのような、ぬくもりのある一言に。

守ること:
- 一文のみ。複数文・箇条書き・前置き（「いいですね」「なるほど」等の定型）・要約・アドバイスの押し付けはしない。
- 相手の気持ちにそっと寄り添う。励ましでも、ねぎらいでも、静かな共感でもよい。
- 説教やジャッジはしない。指図しない。頑張りを無理に急かさない。
- 絵文字は使っても最大1つ。無くてよい。
- 考えた過程は書かず、最終的な一言だけを出力する。`;

export async function POST(req: NextRequest) {
  let text = "";
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text.trim() : "";
  } catch {
    return Response.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  if (!text) {
    return Response.json({ error: "本文が空です" }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "APIキーが設定されていません" }, { status: 503 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Geminiの一時的な混雑(503/overloaded)は関数内で短く待って1回だけ自動再試行。
  // レート制限(429)は待っても無駄なので即メッセージで返す。
  let comment = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: text.slice(0, 1000),
        config: { systemInstruction: SYSTEM },
      });
      comment = response.text?.trim() ?? "";
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
        { error: overloaded
            ? "AIが混雑しています。少し時間をおいてから再実行してください。"
            : "AIの応答に失敗しました" },
        { status: 502 },
      );
    }
  }

  if (!comment) {
    return Response.json({ error: "返事を生成できませんでした" }, { status: 502 });
  }
  return Response.json({ comment });
}
