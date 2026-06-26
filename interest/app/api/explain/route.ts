import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// 資産形成シミュレーターの試算結果を、平易な日本語で解説する。
// 渡されるのは計算結果（集計値）のみ。個人情報は含まない。
// 投資助言ではなく「数字の読み解き」に徹する。

interface ItemAgg {
  label?: string;
  principal?: number;
  monthly?: number;
  rate?: number;
  taxable?: boolean;
  savingsEndYear?: number;
}
interface Payload {
  years?: number;
  inflation?: number;
  items?: ItemAgg[];
  totalPrincipal?: number;
  totalInvested?: number;
  totalFv?: number;
  totalGain?: number;
  totalPct?: number;
  taxAmount?: number;
  afterTaxFv?: number;
  realFv?: number;
}

const SYSTEM = `あなたは資産形成シミュレーターに付属する、やさしい解説役です。
渡される「試算結果（集計値）」だけを根拠に、利用者がイメージしやすいよう日本語で解説します。

守ること:
- 全体で3〜5行。各行は「・」で始める箇条書き。前置き・締めの挨拶は書かない。
- 渡された数字の意味をかみくだいて説明する（投資総額と最終額の差＝運用益、複利でどれだけ増えたか、税引き後・インフレ調整後で実質いくらか等）。
- 特定の金融商品の推奨・売買の指示・「儲かる」等の断定や利回りの保証は絶対にしない。
- これは前提（想定利回り・期間）に基づく試算であり将来を保証しないことを、最後にやわらかく一言添える。
- 数字は「¥1,234,567」または「約123万円」のように読みやすく。渡された範囲を超える推測はしない。`;

const man = (n: number) => {
  if (Math.abs(n) >= 100_000_000) return `約${(n / 100_000_000).toFixed(2)}億円`;
  if (Math.abs(n) >= 10_000) return `約${Math.round(n / 10_000).toLocaleString()}万円`;
  return `¥${Math.round(n).toLocaleString()}`;
};

function buildPrompt(p: Payload): string {
  const lines: string[] = [];
  lines.push(`運用期間: ${p.years ?? "?"}年`);
  if (p.items && p.items.length) {
    lines.push(`シナリオ（${p.items.length}件）:`);
    for (const it of p.items) {
      const parts = [
        it.label || "項目",
        `元本${man(it.principal ?? 0)}`,
        (it.monthly ?? 0) > 0 ? `月積立${man(it.monthly ?? 0)}` : null,
        `年利${it.rate ?? 0}%`,
        it.taxable ? "特定口座(課税)" : "NISA(非課税)",
        it.savingsEndYear ? `積立${it.savingsEndYear}年まで` : null,
      ].filter(Boolean);
      lines.push(`  - ${parts.join(" / ")}`);
    }
  }
  lines.push(`投資総額（元本+積立）: ${man(p.totalInvested ?? 0)}`);
  lines.push(`${p.years}年後の評価額: ${man(p.totalFv ?? 0)}`);
  lines.push(`運用益: ${man(p.totalGain ?? 0)}（投資総額比 +${(p.totalPct ?? 0).toFixed(1)}%）`);
  if ((p.taxAmount ?? 0) > 0) {
    lines.push(`税額(特定口座分): ${man(p.taxAmount ?? 0)} / 税引き後: ${man(p.afterTaxFv ?? 0)}`);
  }
  if (p.realFv !== undefined) {
    lines.push(`インフレ年${p.inflation ?? 0}%で調整した実質価値: ${man(p.realFv)}`);
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
  if (typeof payload?.totalFv !== "number") {
    return Response.json({ error: "試算データがありません" }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "APIキーが設定されていません" }, { status: 503 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Geminiの一時的な混雑(503/overloaded)は関数内で短く待って1回だけ自動再試行。
  // レート制限(429)は待っても無駄なので即メッセージで返す。
  let explanation = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildPrompt(payload),
        config: { systemInstruction: SYSTEM },
      });
      explanation = response.text?.trim() ?? "";
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

  if (!explanation) {
    return Response.json({ error: "解説を生成できませんでした" }, { status: 502 });
  }
  return Response.json({ explanation });
}
