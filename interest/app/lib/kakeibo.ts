// 家計簿アプリ（同一オリジン・ハブ配下）の資産残高を読み取り、総資産を計算する。
// 計算式は家計簿の AssetSummary.calcBalance に準拠（読み取り専用）。

interface Asset {
  id: string;
  name: string;
  type: 'bank' | 'investment';
  initialBalance: number;
  initialDate: string;
}
interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  memo: string;
  fromAssetId?: string;
  toAssetId?: string;
}

function load<T>(key: string): T[] {
  try { const a = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(a) ? a : []; }
  catch { return []; }
}

function calcBalance(asset: Asset, txs: Transaction[]): number {
  const today = new Date().toISOString().slice(0, 10);
  if (asset.type === 'investment') {
    const up = txs.filter(t => t.type === 'transfer' && t.date <= today);
    const out = up.filter(t => t.fromAssetId === asset.id).reduce((s, t) => s + t.amount, 0);
    const inn = up.filter(t => t.toAssetId === asset.id).reduce((s, t) => s + t.amount, 0);
    return asset.initialBalance + inn - out;
  }
  const since = asset.initialDate <= today ? asset.initialDate : today;
  const after = txs.filter(t => t.date >= since && t.date <= today);
  const income = after.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = after.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const out = after.filter(t => t.type === 'transfer' && t.fromAssetId === asset.id).reduce((s, t) => s + t.amount, 0);
  const inn = after.filter(t => t.type === 'transfer' && t.toAssetId === asset.id).reduce((s, t) => s + t.amount, 0);
  return asset.initialBalance + income - expense - out + inn;
}

// 家計簿の総資産（円）。資産が未登録なら null。
export function kakeiboAssetTotal(): number | null {
  const assets = load<Asset>('kakeibo_assets');
  if (assets.length === 0) return null;
  const txs = load<Transaction>('kakeibo_transactions');
  const total = assets.reduce((s, a) => s + calcBalance(a, txs), 0);
  return Math.max(0, Math.round(total));
}
