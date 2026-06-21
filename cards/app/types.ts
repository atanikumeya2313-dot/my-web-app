export interface Deck {
  id: string;
  name: string;
  createdAt: string;
}

export interface Card {
  id: string;
  deckId: string;
  front: string;          // 問題（表）
  back: string;           // 答え（裏）
  explanation?: string;   // 解説
  level: number;          // 間隔反復のレベル（0〜）
  due: string;            // 次回復習日 YYYY-MM-DD
  createdAt: string;
}

export type Grade = 'again' | 'hard' | 'good';

// AI生成・確認用の下書き（保存前）
export interface DraftCard {
  front: string;
  back: string;
  explanation: string;
}
