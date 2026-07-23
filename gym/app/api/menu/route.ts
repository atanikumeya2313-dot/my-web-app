import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// 体格・目的・頻度から、週のローテーション（分割メニュー）を提案する。
// 送るのは体格と条件のみ（記録の中身やメモは送らない）。

interface Body {
  goal?: string;      // 目的
  freq?: string;      // 頻度（週N回）
  level?: string;     // 経験
  equip?: string;     // 使える器具
  part?: string;      // 特に鍛えたい部位（任意）
  // 体格
  age?: number;
  gender?: string;
  height?: number;      // cm
  weight?: number;      // kg
  targetWeight?: number;
  bmi?: number;
}
interface RawItem { name?: string; part?: string; sets?: number; reps?: string; tip?: string }
interface RawDay { title?: string; items?: RawItem[] }

const PART_HINT = "胸 / 背中 / 脚 / 肩 / 腕 / 腹 / 有酸素";

// 「週3回」→ 3。分からなければ3日分。
function dayCount(freq?: string): number {
  const n = Number((freq?.match(/\d+/) ?? [])[0]);
  if (!n || n < 1) return 3;
  return Math.min(n, 5);
}

const GENDER_JA: Record<string, string> = { male: "男性", female: "女性", other: "回答しない" };

function buildPrompt(b: Body): string {
  const days = dayCount(b.freq);

  const body: string[] = [];
  if (b.age)    body.push(`年齢: ${b.age}歳`);
  if (b.gender && GENDER_JA[b.gender]) body.push(`性別: ${GENDER_JA[b.gender]}`);
  if (b.height) body.push(`身長: ${b.height}cm`);
  if (b.weight) body.push(`体重: ${b.weight}kg`);
  if (b.bmi)    body.push(`BMI: ${b.bmi}`);
  if (b.targetWeight) body.push(`目標体重: ${b.targetWeight}kg`);

  const cond: string[] = [];
  if (b.goal)  cond.push(`目的: ${b.goal}`);
  if (b.freq)  cond.push(`頻度: ${b.freq}`);
  if (b.level) cond.push(`経験: ${b.level}`);
  if (b.equip) cond.push(`使える器具: ${b.equip}`);
  if (b.part)  cond.push(`特に鍛えたい: ${b.part}`);

  return `あなたは親切なパーソナルトレーナーです。次の人に向けて、ジムで回す${days}分割のトレーニングメニュー（1週間のローテーション）を作ってください。
${body.length ? `体格: ${body.join(" / ")}` : "（体格の登録なし）"}
条件: ${cond.join(" / ") || "（一般的な初心者向け）"}

出力は次のJSONオブジェクトだけを返してください（前後に説明やコードフェンスは付けない）:
{"advice":"この人に向けた全体のアドバイスを80〜120字で","days":[{"title":"その日の狙い（例: 胸・三頭）","items":[{"name":"種目名","part":"部位","sets":3,"reps":"10回","tip":"フォームや注意のコツを30字程度で"}]}]}
ルール:
- days はちょうど${days}個。1日目から順に、同じ部位が連日に偏らないよう配分する。
- 各 day の items は5〜7種目。ウォームアップを1つ目に入れ、最後に軽いストレッチかクールダウンを入れる。
- part は次から選ぶ: ${PART_HINT}。
- sets は数値、reps は「10回」「30秒」「20分」など文字列。
- 体格と目的（減量なら有酸素多め、筋肥大なら高重量低回数など）に合わせた現実的な内容にする。
- ケガ予防を最優先し、経験が浅い人にはマシン中心で無理のない量にする。
- 医療・治療の助言はしない。体重や体型について否定的な表現は使わない。`;
}

function parse(text: string): { advice: string; days: RawDay[] } {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  try {
    const o = JSON.parse(t);
    return { advice: String(o?.advice ?? ""), days: Array.isArray(o?.days) ? o.days : [] };
  } catch { return { advice: "", days: [] }; }
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch { body = {}; }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "AI機能はまだ準備中です（APIキー未設定）" }, { status: 503 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let raw = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildPrompt(body),
        config: { responseMimeType: "application/json" },
      });
      raw = response.text?.trim() ?? "";
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
      if (attempt === 0 && transient) { await new Promise(r => setTimeout(r, 2500)); continue; }
      return Response.json(
        { error: overloaded ? "AIが混雑しています。少し時間をおいてから再実行してください。" : "メニューの提案に失敗しました" },
        { status: 502 },
      );
    }
  }

  const p = parse(raw);
  const days = p.days
    .map((d, i) => ({
      title: String(d.title ?? "").trim() || `${i + 1}日目`,
      items: (Array.isArray(d.items) ? d.items : [])
        .map(r => ({
          name: String(r.name ?? "").trim(),
          part: String(r.part ?? "").trim() || "その他",
          sets: typeof r.sets === "number" ? r.sets : undefined,
          reps: String(r.reps ?? "").trim(),
          tip: String(r.tip ?? "").trim(),
        }))
        .filter(r => r.name)
        .slice(0, 9),
    }))
    .filter(d => d.items.length > 0)
    .slice(0, 5);

  return Response.json({ advice: p.advice, days });
}
