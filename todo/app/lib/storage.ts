import { Task, CompletedMap, CompletedLogEntry } from '../types';

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
  return Math.round((new Date(ymd1 + 'T00:00:00').getTime() - new Date(ymd2 + 'T00:00:00').getTime()) / 86_400_000);
}

function addMonths(ymd: string, months: number): string {
  const d = new Date(ymd);
  d.setMonth(d.getMonth() + months);
  return toYMD(d);
}

// 月の最終日を超える場合は最終日に丸める
function clampToMonth(year: number, month: number, day: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(day, lastDay);
}

function shouldShow(task: Task, ymd: string, todayYmd: string, completed?: CompletedMap): boolean {
  const dow = new Date(ymd).getDay();
  const dom = new Date(ymd).getDate();

  if (task.repeat === 'none') {
    return task.date ? task.date === ymd : ymd === todayYmd;
  }
  if (task.repeat === 'daily')   return true;
  if (task.repeat === 'weekly')  return (task.weekdays ?? []).includes(dow);
  if (task.repeat === 'monthly') {
    const d = new Date(ymd);
    const effective = clampToMonth(d.getFullYear(), d.getMonth(), task.monthDay ?? 1);
    return effective === dom;
  }
  if (task.repeat === 'interval') {
    const pastDates  = (completed?.[task.id] ?? []).filter(d => d !== ymd);
    const lastDone   = pastDates.length > 0 ? [...pastDates].sort().at(-1)! : null;
    if (lastDone) {
      return diffDays(ymd, lastDone) === task.intervalDays!;
    } else {
      const start = task.startDate ?? todayYmd;
      const diff  = diffDays(ymd, start);
      return diff >= 0 && task.intervalDays! > 0 && diff % task.intervalDays! === 0;
    }
  }
  if (task.repeat === 'monthly-interval') {
    const n         = task.monthIntervalMonths ?? 1;
    const pastDates = (completed?.[task.id] ?? []).filter(d => d !== ymd);
    const lastDone  = pastDates.length > 0 ? [...pastDates].sort().at(-1)! : null;
    if (lastDone) {
      return addMonths(lastDone, n) === ymd;
    } else {
      const start      = task.startDate ?? todayYmd;
      if (ymd < start) return false;
      const startDate  = new Date(start);
      const ymdDate    = new Date(ymd);
      const monthsDiff = (ymdDate.getFullYear() - startDate.getFullYear()) * 12
                       + (ymdDate.getMonth()    - startDate.getMonth());
      return n > 0 && monthsDiff >= 0 && monthsDiff % n === 0
          && ymdDate.getDate() === startDate.getDate();
    }
  }
  if (task.repeat === 'monthly-weekday') {
    const nth        = task.monthlyWeekdayNth ?? 1;
    const targetDow  = task.monthlyWeekdayDow ?? 0;
    const d          = new Date(ymd);
    if (d.getDay() !== targetDow) return false;
    return Math.ceil(d.getDate() / 7) === nth;
  }
  return false;
}

// 最後の完了日より後に存在する、最も直近のスケジュール済み未完了日を返す
function findMostRecentMissedOccurrence(task: Task, today: string, completed: CompletedMap): string | null {
  const completedDates = completed[task.id] ?? [];
  const lastCompleted  = completedDates.length > 0
    ? [...completedDates].sort().at(-1)!
    : null;

  for (let i = 1; i <= 366; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ymd = toYMD(d);
    // 最後の完了日以前は遡らない（その後に完了済みなら繰り越し不要）
    if (lastCompleted && ymd <= lastCompleted) return null;
    if (shouldShow(task, ymd, today, completed)) return ymd;
  }
  return null;
}

