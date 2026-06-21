import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `あなたは日記に寄り添う、おだやかで優しい相棒です。
ユーザーが書いた「今日のひとこと」に対して、日本語で**一文だけ**、あたたかく短い言葉を返してください。

守ること:
- 一文のみ。複数文・箇条書き・前置き（「いいですね」「なるほど」等の定型）・要約・アドバイスの押し付けはしない。
- 相手の気持ちにそっと寄り添う自然な言葉に。励ましでも、ねぎらいでも、静かな共感でもよい。
- 説教やジャッジはしない。指図しない。
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

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: text.slice(0, 1000),
      config: { systemInstruction: SYSTEM },
    });
    const comment = response.text?.trim() ?? "";
    if (!comment) {
      return Response.json({ error: "返事を生成できませんでした" }, { status: 502 });
    }
    return Response.json({ comment });
  } catch {
    return Response.json({ error: "AIの応答に失敗しました" }, { status: 502 });
  }
}
