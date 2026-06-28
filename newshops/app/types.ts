export type ShopStatus = 'planned' | 'open';   // オープン予定 / オープン済

export interface Shop {
  id: string;
  name: string;
  category: string;     // カテゴリ（飲食・カフェ・雑貨 など自由）
  area: string;         // 市町（松山市 など）
  status: ShopStatus;
  openDate?: string;    // オープン日 / 予定日 YYYY-MM-DD（不明可）
  url?: string;         // 公式・SNSなど
  memo?: string;
  favorite?: boolean;
  source?: string;      // 'ai' など。AI候補から追加した場合の目印
  createdAt: string;
}

// AIの発見候補（保存前）
export interface ShopCandidate {
  name: string;
  category: string;
  area: string;
  status: ShopStatus;
  openDate?: string;
  note?: string;
}

export const CATEGORIES = ['飲食店', 'カフェ', 'スイーツ', 'パン', 'ラーメン', '居酒屋', '雑貨', 'アパレル', '美容', 'その他'];
export const EHIME_AREAS = [
  '松山市', '今治市', '宇和島市', '八幡浜市', '新居浜市', '西条市', '大洲市',
  '伊予市', '四国中央市', '西予市', '東温市', '砥部町', '松前町', 'その他',
];
