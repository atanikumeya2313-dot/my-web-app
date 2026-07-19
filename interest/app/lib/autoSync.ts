'use client';
import { useEffect, useRef } from 'react';
import { cloudPull, cloudPush, CODE_KEY } from './cloud';

const AUTO_KEY = 'cloud_auto_enabled';

export function isAutoOn(): boolean {
  try { return localStorage.getItem(AUTO_KEY) === '1'; } catch { return false; }
}
export function setAutoOn(on: boolean) {
  try { localStorage.setItem(AUTO_KEY, on ? '1' : '0'); } catch {}
}

function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return String(h);
}

interface Opts {
  bucket: string;
  serialize: () => string;
  apply: (json: string) => boolean;
  hasData: () => boolean;   // 空データでの上書き（全消し）を防ぐ
}

// 安全設計の自動同期：
// ・開いた時、クラウドが「前回同期した時刻」と違えば（＝他端末が更新）取得して反映（reload）
// ・変更を検知したら数秒後にまとめて送信（空データは送らない）
// ・同期コード未設定 or 自動オフなら何もしない
export function useAutoSync(opts: Opts) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let code = '';
    try { code = (localStorage.getItem(CODE_KEY) ?? '').trim(); } catch {}
    if (!code || !isAutoOn()) return;

    const lastAtKey = `cloud_last_at_${opts.bucket}`;
    let lastPushedHash = '';
    let disposed = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const pushIfChanged = async () => {
      try {
        if (!opts.hasData()) return;
        const cur = opts.serialize();
        const h = hashStr(cur);
        if (h === lastPushedHash) return;
        const { at } = await cloudPush(code, opts.bucket, cur);
        lastPushedHash = h;
        if (at) { try { localStorage.setItem(lastAtKey, at); } catch {} }
      } catch { /* ネットワーク不通などは次回に持ち越し */ }
    };

    (async () => {
      // 開いた時の取得・反映
      try {
        const { json, at } = await cloudPull(code, opts.bucket);
        let localAt = '';
        try { localAt = localStorage.getItem(lastAtKey) ?? ''; } catch {}
        if (json && at && at !== localAt) {
          if (opts.apply(json)) {
            try { localStorage.setItem(lastAtKey, at); } catch {}
            location.reload();
            return;
          }
        }
      } catch { /* 取得失敗時はローカルのまま続行 */ }
      if (disposed) return;
      // 取得直後のデータは送り返さない
      lastPushedHash = hashStr(opts.serialize());
      timer = setInterval(pushIfChanged, 3000);
    })();

    const onVisibility = () => { if (document.visibilityState === 'hidden') void pushIfChanged(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
