export type Cycle = 'month' | 'year' | 'week';

export interface Sub {
  id: string;
  name: string;
  amount: number;       // 1周期あたりの金額（円）
  cycle: Cycle;
  nextDate: string;     // 次回更新日 YYYY-MM-DD
  category: string;
  memo?: string;
  trial?: boolean;      // 無料トライアル中（nextDate＝課金開始日）
  active: boolean;      // 稼働中 / 停止（停止は合計に含めない）
  createdAt: string;
}

export const CATEGORIES = [
  '動画', '音楽', 'アプリ・ソフト', 'ゲーム', 'ジム・習い事',
  'ニュース・雑誌', 'クラウド保存', '通信', 'その他',
];

export const CATEGORY_ICONS: Record<string, string> = {
  '動画': '🎬', '音楽': '🎧', 'アプリ・ソフト': '📱', 'ゲーム': '🎮',
  'ジム・習い事': '🏃', 'ニュース・雑誌': '📰', 'クラウド保存': '☁️',
  '通信': '📶', 'その他': '📦',
};

export const CYCLE_LABEL: Record<Cycle, string> = {
  month: '月額', year: '年額', week: '週',
};

export function catIcon(cat: string): string {
  return CATEGORY_ICONS[cat] ?? '📦';
}

// 1周期あたり金額 → 月あたり換算
export function monthlyEquiv(s: Sub): number {
  if (s.cycle === 'month') return s.amount;
  if (s.cycle === 'year')  return s.amount / 12;
  return s.amount * 365.25 / 7 / 12; // week
}
