export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'interval';
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
  intervalDays?: number; // N日ごと（interval用）
  startDate?: string;    // インターバル基準日 YYYY-MM-DD（interval用）
}

export type CompletedMap = Record<string, string[]>;

// 元に戻す用
export interface UndoAction {
  task: Task;
  message?: string;
  prevTasks?: Task[];         // none タスク削除の場合
  prevCompleted?: CompletedMap; // repeat タスク完了の場合
}
