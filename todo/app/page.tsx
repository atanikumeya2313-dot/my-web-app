'use client';
import { useEffect, useRef, useState } from 'react';
import { Task, CompletedMap, TimeSlot, UndoAction } from './types';
import {
  loadTasks, saveTasks, loadCompleted, saveCompleted, loadCategories,
  getTodayTasks, completeOnce, completeRepeat,
} from './lib/storage';
import TaskItem from './components/TaskItem';
import TaskForm from './components/TaskForm';

const DOW = ['日','月','火','水','木','金','土'];

const SECTIONS: { slot: TimeSlot; label: string; icon: string }[] = [
  { slot: 'morning',   label: '朝',    icon: '🌅' },
  { slot: 'afternoon', label: '昼',    icon: '☀️' },
  { slot: 'evening',   label: '夜',    icon: '🌙' },
  { slot: 'anytime',   label: 'その日', icon: '📋' },
];

function todayLabel() {
  const d = new Date();
  return `${d.getMonth()+1}月${d.getDate()}日（${DOW[d.getDay()]}）`;
}

function defaultTimeSlot(): TimeSlot {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18)           return 'evening';
  return 'anytime';
}

export default function Home() {
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [completed,  setCompleted]  = useState<CompletedMap>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [showForm,   setShowForm]   = useState(false);
  const [filterCat,  setFilterCat]  = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeSlot>(defaultTimeSlot());
  const [undo,       setUndo]       = useState<UndoAction | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTasks(loadTasks());
    setCompleted(loadCompleted());
    setCategories(loadCategories());
  }, []);

  const todayTasks   = getTodayTasks(tasks, completed);
  const filteredTasks = filterCat === '__other__'
    ? todayTasks.filter(t => !t.category)
    : filterCat
    ? todayTasks.filter(t => t.category === filterCat)
    : todayTasks;
  const slotTasks = filteredTasks.filter(t => (t.timeSlot ?? 'anytime') === timeFilter);

  function showUndo(action: UndoAction) {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo(action);
    undoTimer.current = setTimeout(() => setUndo(null), 5000);
  }

  function handleUndo() {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (undo.prevTasks !== undefined) {
      saveTasks(undo.prevTasks);
      setTasks(undo.prevTasks);
    }
    if (undo.prevCompleted !== undefined) {
      saveCompleted(undo.prevCompleted);
      setCompleted(undo.prevCompleted);
    }
    setUndo(null);
  }

  function handleComplete(id: string) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    if (task.repeat === 'none') {
      const prev = tasks;
      const next = completeOnce(tasks, id);
      saveTasks(next);
      setTasks(next);
      showUndo({ task, prevTasks: prev });
    } else {
      const prev = completed;
      const next = completeRepeat(completed, id);
      saveCompleted(next);
      setCompleted(next);
      showUndo({ task, prevCompleted: prev });
    }
  }

  function handleReschedule(id: string, newDate?: string) {
    const task = tasks.find(t => t.id === id);
    if (!task || !newDate) return;
    if (task.repeat === 'none') {
      const prevTasks = tasks;
      const nextTasks = tasks.map(t => t.id === id ? { ...t, date: newDate } : t);
      saveTasks(nextTasks);
      setTasks(nextTasks);
      showUndo({ task, message: `「${task.title}」を${newDate}に変更`, prevTasks });
    } else {
      const prevTasks    = tasks;
      const prevCompleted = completed;
      const nextCompleted = completeRepeat(completed, id);
      const oneTime: Task = {
        id: crypto.randomUUID(),
        title: task.title,
        repeat: 'none',
        timeSlot: task.timeSlot,
        date: newDate,
        ...(task.category ? { category: task.category } : {}),
      };
      const nextTasks = [...tasks, oneTime];
      saveTasks(nextTasks);
      saveCompleted(nextCompleted);
      setTasks(nextTasks);
      setCompleted(nextCompleted);
      showUndo({ task, message: `「${task.title}」を${newDate}に移動`, prevTasks, prevCompleted });
    }
  }

  function handleAdd(task: Task) {
    const next = [...tasks, task];
    saveTasks(next);
    setTasks(next);
  }

  const activeCategories = [...new Set(todayTasks.map(t => t.category).filter(Boolean))] as string[];
  const hasOther = todayTasks.some(t => !t.category);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-800">今日のタスク</h1>
            <p className="text-xs text-gray-400">{todayLabel()}</p>
          </div>
          <span className="text-xs text-gray-400">{slotTasks.length}件</span>
        </div>

        {/* カテゴリフィルター */}
        {activeCategories.length > 0 && (
          <div className="max-w-lg mx-auto px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {activeCategories.map(cat => (
              <button key={cat} onClick={() => setFilterCat(cat === filterCat ? '' : cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterCat === cat ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {cat}
              </button>
            ))}
            {hasOther && (
              <button onClick={() => setFilterCat(filterCat === '__other__' ? '' : '__other__')}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterCat === '__other__' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                その他
              </button>
            )}
          </div>
        )}

        {/* 時間帯タブ */}
        <div className="max-w-lg mx-auto flex border-t border-gray-100">
          {SECTIONS.map(({ slot, label, icon }) => {
            const count  = filteredTasks.filter(t => (t.timeSlot ?? 'anytime') === slot).length;
            const active = timeFilter === slot;
            return (
              <button key={slot} onClick={() => setTimeFilter(slot)}
                className={`relative flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors
                  ${active ? 'text-blue-500' : 'text-gray-400'}`}>
                <span className="text-base leading-none">{icon}</span>
                <span className="text-[11px] font-medium">{label}</span>
                <span className={`text-[10px] ${active ? 'text-blue-400' : 'text-gray-300'}`}>
                  {count}
                </span>
                {active && <span className="absolute bottom-0 inset-x-3 h-0.5 bg-blue-500 rounded-full" />}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {slotTasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">{SECTIONS.find(s => s.slot === timeFilter)?.icon}</p>
            <p className="text-gray-400 text-sm">
              {SECTIONS.find(s => s.slot === timeFilter)?.label}のタスクはありません
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {slotTasks.map(task => (
              <TaskItem key={task.id} task={task} onComplete={handleComplete} onReschedule={handleReschedule} />
            ))}
          </div>
        )}
      </main>

      <button onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-500 text-white rounded-full text-2xl shadow-lg hover:bg-blue-600 flex items-center justify-center z-40">
        +
      </button>

      {showForm && (
        <TaskForm
          onSave={handleAdd}
          onClose={() => setShowForm(false)}
          categories={categories}
        />
      )}

      {undo && (
        <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto bg-gray-800 text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-lg z-50">
          <span className="text-sm truncate mr-3">{undo.message ?? `「${undo.task.title}」を完了`}</span>
          <button onClick={handleUndo}
            className="shrink-0 text-sm font-medium text-blue-300 hover:text-blue-200">
            元に戻す
          </button>
        </div>
      )}
    </div>
  );
}
