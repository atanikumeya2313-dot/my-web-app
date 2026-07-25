// 数量の分数表示・入力ユーティリティ（¼ ⅓ ½ ⅔ ¾ に対応）

export const FRAC_OPTIONS: { value: number; label: string }[] = [
  { value: 0,    label: 'なし' },
  { value: 0.25, label: '¼' },
  { value: 1 / 3, label: '⅓' },
  { value: 0.5,  label: '½' },
  { value: 2 / 3, label: '⅔' },
  { value: 0.75, label: '¾' },
];

const GLYPH: [number, string][] = [
  [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'],
];

// 数値を「2¾」のような表記にする。端数は近い分数へスナップ。当てはまらなければ小数表示。
export function formatQty(n: number | undefined | null): string {
  const num = Number(n);
  if (!isFinite(num)) return '0';
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  const int = Math.floor(abs + 1e-9);
  const frac = abs - int;
  for (const [v, g] of GLYPH) {
    if (Math.abs(frac - v) < 0.04) return `${sign}${int === 0 ? '' : int}${g}`;
  }
  if (frac < 0.04) return `${sign}${int}`;
  return `${sign}${Math.round(abs * 100) / 100}`;
}

// 端数（0〜1未満）を返す。UIのチップ選択状態の判定に使う。
export function fracOf(n: number): number {
  const abs = Math.max(0, Number(n) || 0);
  return abs - Math.floor(abs + 1e-9);
}

// 浮動小数の誤差を丸める（0.1+0.2 対策）
export function roundQty(n: number): number {
  return Math.round(n * 100) / 100;
}
