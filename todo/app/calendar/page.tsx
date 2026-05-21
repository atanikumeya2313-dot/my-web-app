'use client';
import { useEffect, useState } from 'react';
import { Task, CompletedMap } from '../types';
import {
  loadTasks, saveTasks, loadCompleted, saveCompleted, loadCategories,
  toYMD, completeOnce, completeRepeat,
} from '../lib/storage';
import TaskItem from '../components/TaskItem';
import TaskForm from '../components/TaskForm';

const DOW_LABELS = ['日','月','火','水','木','金','土'];

function toYM(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return toYM(d);
}
function fmtYM(ym: string) {
  const [y, m] = ym.split('-');
  return `${y}年${parseInt(m)}月`;
}

// その日に表示すべきタスクを返す
function getTasksForDate(tasks: Task[], completed: CompletedMap, ymd: string): Task[] {
  const d   = new Date(ymd);
  const dow = d.getDay();
  const dom = d.getDate();

  return tasks.filter(task => {
    const doneToday = (completed[task.id] ?? []).includes(ymd);
    if (doneToday) return false;

    if (task.repeat === 'none')    return task.date ? task.date === ymd : toYMD(new Date()) === ymd;
    if (task.repeat === 'daily')   return true;
    if (task.repeat === 'weekly')  return (task.weekdays ?? []).includes(dow);
    if (task.repeat === 'monthly') return task.monthDay === dom;
    return false;
  });
}

export default function CalendarPage() {
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [completed,  setCompleted]  = useState<CompletedMap>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [ym,         setYm]         = useState(toYM(new Date()));
  const [selectedYmd,setSelectedYmd]= useState(toYMD(new Date()));
  const [showForm,   setShowForm]   = useState(false);

  useEffect(() => {
    setTasks(loadTasks());
    setCompleted(loadCompleted());
    setCategories(loadCategories());
  }, []);

  const [year, month] = ym.split('-').map(Number);
  const firstDay  = new Date(year, month - 1, 1).getDay();
  const daysCount = new Date(year, month, 0).getDate();
  const today     = toYMD(new Date());

  // カレンダーのセルリスト（前月の空白 + 当月の日）
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysCount }, (_, i) => i + 1),
  ];

  function ymdOf(day: number) {
    return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  function hasTask(day: number) {
    return getTasksForDate(tasks, completed, ymdOf(day)).length > 0;
  }

  const selectedTasks = getTasksForDate(tasks, completed, selectedYmd);

  function handleComplete(id: string) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    if (task.repeat === 'none') {
      const next = completeOnce(tasks, id);
      saveTasks(next);
      setTasks(next);
    } else {
      const next = completeRepeat(completed, id);
      saveCompleted(next);
      setCompleted(next);
    }
  }

  function handleAdd(task: Task) {
    const next = [...tasks, task];
    saveTasks(next);
    setTasks(next);
  }

  const selectedLabel = (() => {
    const d = new Date(selectedYmd);
    return `${d.getMonth()+1}月${d.getDate()}日（${DOW_LABELS[d.getDay()]}）`;
  })();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setYm(m => shiftMonth(m, -1))}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg">‹</button>
          <h1 className="text-base font-bold text-gray-800">{fmtYM(ym)}</h1>
          <button onClick={() => setYm(m => shiftMonth(m, 1))}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg">›</button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* カレンダーグリッド */}
        <div className="bg-white rounded-xl shadow-sm p-3 mb-4">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 mb-1">
            {DOW_LABELS.map((d, i) => (
              <div key={d} className={`text-center text-xs font-medium py-1
                ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* 日付セル */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const ymd      = ymdOf(day);
              const isToday  = ymd === today;
              const isSelected = ymd === selectedYmd;
              const hasDot   = hasTask(day);
              const dow      = (firstDay + day - 1) % 7;

              return (
                <button key={day} onClick={() => setSelectedYmd(ymd)}
                  className={`flex flex-col items-center py-1.5 rounded-lg transition-colors
                    ${isSelected ? 'bg-blue-500' : isToday ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <span className={`text-xs font-medium
                    ${isSelected ? 'text-white' : isToday ? 'text-blue-500' :
                      dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  {hasDot && (
                    <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-blue-400'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 選択日のタスク */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-500">{selectedLabel}</h2>
          <span className="text-xs text-gray-300">{selectedTasks.length}件</span>
        </div>

        {selectedTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">タスクなし</div>
        ) : (
          <div className="space-y-2">
            {selectedTasks.map(task => (
              <TaskItem key={task.id} task={task} onComplete={handleComplete} />
            ))}
          </div>
        )}
      </main>

      {/* 追加ボタン */}
      <button onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-500 text-white rounded-full text-2xl shadow-lg hover:bg-blue-600 flex items-center justify-center z-40">
        +
      </button>

      {showForm && (
        <TaskForm
          onSave={handleAdd}
          onClose={() => setShowForm(false)}
          categories={categories}
          defaultDate={selectedYmd}
        />
      )}
    </div>
  );
}
