import { Task, CompletedMap } from '../types';

const TASKS_KEY      = 'todo_tasks';
const COMPLETED_KEY  = 'todo_completed';
const CATEGORIES_KEY = 'todo_categories';

const DEFAULT_CATEGORIES = ['仕事', '家事', '健康', '買い物', 'その他'];

export function loadTasks(): Task[] {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) ?? '[]'); }
  catch { return []; }
}
export function saveTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function loadCompleted(): CompletedMap {
  try { return JSON.parse(localStorage.getItem(COMPLETED_KEY) ?? '{}'); }
  catch { return {}; }
}
export function saveCompleted(map: CompletedMap) {
  localStorage.setItem(COMPLETED_KEY, JSON.stringify(map));
}

export function loadCategories(): string[] {
  try {
    const saved = localStorage.getItem(CATEGORIES_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  } catch { return DEFAULT_CATEGORIES; }
}
export function saveCategories(cats: string[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
}

export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function diffDays(ymd1: string, ymd2: string): number {
  return Math.round((new Date(ymd1).getTime() - new Date(ymd2).getTime()) / 86_400_000);
}

function shouldShow(task: Task, ymd: string, todayYmd: string, completed?: CompletedMap): boolean {
  const dow = new Date(ymd).getDay();
  const dom = new Date(ymd).getDate();

  if (task.repeat === 'none') {
    return task.date ? task.date === ymd : ymd === todayYmd;
  }
  if (task.repeat === 'daily')   return true;
  if (task.repeat === 'weekly')  return (task.weekdays ?? []).includes(dow);
  if (task.repeat === 'monthly') return task.monthDay === dom;
  if (task.repeat === 'interval') {
    const pastDates  = (completed?.[task.id] ?? []).filter(d => d !== ymd);
    const lastDone   = pastDates.length > 0 ? [...pastDates].sort().at(-1)! : null;
    if (lastDone) {
      // 前回完了日から intervalDays 日後のみ表示
      return diffDays(ymd, lastDone) === task.intervalDays!;
    } else {
      // 未完了の間は startDate 起算の固定インターバル（消えないように）
      const start = task.startDate ?? todayYmd;
      const diff  = diffDays(ymd, start);
      return diff >= 0 && task.intervalDays! > 0 && diff % task.intervalDays! === 0;
    }
  }
  return false;
}

export function getTodayTasks(tasks: Task[], completed: CompletedMap): Task[] {
  const today = toYMD(new Date());
  return tasks.filter(task => {
    if ((completed[task.id] ?? []).includes(today)) return false;
    return shouldShow(task, today, today, completed);
  });
}

// カレンダー用：dailyは今日のみ
export function getTasksForDate(tasks: Task[], completed: CompletedMap, ymd: string): Task[] {
  const today = toYMD(new Date());
  return tasks.filter(task => {
    if ((completed[task.id] ?? []).includes(ymd)) return false;
    if (task.repeat === 'daily') return ymd === today;
    return shouldShow(task, ymd, today, completed);
  });
}

export function completeOnce(tasks: Task[], id: string): Task[] {
  return tasks.filter(t => t.id !== id);
}

export function completeRepeat(completed: CompletedMap, id: string, ymd?: string): CompletedMap {
  const date = ymd ?? toYMD(new Date());
  const prev = completed[id] ?? [];
  return { ...completed, [id]: [...prev, date] };
}

export function undoRepeat(completed: CompletedMap, id: string): CompletedMap {
  const ymd  = toYMD(new Date());
  const prev = (completed[id] ?? []).filter(d => d !== ymd);
  const next = { ...completed };
  if (prev.length === 0) delete next[id]; else next[id] = prev;
  return next;
}
