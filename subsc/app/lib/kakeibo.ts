// 家計簿アプリ（同一オリジン・ハブ配下）の「固定費」に、月額サブスクを登録/解除する。
// 家計簿は固定費を毎月自動で支出計上するため、月額サブスクのみ対象にする。
import { Sub } from '../types';

interface FixedItem {
  id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category: string; // 家計簿のカテゴリID
  day: number;      // 引き落とし日（1〜31）
}

const FIXED_KEY = 'kakeibo_fixed';

// サブスクのカテゴリ → 家計簿のカテゴリID（家計簿のデフォルトカテゴリに合わせる）
const CAT_MAP: Record<string, string> = {
  '通信': 'exp_telecom',
  '動画': 'exp_entertainment',
  '音楽': 'exp_entertainment',
  'ゲーム': 'exp_entertainment',
  'ニュース・雑誌': 'exp_entertainment',
  'アプリ・ソフト': 'exp_other',
  'クラウド保存': 'exp_other',
  'ジム・習い事': 'exp_other',
  'その他': 'exp_other',
};

function loadFixed(): FixedItem[] {
  try { const a = JSON.parse(localStorage.getItem(FIXED_KEY) || '[]'); return Array.isArray(a) ? a : []; }
  catch { return []; }
}
function saveFixed(list: FixedItem[]) {
  localStorage.setItem(FIXED_KEY, JSON.stringify(list));
}

const fixedIdFor = (subId: string) => `subsc_${subId}`;

// 月額のみ家計簿に登録できる（年額・週は家計簿の固定費が毎月計上のため対象外）
export function canLinkToKakeibo(sub: Pick<Sub, 'cycle'>): boolean {
  return sub.cycle === 'month';
}

function upsert(sub: Sub) {
  const id = fixedIdFor(sub.id);
  const day = Math.min(31, Math.max(1, parseInt(sub.nextDate.split('-')[2]) || 1));
  const item: FixedItem = {
    id, name: sub.name, amount: sub.amount, type: 'expense',
    category: CAT_MAP[sub.category] ?? 'exp_other', day,
  };
  saveFixed([...loadFixed().filter(f => f.id !== id), item]);
}

export function removeSubFromKakeibo(subId: string) {
  const id = fixedIdFor(subId);
  const list = loadFixed();
  const next = list.filter(f => f.id !== id);
  if (next.length !== list.length) saveFixed(next);
}

// サブスクの状態に応じて家計簿の固定費を追加/更新/削除する。
// 登録するのは「連携ON・月額・稼働中・トライアルでない」場合のみ。
export function applyKakeiboLink(sub: Sub) {
  if (sub.kakeiboLinked && sub.cycle === 'month' && sub.active && !sub.trial) upsert(sub);
  else removeSubFromKakeibo(sub.id);
}
