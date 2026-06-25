import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// 自然言語の入力を、TODOのタスク構造に変換するAPI。
// AIには「全フィールドを必ず返す」よう求め、サーバー側で repeat に応じて
// 必要なフィールドだけを残した下書き（draft）に正規化して返す。
// 最終的な保存はフロントのタスク追加フォームでユーザーが確認してから行う。

const REPEATS = [
  "none", "daily", "weekly", "monthly",
  "interval", "monthly-interval", "monthly-weekday",
] as const;
const TIME_SLOTS = ["morning", "afternoon", "evening", "anytime"] as const;
const PRIORITIES = ["high", "medium", "low"] as const;

const DOW = ["日", "月", "火", "水", "木", "金", "土"];

function buildSystem(today: string, dow: string, categories: string[]): string {
  const catList = categories.length ? categories.join("、") : "（なし）";
  return `あなたはTODOアプリの入力補助です。ユーザーの自然な日本語の文から、タスク1件の構造を読み取ってください。

今日の日付: ${today}（${dow}曜日）
選べるカテゴリ: ${catList}

各フィールドの決め方:
- title: タスクの内容を簡潔に。日時・繰り返しの表現は title から取り除く（例「毎週月曜にゴミ出し」→ title は「ゴミ出し」）。
- repeat: none=一回限り / daily=毎日 / weekly=毎週(特定曜日) / monthly=毎月(特定日) / interval=N日ごと / monthly-interval=Nか月ごと / monthly-weekday=毎月第N曜日。繰り返し表現が無ければ none。
- timeSlot: 朝=morning / 昼=afternoon / 夜=evening / 指定なし=anytime。「朝」「午前」→morning、「昼」「日中」→afternoon、「夜」「夕方」→evening。
- priority: 「重要」「急ぎ」「絶対」等→high、「なるべく」→medium。特に無ければ priority フィールド自体を出さない。
- category: 内容に最も合うものを「選べるカテゴリ」から1つ選ぶ。合うものが無ければ ""。新しいカテゴリは作らない。
- memo: 補足があれば。無ければ ""。
- date: repeat=none で「明日」「6月25日」等の指定があれば YYYY-MM-DD。今日の日付を基準に解決する。指定が無ければ ""。
- weekdays: repeat=weekly のとき曜日番号の配列（0=日,1=月,…,6=土）。それ以外は []。
- monthDay: repeat=monthly のとき1〜31。それ以外は 0。
- intervalDays: repeat=interval のとき2以上。それ以外は 0。
- monthIntervalMonths: repeat=monthly-interval のとき2以上。それ以外は 0。
- monthlyWeekdayNth: repeat=monthly-weekday のとき1〜4。それ以外は 0。
- monthlyWeekdayDow: repeat=monthly-weekday のとき曜日番号(0〜6)。それ以外は 0。

該当しないフィールドは上記の通り空文字や0を入れること。`;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    repeat: { type: Type.STRING, enum: [...REPEATS] },
    timeSlot: { type: Type.STRING, enum: [...TIME_SLOTS] },
    priority: { type: Type.STRING, enum: [...PRIORITIES] },
    category: { type: Type.STRING },
    memo: { type: Type.STRING },
    date: { type: Type.STRING },
    weekdays: { type: Type.ARRAY, items: { type: Type.INTEGER } },
    monthDay: { type: Type.INTEGER },
    intervalDays: { type: Type.INTEGER },
    monthIntervalMonths: { type: Type.INTEGER },
    monthlyWeekdayNth: { type: Type.INTEGER },
    monthlyWeekdayDow: { type: Type.INTEGER },
  },
  required: ["title", "repeat", "timeSlot"],
  propertyOrdering: [
    "title", "repeat", "timeSlot", "priority", "category", "memo", "date",
    "weekdays", "monthDay", "intervalDays", "monthIntervalMonths",
    "monthlyWeekdayNth", "monthlyWeekdayDow",
  ],
};

type RawTask = {
  title?: string;
  repeat?: string;
  timeSlot?: string;
  priority?: string;
  category?: string;
  memo?: string;
  date?: string;
  weekdays?: number[];
  monthDay?: number;
  intervalDays?: number;
  monthIntervalMonths?: number;
  monthlyWeekdayNth?: number;
  monthlyWeekdayDow?: number;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// AIの生出力を、repeat に応じた必要フィールドだけの下書きに正規化する。
function normalize(raw: RawTask, categories: string[]): Record<string, unknown> | null {
  const title = (raw.title ?? "").trim();
  if (!title) return null;

  const repeat = (REPEATS as readonly string[]).includes(raw.repeat ?? "")
    ? raw.repeat! : "none";
  const timeSlot = (TIME_SLOTS as readonly string[]).includes(raw.timeSlot ?? "")
    ? raw.timeSlot! : "anytime";

  const draft: Record<string, unknown> = { title, repeat, timeSlot };

  if (raw.priority === "high" || raw.priority === "medium" || raw.priority === "low") {
    draft.priority = raw.priority;
  }
  if (raw.category && categories.includes(raw.category)) {
    draft.category = raw.category;
  }
  if (raw.memo && raw.memo.trim()) {
    draft.memo = raw.memo.trim();
  }

  switch (repeat) {
    case "none":
      if (raw.date && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)) draft.date = raw.date;
      break;
    case "weekly": {
      const wd = [...new Set((raw.weekdays ?? []).filter(d => d >= 0 && d <= 6))].sort();
      if (wd.length) draft.weekdays = wd;
      break;
    }
    case "monthly":
      if (raw.monthDay) draft.monthDay = clamp(raw.monthDay, 1, 31);
      break;
    case "interval":
      if (raw.intervalDays && raw.intervalDays >= 2) {
        draft.intervalDays = clamp(raw.intervalDays, 2, 365);
      }
      break;
    case "monthly-interval":
      if (raw.monthIntervalMonths && raw.monthIntervalMonths >= 2) {
        draft.monthIntervalMonths = clamp(raw.monthIntervalMonths, 2, 24);
      }
      break;
    case "monthly-weekday":
      if (raw.monthlyWeekdayNth) draft.monthlyWeekdayNth = clamp(raw.monthlyWeekdayNth, 1, 4);
      if (raw.monthlyWeekdayDow !== undefined) {
        draft.monthlyWeekdayDow = clamp(raw.monthlyWeekdayDow, 0, 6);
      }
      break;
  }
  return draft;
}

export async function POST(req: NextRequest) {
  let text = "";
  let categories: string[] = [];
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text.trim() : "";
    if (Array.isArray(body?.categories)) {
      categories = body.categories.filter((c: unknown) => typeof c === "string");
    }
  } catch {
    return Response.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  if (!text) {
    return Response.json({ error: "入力が空です" }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "APIキーが設定されていません" }, { status: 503 });
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Geminiの一時的な混雑(503/overloaded)は関数内で短く待って1回だけ自動再試行。
  // レート制限(429)は待っても無駄なので即メッセージで返す。
  let out: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: text.slice(0, 300),
        config: {
          systemInstruction: buildSystem(today, DOW[now.getDay()], categories),
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

  if (!out) {
    return Response.json({ error: "解析できませんでした" }, { status: 502 });
  }
  try {
    const draft = normalize(JSON.parse(out) as RawTask, categories);
    if (!draft) {
      return Response.json({ error: "タスクの内容を読み取れませんでした" }, { status: 502 });
    }
    return Response.json({ draft });
  } catch {
    return Response.json({ error: "AIの応答に失敗しました" }, { status: 502 });
  }
}
