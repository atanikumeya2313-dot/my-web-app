import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// 録音した音声（WAV等）をGeminiで日本語に文字起こしする。
// 送るのは音声データ（有料tierのため学習対象外）。

const PROMPT =
  "この音声を日本語で正確に文字起こししてください。話した内容の本文だけを返し、前置き・引用符・括弧・補足説明は付けないでください。聞き取れない場合は空文字を返してください。";

interface Body {
  audioBase64?: string; // data URLではなく純粋なbase64
  mimeType?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  const data = (body.audioBase64 ?? "").trim();
  if (!data) {
    return Response.json({ error: "音声がありません" }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "APIキーが設定されていません" }, { status: 503 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let text = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contents: [
          { inlineData: { mimeType: body.mimeType || "audio/wav", data } },
          { text: PROMPT },
        ] as any,
      });
      text = response.text?.trim() ?? "";
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
        { error: overloaded ? "AIが混雑しています。少し時間をおいてから再実行してください。" : "文字起こしに失敗しました" },
        { status: 502 },
      );
    }
  }

  if (!text) {
    return Response.json({ error: "うまく聞き取れませんでした。もう一度お試しください。" }, { status: 502 });
  }
  return Response.json({ text });
}
