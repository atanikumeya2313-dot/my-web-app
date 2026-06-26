import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// 家計簿の「月次AIインサイト」。フロントから渡されるのは集計値のみ
// （カテゴリ別合計・先月比・予算・目標・着地見込み）。個々の明細やメモは送らない。

interface CategoryAgg { name: string; amount: number; prev: number; budget?: number }
interface Payload {
  yearMonth?: string;
  isCurrentMonth?: boolean;
  daysElapsed?: number;
  daysInMonth?: number;
  income?: number;
  expense?: number;
  prevIncome?: number;
  prevExpense?: number;
  samePeriod?: boolean;
  projectedExpense?: number;
  goalTarget?: number;
  categories?: CategoryAgg[];
}

const SYSTEM = `あなたは家計簿アプリの中で、利用者にそっと寄り添う家計アドバイザーです。
渡される「その月の集計データ」だけを根拠に、日本語で短いふりかえりを返してください。

守ること:
- 全体で3〜4行程度。各行は「・」で始める箇条書き。前置き・締めの挨拶は書かない。
- 具体的な数字（金額・増減・％）に触れてよいが、渡されたデータの範囲を超えた推測はしない。
- 大きく増減した項目、予算オーバー/目標の達成状況、月末の着地見込みのうち、目立つものを取り上げる。
- 最後の1行は前向きな一言か、ささやかな具体的アドバイス（1つだけ）。
- 説教・断定・不安をあおる表現はしない。やさしく、簡潔に。
- 金額は「¥1,200」「約1.2万円」のように読みやすく。`;

const fmt = (n: number) => "¥" + Math.round(n).toLocaleString("ja-JP");

function buildPrompt(p: Payload): string {
  const lines: string[] = [];
  const income = p.income ?? 0;
  const expense = p.expense ?? 0;
  lines.push(`対象月: ${p.yearMonth ?? "不明"}${p.isCurrentMonth ? "（今月・進行中）" : "（確定済み）"}`);
  if (p.isCurrentMonth && p.daysElapsed && p.daysInMonth) {
    lines.push(`経過: ${p.daysInMonth}日中 ${p.daysElapsed}日目`);
  }
  lines.push(`収入: ${fmt(income)}（先月${p.samePeriod ? "同期間" : ""}: ${fmt(p.prevIncome ?? 0)}）`);
  lines.push(`支出: ${fmt(expense)}（先月${p.samePeriod ? "同期間" : ""}: ${fmt(p.prevExpense ?? 0)}）`);
  lines.push(`収支: ${fmt(income - expense)}`);
  if (p.projectedExpense !== undefined) {
    lines.push(`今月の支出着地見込み: 約${fmt(p.projectedExpense)}`);
  }
  if (p.goalTarget !== undefined) {
    lines.push(`貯金目標(月): ${fmt(p.goalTarget)}`);
  }
  if (p.categories && p.categories.length) {
    lines.push("支出カテゴリ別（金額 / 先月 / 予算）:");
    for (const c of p.categories) {
      const b = c.budget !== undefined ? ` / 予算${fmt(c.budget)}` : "";
      lines.push(`  - ${c.name}: ${fmt(c.amount)} / 先月${fmt(c.prev)}${b}`);
    }
  }
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  if (typeof payload?.expense !== "number" && typeof payload?.income !== "number") {
    return Response.json({ error: "集計データがありません" }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "APIキーが設定されていません" }, { status: 503 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Geminiの一時的な混雑(503/overloaded)は関数内で短く待って1回だけ自動再試行。
  // レート制限(429)は待っても無駄なので即メッセージで返す。
  let insight = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildPrompt(payload),
        config: { systemInstruction: SYSTEM },
      });
      insight = response.text?.trim() ?? "";
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

  if (!insight) {
    return Response.json({ error: "生成できませんでした" }, { status: 502 });
  }
  return Response.json({ insight });
}
