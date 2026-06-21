export interface Entry {
  date: string;    // YYYY-MM-DD
  text: string;    // その日のひとこと
  comment: string; // AIの返事（未取得なら空文字）
}

const KEY = "hitokoto_entries";

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

// 全データのエクスポート/インポート（バックアップ）
export function exportEntries(): string {
  return JSON.stringify({ app: "hitokoto", version: 1, entries: loadEntries() }, null, 2);
}

export function importEntries(raw: string): boolean {
  try {
    const d = JSON.parse(raw);
    if (!Array.isArray(d?.entries)) return false;
    saveEntries(d.entries);
    return true;
  } catch {
    return false;
  }
}
