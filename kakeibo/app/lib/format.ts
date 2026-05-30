/** Y軸ラベル用：1万以上は「X万」、未満はカンマ区切り */
export const fmtAxis = (v: number) =>
  v >= 10000 ? `${Math.round(v / 10000)}万` : v.toLocaleString('ja-JP');

/** ツールチップ用：¥付き全桁表示 */
export const fmtFull = (v: number) => `¥${v.toLocaleString('ja-JP')}`;
