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

// ホットペッパー グルメ のジャンル（標準検索用）
export const GENRES: { code: string; name: string }[] = [
  { code: '',     name: 'すべて' },
  { code: 'G001', name: '居酒屋' },
  { code: 'G013', name: 'ラーメン' },
  { code: 'G014', name: 'カフェ・スイーツ' },
  { code: 'G004', name: '和食' },
  { code: 'G005', name: '洋食' },
  { code: 'G006', name: 'イタリアン・フレンチ' },
  { code: 'G007', name: '中華' },
  { code: 'G008', name: '焼肉・ホルモン' },
  { code: 'G002', name: 'ダイニングバー・バル' },
  { code: 'G012', name: 'バー・カクテル' },
  { code: 'G016', name: 'お好み焼き・もんじゃ' },
  { code: 'G009', name: 'アジア・エスニック' },
  { code: 'G015', name: 'その他グルメ' },
];

// 標準検索の結果
export interface SearchShop {
  name: string;
  genre: string;
  address: string;
  access: string;
  budget: string;
  url: string;
  photo: string;
  catch: string;
}
export const EHIME_AREAS = [
  '松山市', '今治市', '宇和島市', '八幡浜市', '新居浜市', '西条市', '大洲市',
  '伊予市', '四国中央市', '西予市', '東温市', '砥部町', '松前町', 'その他',
];
