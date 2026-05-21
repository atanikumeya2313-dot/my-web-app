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

export function getTodayTasks(tasks: Task[], completed: CompletedMap): Task[] {
  const today = new Date();
  const ymd   = toYMD(today);
  const dow   = today.getDay();
  const dom   = today.getDate();

  return tasks.filter(task => {
    const doneToday = (completed[task.id] ?? []).includes(ymd);
    if (doneToday) return false;

    if (task.repeat === 'none') {
      // 日付指定あり → その日のみ表示
      if (task.date) return task.date === ymd;
      return true;
    }
    if (task.repeat === 'daily')   return true;
    if (task.repeat === 'weekly')  return (task.weekdays ?? []).includes(dow);
    if (task.repeat === 'monthly') return task.monthDay === dom;
    return false;
  });
}

export function completeOnce(tasks: Task[], id: string): Task[] {
  return tasks.filter(t => t.id !== id);
}

export function completeRepeat(completed: CompletedMap, id: string): CompletedMap {
  const ymd  = toYMD(new Date());
  const prev = completed[id] ?? [];
  return { ...completed, [id]: [...prev, ymd] };
}
