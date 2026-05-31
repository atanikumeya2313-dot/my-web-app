const TARGET_TC_URL = 'https://www.jma.go.jp/bosai/typhoon/data/targetTc.json';

export interface TyphoonData {
  tropicalCyclone: string; // e.g. "TC2606"
  typhoonNumber:   string; // e.g. "2606"
  category:        string; // e.g. "STS"
  issue:           string; // ISO datetime
}

interface CategoryInfo {
  ja:     string;
  badge:  string; // bg + text color classes
  border: string;
}

const CATEGORY_MAP: Record<string, CategoryInfo> = {
  TD:  { ja: '熱帯低気圧',   badge: 'bg-blue-100 text-blue-700',     border: 'border-blue-400'   },
  TS:  { ja: '台風',         badge: 'bg-yellow-100 text-yellow-800', border: 'border-yellow-400' },
  STS: { ja: '台風',         badge: 'bg-orange-100 text-orange-700', border: 'border-orange-400' },
  TY:  { ja: '強い台風',     badge: 'bg-red-100 text-red-700',       border: 'border-red-500'    },
  ST:  { ja: '猛烈な台風',   badge: 'bg-purple-100 text-purple-700', border: 'border-purple-600' },
};

export async function fetchTyphoons(): Promise<TyphoonData[]> {
  const res = await fetch(TARGET_TC_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('台風データの取得に失敗しました');
  return res.json();
}

export function parseTyphoonNumber(data: TyphoonData): { year: string; num: string } {
  const n = data.typhoonNumber; // "2606"
  return {
    year: `20${n.slice(0, 2)}`,              // "2026"
    num:  String(parseInt(n.slice(2), 10)),  // "6"
  };
}

export function getCategoryInfo(category: string): CategoryInfo {
  return CATEGORY_MAP[category] ?? { ja: '台風', badge: 'bg-gray-100 text-gray-700', border: 'border-gray-400' };
}

export function formatIssueTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} 現在`;
}
