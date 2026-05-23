export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'interval' | 'monthly-interval' | 'monthly-weekday';
export type TimeSlot   = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface Task {
  id: string;
  title: string;
  repeat: RepeatType;
  timeSlot: TimeSlot;
  date?: string;         // YYYY-MM-DD（repeat='none'のとき日付指定）
  category?: string;
  weekdays?: number[];   // 0=日〜6=土（weekly用）
  monthDay?: number;     // 1〜31（monthly用）
  intervalDays?: number;         // N日ごと（interval用）
  monthIntervalMonths?: number;  // N月ごと（monthly-interval用）
  startDate?: string;            // 基準日 YYYY-MM-DD（interval/monthly-interval用）
  monthlyWeekdayNth?: number;    // 第N週（1-4）（monthly-weekday用）
  monthlyWeekdayDow?: number;    // 0=日〜6=土（monthly-weekday用）
}

export type CompletedMap = Record<string, string[]>;

// 元に戻す用
export interface UndoAction {
  task: Task;
  message?: string;
  nextDate?: string;
  prevTasks?: Task[];
  prevCompleted?: CompletedMap;
}
