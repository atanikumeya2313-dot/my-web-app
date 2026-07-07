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

// 在庫のうち「食材とみなせるもの」（在庫あり・非食品カテゴリ以外）を返す
export function loadInventoryFood(): InvFood[] {
  try {
    const raw = localStorage.getItem('inventory_items');
    const items: InvItem[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) return [];
    const seen = new Set<string>();
    const out: InvFood[] = [];
    for (const it of items) {
      const name = String(it?.name ?? '').trim();
      if (!name) continue;
      if ((it?.quantity ?? 0) <= 0) continue;               // 在庫切れは除外
      if (NON_FOOD.includes(String(it?.category ?? ''))) continue; // 日用品・薬は除外
      if (seen.has(name)) continue;
      seen.add(name);
      out.push({ name, soon: isSoon(it?.expiryDate) });
    }
    return out;
  } catch {
    return [];
  }
}
