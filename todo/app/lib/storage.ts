import { Task, CompletedMap } from '../types';

const TASKS_KEY     = 'todo_tasks';
const COMPLETED_KEY = 'todo_completed';

export function loadTasks(): Task[] {
  try {
    return JSON.parse(localStorage.getItem(TASKS_KEY) ?? '[]');
  } catch { return []; }
}

export function saveTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function loadCompleted(): CompletedMap {
  try {
    return JSON.parse(localStorage.getItem(COMPLETED_KEY) ?? '{}');
  } catch { return {}; }
}

export function saveCompleted(map: CompletedMap) {
  localStorage.setItem(COMPLETED_KEY, JSON.stringify(map));
}

export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// 今日表示すべきタスクを返す
export function getTodayTasks(tasks: Task[], completed: CompletedMap): Task[] {
  const today = new Date();
  const ymd   = toYMD(today);
  const dow   = today.getDay();   // 0=日〜6=土
  const dom   = today.getDate();  // 1〜31

  return tasks.filter(task => {
    const doneToday = (completed[task.id] ?? []).includes(ymd);
    if (doneToday) return false;

    if (task.repeat === 'none')    return true;
    if (task.repeat === 'daily')   return true;
    if (task.repeat === 'weekly')  return (task.weekdays ?? []).includes(dow);
    if (task.repeat === 'monthly') return task.monthDay === dom;
    return false;
  });
}

// 通常タスクを完了（削除）
export function completeOnce(tasks: Task[], id: string): Task[] {
  return tasks.filter(t => t.id !== id);
}

// 繰り返しタスクを今日完了としてマーク
export function completeRepeat(completed: CompletedMap, id: string): CompletedMap {
  const ymd  = toYMD(new Date());
  const prev = completed[id] ?? [];
  return { ...completed, [id]: [...prev, ymd] };
}
