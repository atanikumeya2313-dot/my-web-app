import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// 自然言語の入力（例「牛乳2本と卵1パック、トイレットペーパー」）を
// 在庫アイテムの配列に変換する。1文に複数品目が入る前提。
// 最終的な追加はフロントの確認リストでユーザーが調整してから行う。

const DEFAULT_CATEGORIES = ["食品・飲料", "日用品・消耗品", "薬・医療品", "その他"];
const UNIT_HINT = ["個", "本", "袋", "缶", "箱", "枚", "パック", "g", "ml", "L", "kg", "ロール"];

function buildSystem(categories: string[]): string {
  return `あなたは在庫管理アプリの入力補助です。ユーザーが書いた買い物・在庫のメモから、品目を1つずつ抜き出して構造化してください。

選べるカテゴリ: ${categories.join("、")}
よく使う単位の例: ${UNIT_HINT.join("、")}

ルール:
- 1つの文に複数の品目があれば、それぞれ別アイテムに分ける（「牛乳2本と卵1パック」→ 2件）。
- name: 品名のみ（数量・単位は含めない。「牛乳2本」→ name は「牛乳」）。
- quantity: 数量。書かれていなければ 1。整数で。
- unit: 数量の単位。文中にあればそれを使う（「2本」→本、「1パック」→パック）。無ければ品物に自然なもの（飲料=本、卵=パック、紙類=ロール 等）、迷えば「個」。
- category: 品物に最も合うものを「選べるカテゴリ」から1つ選ぶ。新しいカテゴリは作らない。迷ったら最後のカテゴリ。
- 同じ品物が繰り返し出てきたら1件にまとめてよい。`;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.INTEGER },
          unit: { type: Type.STRING },
          category: { type: Type.STRING },
        },
        required: ["name", "quantity", "unit", "category"],
        propertyOrdering: ["name", "quantity", "unit", "category"],
      },
    },
  },
  required: ["items"],
};

interface RawItem { name?: string; quantity?: number; unit?: string; category?: string }

export async function POST(req: NextRequest) {
  let text = "";
  let categories: string[] = [];
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text.trim() : "";
    if (Array.isArray(body?.categories)) {
      categories = body.categories.filter((c: unknown) => typeof c === "string" && c);
    }
  } catch {
    return Response.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  if (!text) {
    return Response.json({ error: "入力が空です" }, { status: 400 });
  }
  if (categories.length === 0) categories = DEFAULT_CATEGORIES;
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "APIキーが設定されていません" }, { status: 503 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Geminiの一時的な混雑(503/overloaded)は関数内で短く待って1回だけ自動再試行。
  // レート制限(429)は待っても無駄なので即メッセージで返す。
  let out: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: text.slice(0, 500),
        config: {
          systemInstruction: buildSystem(categories),
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

  if (!out) return Response.json({ error: "解析できませんでした" }, { status: 502 });

  try {
    const parsed = JSON.parse(out) as { items?: RawItem[] };
    const fallbackCat = categories[categories.length - 1];
    const items = (parsed.items ?? [])
      .map(r => ({
        name: (r.name ?? "").trim(),
        quantity: Number.isFinite(r.quantity) ? Math.max(1, Math.round(r.quantity!)) : 1,
        unit: (r.unit ?? "").trim() || "個",
        category: r.category && categories.includes(r.category) ? r.category : fallbackCat,
      }))
      .filter(r => r.name);

    if (items.length === 0) {
      return Response.json({ error: "品目を読み取れませんでした" }, { status: 502 });
    }
    return Response.json({ items });
  } catch {
    return Response.json({ error: "AIの応答に失敗しました" }, { status: 502 });
  }
}
