import { Earthquake, scaleLabel } from './api';

const SEEN_KEY   = 'eq_seen_ids';
const NOTIFY_KEY = 'eq_notify';

// 通知・ハイライト対象の閾値：震度3以上、または M5.0 以上
export function isSignificant(q: Earthquake): boolean {
  return q.maxScale >= 30 || q.hypocenter.magnitude >= 5.0;
}

// ── 既読ID（前回までに表示済みの地震ID） ──────────────────
export function loadSeenIds(): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); }
  catch { return []; }
}
export function saveSeenIds(ids: string[]) {
  // 直近50件だけ保持しておけば新着判定には十分
  localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(0, 50)));
}

// ── 通知ON/OFF設定 ───────────────────────────────────────
export function loadNotifyEnabled(): boolean {
  return localStorage.getItem(NOTIFY_KEY) === '1';
}
export function saveNotifyEnabled(v: boolean) {
  localStorage.setItem(NOTIFY_KEY, v ? '1' : '0');
}

// ── ブラウザ通知 ─────────────────────────────────────────
export function notifySupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** 通知許可を要求。許可されたら true */
export async function ensureNotifyPermission(): Promise<boolean> {
  if (!notifySupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied')  return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function notifyQuake(q: Earthquake) {
  if (!notifySupported() || Notification.permission !== 'granted') return;
  const place = q.hypocenter.name || '震源地不明';
  const mag   = q.hypocenter.magnitude > 0 ? ` M${q.hypocenter.magnitude.toFixed(1)}` : '';
  new Notification(`地震情報：最大震度${scaleLabel(q.maxScale)}`, {
    body: `${place}${mag}`,
    icon: '/quake/icon-192.png', // basePath '/quake' 配下のため明示
    tag:  q.id, // 同じ地震の重複通知を防ぐ
  });
}
