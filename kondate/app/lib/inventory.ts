// 在庫管理アプリ（同一オリジン・ハブ配下）の localStorage を読み取り、食材を取り込む。
// 書き込みはしない（読み取り専用）。キー・データ構造は inventory アプリに準拠。

interface InvItem {
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  expiryDate?: string; // YYYY-MM-DD
}

const NON_FOOD = ['日用品・消耗品', '薬・医療品'];

// 消費期限が近い（5日以内 or 期限切れ）か
function isSoon(expiry?: string): boolean {
  if (!expiry) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(expiry).getTime() - today.getTime()) / 86_400_000);
  return days <= 5;
}

export interface InvFood { name: string; soon: boolean }

export interface InvReadResult {
  keyPresent: boolean;  // inventory_items が存在したか（＝同一オリジンに在庫データがあるか）
  totalItems: number;   // 在庫の生の件数
  inStock: number;      // 在庫あり(数量>0)の件数
  food: InvFood[];      // 取り込み対象（在庫あり・非食品カテゴリ以外）
}

// 在庫データを読み、取り込み対象と診断情報をまとめて返す
export function readInventoryFood(): InvReadResult {
  let raw: string | null = null;
  try { raw = localStorage.getItem('inventory_items'); } catch { raw = null; }
  if (raw == null) return { keyPresent: false, totalItems: 0, inStock: 0, food: [] };

  let items: InvItem[] = [];
  try { const p = JSON.parse(raw); items = Array.isArray(p) ? p : []; } catch { items = []; }

  const seen = new Set<string>();
  const food: InvFood[] = [];
  let inStock = 0;
  for (const it of items) {
    const name = String(it?.name ?? '').trim();
    if (!name) continue;
    if ((it?.quantity ?? 0) <= 0) continue;               // 在庫切れは除外
    inStock++;
    if (NON_FOOD.includes(String(it?.category ?? ''))) continue; // 日用品・薬は除外
    if (seen.has(name)) continue;
    seen.add(name);
    food.push({ name, soon: isSoon(it?.expiryDate) });
  }
  return { keyPresent: true, totalItems: items.length, inStock, food };
}

// 互換用（従来の取り込み対象のみ）
export function loadInventoryFood(): InvFood[] {
  return readInventoryFood().food;
}
