export type Part = '胸' | '背中' | '脚' | '肩' | '腕' | '腹' | '有酸素' | 'その他';
export type ExKind = 'strength' | 'cardio';

export const PARTS: Part[] = ['胸', '背中', '脚', '肩', '腕', '腹', '有酸素', 'その他'];

export const PART_ICON: Record<Part, string> = {
  '胸': '🫁', '背中': '🔙', '脚': '🦵', '肩': '💪', '腕': '💪', '腹': '🧻', '有酸素': '🏃', 'その他': '🏋️',
};

// 種目マスター
export interface Exercise {
  id: string;
  name: string;
  part: Part;
  kind: ExKind;
}

// 筋トレ1セット
export interface StrengthSet { weight: number; reps: number }

// セッション内の1種目の記録
export interface Entry {
  exerciseId: string;
  name: string;      // 種目名スナップショット
  part: Part;
  kind: ExKind;
  sets?: StrengthSet[];   // 筋トレ
  durationMin?: number;   // 有酸素：時間(分)
  distanceKm?: number;    // 有酸素：距離(km)
  memo?: string;
}

// 1回のジム（日ごと）
export interface Session {
  id: string;
  date: string;      // YYYY-MM-DD
  entries: Entry[];
  memo?: string;
  createdAt: string;
}

// 体重（1日1件）
export interface WeightLog { date: string; weight: number }

// メニューのテンプレ
export interface Template { id: string; name: string; exerciseIds: string[] }

// 既定の種目（よく使うもの）
export const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'ex_bench',   name: 'ベンチプレス',       part: '胸',   kind: 'strength' },
  { id: 'ex_dbpress', name: 'ダンベルプレス',     part: '胸',   kind: 'strength' },
  { id: 'ex_chestfly', name: 'チェストフライ',    part: '胸',   kind: 'strength' },
  { id: 'ex_lat',     name: 'ラットプルダウン',   part: '背中', kind: 'strength' },
  { id: 'ex_row',     name: 'シーテッドロウ',     part: '背中', kind: 'strength' },
  { id: 'ex_squat',   name: 'スクワット',         part: '脚',   kind: 'strength' },
  { id: 'ex_legpress', name: 'レッグプレス',      part: '脚',   kind: 'strength' },
  { id: 'ex_legext',  name: 'レッグエクステンション', part: '脚', kind: 'strength' },
  { id: 'ex_shoulder', name: 'ショルダープレス',  part: '肩',   kind: 'strength' },
  { id: 'ex_side',    name: 'サイドレイズ',       part: '肩',   kind: 'strength' },
  { id: 'ex_curl',    name: 'アームカール',       part: '腕',   kind: 'strength' },
  { id: 'ex_pushdown', name: 'プレスダウン',      part: '腕',   kind: 'strength' },
  { id: 'ex_abs',     name: '腹筋（クランチ）',   part: '腹',   kind: 'strength' },
  { id: 'ex_run',     name: 'ランニング',         part: '有酸素', kind: 'cardio' },
  { id: 'ex_bike',    name: 'エアロバイク',       part: '有酸素', kind: 'cardio' },
  { id: 'ex_walk',    name: 'ウォーキング',       part: '有酸素', kind: 'cardio' },
];

// 推定1RM（Epley式）
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return Math.round(weight * (1 + reps / 30));
}
