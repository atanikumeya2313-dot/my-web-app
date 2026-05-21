export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';
export type TimeSlot   = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface Task {
  id: string;
  title: string;
  repeat: RepeatType;
  timeSlot: TimeSlot;
  weekdays?: number[];  // 0=日〜6=土（weekly用）
  monthDay?: number;    // 1〜31（monthly用）
}

// タスクIDごとの完了日（YYYY-MM-DD）リスト
export type CompletedMap = Record<string, string[]>;