export function getTodayTasks(tasks: Task[], completed: CompletedMap): Task[] {
  const today    = toYMD(new Date());
  const shownIds = new Set<string>();
  const result: Task[] = [];

  // 通常スケジュール
  for (const task of tasks) {
    if ((completed[task.id] ?? []).includes(today)) continue;
    if (!shouldShow(task, today, today, completed)) continue;
    shownIds.add(task.id);
    result.push(task);
  }

  // 繰り返しタスクの繰り越し
  for (const task of tasks) {
    if (task.repeat === 'none') continue;          // 一回限りは date フィールドで管理
    if (shownIds.has(task.id)) continue;           // 今日が自然な予定日なら不要
    if ((completed[task.id] ?? []).includes(today)) continue;

    const missedDate = findMostRecentMissedOccurrence(task, today, completed);
    if (!missedDate) continue;

    // 次の予定日が今日以前に来ていれば繰り越しは終了（次の予定が引き継ぐ）
    const nextAfterMissed = nextOccurrenceAfter(task, missedDate);
    if (nextAfterMissed && nextAfterMissed <= today) continue;

    result.push(task);
  }

  return result;
}

export function getTomorrowTasks(tasks: Task[], completed: CompletedMap): Task[] {
  const today    = toYMD(new Date());
  const tomorrow = toYMD(new Date(Date.now() + 86_400_000));
  return tasks.filter(task => {
    if ((completed[task.id] ?? []).includes(tomorrow)) return false;
    return shouldShow(task, tomorrow, today, completed);
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

export function nextOccurrenceAfter(task: Task, doneYmd: string): string | null {
  if (task.repeat === 'daily') {
    const d = new Date(doneYmd); d.setDate(d.getDate() + 1); return toYMD(d);
  }
  if (task.repeat === 'weekly') {
    const wds = task.weekdays ?? [];
    if (wds.length === 0) return null;
    for (let i = 1; i <= 7; i++) {
      const d = new Date(doneYmd); d.setDate(d.getDate() + i);
      if (wds.includes(d.getDay())) return toYMD(d);
    }
    return null;
  }
  if (task.repeat === 'monthly') {
    const day  = task.monthDay ?? 1;
    const done = new Date(doneYmd);
    const effSame = clampToMonth(done.getFullYear(), done.getMonth(), day);
    const same = new Date(done.getFullYear(), done.getMonth(), effSame);
    if (same > done) return toYMD(same);
    const ny = done.getMonth() === 11 ? done.getFullYear() + 1 : done.getFullYear();
    const nm = (done.getMonth() + 1) % 12;
    return toYMD(new Date(ny, nm, clampToMonth(ny, nm, day)));
  }
  if (task.repeat === 'interval') {
    const d = new Date(doneYmd); d.setDate(d.getDate() + (task.intervalDays ?? 1)); return toYMD(d);
  }
  if (task.repeat === 'monthly-interval') {
    return addMonths(doneYmd, task.monthIntervalMonths ?? 1);
  }
  if (task.repeat === 'monthly-weekday') {
    const nth = task.monthlyWeekdayNth ?? 1;
    const dow = task.monthlyWeekdayDow ?? 0;
    // 翌月の第nth dow を探す
    const d = new Date(doneYmd);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
    d.setDate(d.getDate() + (nth - 1) * 7);
    return toYMD(d);
  }
  return null;
}

// ── Completed log ──────────────────────────────────────

const COMPLETED_LOG_KEY = 'todo_completed_log';

export function loadCompletedLog(): CompletedLogEntry[] {
  try { return JSON.parse(localStorage.getItem(COMPLETED_LOG_KEY) ?? '[]'); }
  catch { return []; }
}

export function addToLog(entry: CompletedLogEntry): CompletedLogEntry[] {
  const cutoff = toYMD(new Date(Date.now() - 7 * 86_400_000));
  const next = [...loadCompletedLog().filter(e => e.date >= cutoff), entry];
  localStorage.setItem(COMPLETED_LOG_KEY, JSON.stringify(next));
  return next;
}

export function saveLog(log: CompletedLogEntry[]): void {
  localStorage.setItem(COMPLETED_LOG_KEY, JSON.stringify(log));
}

// ── Complete helpers ────────────────────────────────────

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
