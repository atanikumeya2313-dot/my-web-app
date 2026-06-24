import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
// 複数画像＋多めの生成でも時間切れにならないよう延長
export const maxDuration = 60;

// 暗記カードの自動生成。
// mode = 'text'（文章を貼る） / 'topic'（テーマ） / 'photo'（画像を読み取る）。
// AIには問題(front)・答え(back)・解説(explanation)の配列を返させ、
// 最終的な保存はフロントの確認画面でユーザーが行う。

const SYSTEM = `あなたは学習用の暗記カードを作る専門家です。与えられた素材から、日本語で暗記カードを作成します。

各カードのルール:
- front（問題）: 一問一答になる問い。短く明確に。「〜とは？」「〜の役割は？」など。
- back（答え）: 簡潔な答え。要点のみ。長文にしない。
- explanation（解説）: なぜそうなるか・補足を1〜2文。素材の内容に忠実に。素材に無い断定はしない。
- 重要な概念・用語・数値・因果関係を優先してカード化する。瑣末な部分はカードにしない。
- 同じ内容の重複カードは作らない。
- 指定された枚数程度を作る（多すぎる素材なら重要なものを優先）。`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    cards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          front: { type: Type.STRING },
          back: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ["front", "back", "explanation"],
        propertyOrdering: ["front", "back", "explanation"],
      },
    },
  },
  required: ["cards"],
};

interface RawCard { front?: string; back?: string; explanation?: string }

type Body = {
  mode?: "text" | "topic" | "photo";
  text?: string;
  topic?: string;
  imageBase64?: string;   // data URLではなく純粋なbase64（旧・単一画像）
  imageMimeType?: string;
  images?: { base64?: string; mimeType?: string }[];  // 複数画像
  count?: number;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const mode = body.mode ?? "text";
  const count = Math.min(30, Math.max(1, body.count ?? 10));

  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "APIキーが設定されていません" }, { status: 503 });
  }

  // モードごとに Gemini への入力（contents）を組み立てる
  let contents: unknown;
  if (mode === "photo") {
    // 複数画像（images）優先。旧形式（imageBase64）も後方互換でサポート。
    const list = Array.isArray(body.images) && body.images.length
      ? body.images
      : (body.imageBase64 ? [{ base64: body.imageBase64, mimeType: body.imageMimeType }] : []);
    const valid = list
      .map(i => ({ data: (i?.base64 ?? "").trim(), mimeType: i?.mimeType || "image/jpeg" }))
      .filter(i => i.data);
    if (valid.length === 0) return Response.json({ error: "画像がありません" }, { status: 400 });
    // photoモードの count は「1画像あたりの枚数」。合計は count × 画像枚数。
    const per = count;
    const total = per * valid.length;
    contents = [
      ...valid.map(i => ({ inlineData: { mimeType: i.mimeType, data: i.data } })),
      { text: `これらは教科書・ノート・資料の画像です（全${valid.length}枚＝${valid.length}ページ）。各画像（ページ）ごとに暗記カードを${per}枚程度ずつ作り、合計で約${total}枚にしてください。各画像内の文字を読み取り、重要事項を一問一答にし、同じ内容の重複カードは作らないでください。` },
    ];
  } else if (mode === "topic") {
    const topic = (body.topic ?? "").trim();
    if (!topic) return Response.json({ error: "トピックが空です" }, { status: 400 });
    contents = `次のトピックについて、覚えるべき重要事項の暗記カードを${count}枚程度作ってください。トピック: ${topic.slice(0, 200)}`;
  } else {
    const text = (body.text ?? "").trim();
    if (!text) return Response.json({ error: "本文が空です" }, { status: 400 });
    contents = `次の文章から暗記カードを${count}枚程度作ってください。文章:\n${text.slice(0, 8000)}`;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Geminiの一時的な混雑(503/overloaded)・サーバーエラーは、関数内で短い待機を入れて
  // 自動再試行する（60秒上限に収まるよう最大2回）。レート制限(429)は待っても無駄なので即返す。
  let out: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contents: contents as any,
        config: {
          systemInstruction: SYSTEM,
          responseMimeType: "application/json",
          responseSchema,
        },
      });
      out = response.text?.trim();
      break;
    } catch (e) {
      const m = String((e as { message?: string })?.message ?? e);
      if (/429|RESOURCE_EXHAUSTED|quota|rate limit/i.test(m)) {
        return Response.json(
          { error: "短時間に多く作成したため、一時的に回数制限に達しました。30〜60秒ほど待ってから再実行してください。" },
          { status: 429 },
        );
      }
      const overloaded = /503|UNAVAILABLE|overloaded/i.test(m);
      const transient = overloaded || /\b500\b|INTERNAL|deadline|ETIMEDOUT|ECONNRESET|fetch failed|network/i.test(m);
      if (attempt === 0 && transient) {
        await new Promise(r => setTimeout(r, 2500));   // 少し待って1回だけ再試行
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

  if (!out) return Response.json({ error: "生成できませんでした" }, { status: 502 });

  try {
    const parsed = JSON.parse(out) as { cards?: RawCard[] };
    const cards = (parsed.cards ?? [])
      .map(c => ({
        front: (c.front ?? "").trim(),
        back: (c.back ?? "").trim(),
        explanation: (c.explanation ?? "").trim(),
      }))
      .filter(c => c.front && c.back);

    if (cards.length === 0) {
      return Response.json({ error: "カードを作成できませんでした" }, { status: 502 });
    }
    return Response.json({ cards });
  } catch {
    return Response.json({ error: "AIの応答に失敗しました" }, { status: 502 });
  }
}
