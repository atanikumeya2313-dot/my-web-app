export type Scale =
  | -1 | 10 | 20 | 30 | 40 | 45 | 50 | 55 | 60 | 70;

export interface Hypocenter {
  name: string;
  latitude: number;
  longitude: number;
  depth: number;
  magnitude: number;
}

export interface PrefScale {
  pref: string;
  scale: number;
}

export interface Earthquake {
  id: string;
  time: string;
  hypocenter: Hypocenter;
  maxScale: Scale;
  domesticTsunami: string;
  prefectures: string[];
  prefScales: PrefScale[];
}

interface RawPoint {
  pref: string;
  scale: number;
}

interface RawQuake {
  id: string;
  time: string;
  earthquake: {
    time: string;
    hypocenter: Hypocenter;
    maxScale: Scale;
    domesticTsunami: string;
  };
  points?: RawPoint[];
}

const API_URL =
  'https://api.p2pquake.net/v2/history?codes=551&limit=30';

export async function fetchEarthquakes(): Promise<Earthquake[]> {
  const res = await fetch(API_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('APIの取得に失敗しました');
  const data: RawQuake[] = await res.json();
  return data.map((q) => {
    const prefMax = new Map<string, number>();
    for (const p of q.points ?? []) {
      if (p.scale <= 0) continue;
      if ((prefMax.get(p.pref) ?? -1) < p.scale) prefMax.set(p.pref, p.scale);
    }
    const sorted = [...prefMax.entries()].sort((a, b) => b[1] - a[1]);
    return {
      id: q.id,
      time: q.earthquake.time,
      hypocenter: q.earthquake.hypocenter,
      maxScale: q.earthquake.maxScale,
      domesticTsunami: q.earthquake.domesticTsunami,
      prefectures: sorted.map(([pref]) => pref),
      prefScales:  sorted.map(([pref, scale]) => ({ pref, scale })),
    };
  });
}

export function scaleLabel(scale: Scale): string {
  const map: Record<number, string> = {
    [-1]: '不明',
    10: '1',
    20: '2',
    30: '3',
    40: '4',
    45: '5弱',
    50: '5強',
    55: '6弱',
    60: '6強',
    70: '7',
  };
  return map[scale] ?? '不明';
}

export function scaleColor(scale: Scale): string {
  if (scale >= 70) return 'bg-purple-700 text-white'; // 震度7
  if (scale >= 60) return 'bg-red-600 text-white';    // 震度6強
  if (scale >= 55) return 'bg-red-500 text-white';    // 震度6弱
  if (scale >= 50) return 'bg-orange-400 text-white'; // 震度5強
  if (scale >= 45) return 'bg-orange-300 text-white'; // 震度5弱
  if (scale >= 40) return 'bg-yellow-400 text-gray-900';
  if (scale >= 30) return 'bg-yellow-200 text-gray-900';
  if (scale >= 20) return 'bg-blue-100 text-gray-900';
  if (scale >= 10) return 'bg-gray-100 text-gray-700';
  return 'bg-gray-100 text-gray-400';
}

export function scaleBorder(scale: Scale): string {
  if (scale >= 70) return 'border-purple-700';
  if (scale >= 60) return 'border-red-600';
  if (scale >= 55) return 'border-red-500';
  if (scale >= 50) return 'border-orange-400';
  if (scale >= 45) return 'border-orange-300';
  if (scale >= 40) return 'border-yellow-400';
  if (scale >= 30) return 'border-yellow-200';
  if (scale >= 20) return 'border-blue-100';
  return 'border-gray-200';
}

export function tsunamiLabel(code: string): string | null {
  if (code === 'None') return null;
  if (code === 'Unknown') return null;
  if (code === 'Checking') return '調査中';
  if (code === 'NoInformation') return null;
  if (code === 'Watch') return '津波注意報';
  if (code === 'Warning') return '津波警報';
  return null;
}

const PREFS = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
  '静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
  '奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
  '熊本県','大分県','宮崎県','鹿児島県','沖縄県',
];

export function extractPrefecture(name: string): string | null {
  return PREFS.find(p => name.startsWith(p)) ?? null;
}

export function fmtTime(iso: string): { date: string; time: string } {
  // P2PQuake API は "YYYY/MM/DD HH:mm:ss.s" 形式の JST 文字列を返す
  // タイムゾーン指定なしだとブラウザ依存になるため +09:00 を付与して正規化する
  const normalized = iso
    .replace(/\//g, '-')
    .replace(' ', 'T')
    .replace(/\.\d+$/, '')
    + '+09:00';
  const d = new Date(normalized);
  const date = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}
