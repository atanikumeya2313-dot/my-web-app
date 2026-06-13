'use client';
import { useEffect, useState } from 'react';

/**
 * クライアントのマウント後に localStorage から初期値を読み込むフック。
 *
 * localStorage は SSR / 初回レンダー時には参照できないため、まず fallback で
 * 描画し、マウント後に実データへ差し替える。useState の遅延初期化で直接読むと
 * サーバー描画（空）とハイドレーションが食い違うため、この同期は副作用として行う。
 *
 * 返り値は useState と同じ [値, セッター]。セッターは React 状態のみ更新するので、
 * 永続化が必要な箇所では呼び出し側で storage の save 関数も呼ぶこと。
 */
export function useStored<T>(load: () => T, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    // localStorage はマウント後にのみ読めるため、ここでの同期的な setState は意図的。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(load());
    // 初回マウント時に一度だけ実行する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [value, setValue];
}
