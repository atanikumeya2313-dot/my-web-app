import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

// Anthropic SDK は Node ランタイムで動かす
export const runtime = "nodejs";

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
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "APIキーが設定されていません" }, { status: 503 });
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 200,
      system: SYSTEM,
      messages: [{ role: "user", content: text.slice(0, 1000) }],
    });
    const comment =
      response.content.find((b) => b.type === "text")?.text?.trim() ?? "";
    if (!comment) {
      return Response.json({ error: "返事を生成できませんでした" }, { status: 502 });
    }
    return Response.json({ comment });
  } catch (e) {
    const status = e instanceof Anthropic.APIError ? e.status ?? 502 : 502;
    return Response.json({ error: "AIの応答に失敗しました" }, { status });
  }
}
