export interface Entry {
  date: string;    // YYYY-MM-DD
  text: string;    // その日のひとこと
  comment: string; // AIの返事（未取得なら空文字）
}

const KEY = "hitokoto_entries";
const REFLECT_KEY = "hitokoto_reflections";

// 週次/月次のAIふりかえりの履歴
export interface ReflectionRecord {
  id: string;
  period: "week" | "month";
  key: string;    // 期間の識別子（週=月曜のYYYY-MM-DD / 月=YYYY-MM）
  label: string;  // 表示用ラベル
  sig: string;    // 生成元の内容シグネチャ（変化検知用）
  text: string;
  at: string;     // 生成日時 ISO
}

export function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fmtDate(ymd: string): string {
  const d = new Date(ymd + "T00:00:00");
  const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${dow}）`;
}

export function loadEntries(): Entry[] {
  try {
    const s = localStorage.getItem(KEY);
    const arr: Entry[] = s ? JSON.parse(s) : [];
    // 新しい日付が先頭になるよう降順
    return arr.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

export function saveEntries(entries: Entry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

// ── ふりかえり履歴 ───────────────────────────────────
export function loadReflections(): ReflectionRecord[] {
  try { return JSON.parse(localStorage.getItem(REFLECT_KEY) || "[]"); }
  catch { return []; }
}
export function saveReflections(list: ReflectionRecord[]) {
  localStorage.setItem(REFLECT_KEY, JSON.stringify(list));
}
// 同じ期間（period+key）があれば置き換え、無ければ追加。生成日時の新しい順で最大60件保持。
export function upsertReflection(rec: ReflectionRecord): ReflectionRecord[] {
  const rest = loadReflections().filter(r => !(r.period === rec.period && r.key === rec.key));
  const next = [rec, ...rest].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60);
  saveReflections(next);
  return next;
}

// 全データのエクスポート/インポート（バックアップ）
export function exportEntries(): string {
  return JSON.stringify(
    { app: "hitokoto", version: 2, entries: loadEntries(), reflections: loadReflections() },
    null, 2,
  );
}

export function importEntries(raw: string): boolean {
  try {
    const d = JSON.parse(raw);
    if (!Array.isArray(d?.entries)) return false;
    saveEntries(d.entries);
    if (Array.isArray(d?.reflections)) saveReflections(d.reflections);
    return true;
  } catch {
    return false;
  }
}
