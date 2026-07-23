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
  planDay?: number;  // 分割メニューの何日目をやったか（ローテーション判定用）
}

// 体格・条件のプロフィール（AIメニューの前提になる）
export interface Profile {
  height?: number;        // cm
  birthday?: string;      // YYYY-MM-DD
  gender?: 'male' | 'female' | 'other';
  targetWeight?: number;  // kg
  goal?: string;
  freq?: string;
  level?: string;
  equip?: string;
}

// AIが返す1種目
export interface MenuItem { name: string; part: string; sets?: number; reps: string; tip: string }

// 分割メニューの1日分（例: Day1 胸・三頭）
export interface PlanDay { title: string; items: MenuItem[] }

// 分割メニュー全体（週の回数ぶんの days を持つ）
export interface Plan { id: string; createdAt: string; advice: string; days: PlanDay[] }

export function calcAge(birthday?: string): number | undefined {
  if (!birthday) return undefined;
  const b = new Date(birthday);
  if (isNaN(b.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age >= 0 && age < 120 ? age : undefined;
}

export function calcBMI(heightCm?: number, weightKg?: number): number | undefined {
  if (!heightCm || !weightKg) return undefined;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

// BMIの区分（日本肥満学会の基準・目安として表示するだけ）
export function bmiLabel(bmi?: number): string {
  if (!bmi) return '';
  if (bmi < 18.5) return 'やせ型';
  if (bmi < 25)   return '標準';
  if (bmi < 30)   return 'やや高め';
  return '高め';
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
