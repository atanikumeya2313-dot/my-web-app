// 数量の分数表示ユーティリティ（¼ ⅓ ½ ⅔ ¾ に対応）。在庫アプリと同じ表記に揃える。

const GLYPH: [number, string][] = [
  [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'],
];

// 数値を「2¾」のような表記にする。端数は近い分数へスナップ。
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

export function roundQty(n: number): number {
  return Math.round(n * 100) / 100;
}
