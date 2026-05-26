export type Priority   = 'high' | 'medium' | 'low';
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'interval' | 'monthly-interval' | 'monthly-weekday';
export type TimeSlot   = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface Task {
  id: string;
  title: string;
  repeat: RepeatType;
  timeSlot: TimeSlot;
  priority?: Priority;
  memo?: string;
  date?: string;         // YYYY-MM-DD（repeat='none'のとき日付指定）
  category?: string;
  weekdays?: number[];   // 0=日〜6=土（weekly用）
  monthDay?: number;     // 1〜31（monthly用）
  intervalDays?: number;
  monthIntervalMonths?: number;
  startDate?: string;
  monthlyWeekdayNth?: number;
  monthlyWeekdayDow?: number;
}

export type CompletedMap = Record<string, string[]>;

export interface CompletedLogEntry {
  id: string;
  title: string;
  priority?: Priority;
  category?: string;
  completedAt: string; // ISO
  date: string;        // YYYY-MM-DD
}

export interface UndoAction {
  task: Task;
  message?: string;
  nextDate?: string;
  prevTasks?: Task[];
  prevCompleted?: CompletedMap;
  prevLog?: CompletedLogEntry[];
}
