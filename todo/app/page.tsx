'use client';
import { useEffect, useRef, useState } from 'react';
import { Task, CompletedMap, CompletedLogEntry, TimeSlot, UndoAction } from './types';
import {
  loadTasks, saveTasks, loadCompleted, saveCompleted, loadCategories,
  loadCompletedLog, addToLog, saveLog,
  getTodayTasks, getTomorrowTasks, completeOnce, completeRepeat, nextOccurrenceAfter, toYMD,
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

function dateLabel(offset: number) {
  const d = new Date(Date.now() + offset * 86_400_000);
  return `${d.getMonth()+1}月${d.getDate()}日（${DOW[d.getDay()]}）`;
}

function fmtDate(ymd: string): string {
  const d = new Date(ymd);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function defaultTimeSlot(): TimeSlot {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18)           return 'evening';
  return 'anytime';
}

const PRIORITY_STYLE = {
  high:   { label: '高', cls: 'bg-red-100 text-red-600' },
  medium: { label: '中', cls: 'bg-orange-100 text-orange-600' },
  low:    { label: '低', cls: 'bg-blue-100 text-blue-500' },
} as const;

export default function Home() {
  const [tasks,        setTasks]        = useState<Task[]>([]);
  const [completed,    setCompleted]    = useState<CompletedMap>({});
  const [completedLog, setCompletedLog] = useState<CompletedLogEntry[]>([]);
  const [categories,   setCategories]   = useState<string[]>([]);
  const [showForm,     setShowForm]     = useState(false);
  const [editing,      setEditing]      = useState<Task | undefined>();
  const [filterCat,    setFilterCat]    = useState('');
  const [timeFilter,   setTimeFilter]   = useState<TimeSlot>(defaultTimeSlot());
  const [undo,         setUndo]         = useState<UndoAction | null>(null);
  const [viewDate,     setViewDate]     = useState<'today' | 'tomorrow'>('today');
  const [showDone,     setShowDone]     = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTasks(loadTasks());
    setCompleted(loadCompleted());
    setCompletedLog(loadCompletedLog());
    setCategories(loadCategories());
  }, []);

  const todayTasks   = viewDate === 'today'
    ? getTodayTasks(tasks, completed)
    : getTomorrowTasks(tasks, completed);
  const filteredTasks = filterCat === '__other__'
    ? todayTasks.filter(t => !t.category)
    : filterCat
    ? todayTasks.filter(t => t.category === filterCat)
    : todayTasks;
  const slotTasks = filteredTasks.filter(t => (t.timeSlot ?? 'anytime') === timeFilter);

  const today = toYMD(new Date());
  const todayCompleted: CompletedLogEntry[] = completedLog.filter(e => e.date === today);

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
    if (undo.prevLog !== undefined) {
      saveLog(undo.prevLog);
      setCompletedLog(undo.prevLog);
    }
    setUndo(null);
  }

  function handleComplete(id: string) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const prevLog = completedLog;
    const logEntry: CompletedLogEntry = {
      id: task.id,
      title: task.title,
      priority: task.priority,
      category: task.category,
      completedAt: new Date().toISOString(),
      date: today,
    };
    const nextLog = addToLog(logEntry);
    setCompletedLog(nextLog);

    if (task.repeat === 'none') {
      const prev = tasks;
      const next = completeOnce(tasks, id);
      saveTasks(next);
      setTasks(next);
      showUndo({ task, prevTasks: prev, prevLog });
    } else {
      const prev  = completed;
      const next  = completeRepeat(completed, id);
      saveCompleted(next);
      setCompleted(next);
      const nextDate = nextOccurrenceAfter(task, today);
      showUndo({ task, prevCompleted: prev, nextDate: nextDate ?? undefined, prevLog });
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
      const prevTasks     = tasks;
      const prevCompleted = completed;
      const nextCompleted = completeRepeat(completed, id);
      const oneTime: Task = {
        id: crypto.randomUUID(),
        title: task.title,
        repeat: 'none',
        timeSlot: task.timeSlot,
        date: newDate,
        ...(task.category ? { category: task.category } : {}),
        ...(task.priority ? { priority: task.priority } : {}),
        ...(task.memo     ? { memo: task.memo }         : {}),
      };
      const nextTasks = [...tasks, oneTime];
      saveTasks(nextTasks);
      saveCompleted(nextCompleted);
      setTasks(nextTasks);
      setCompleted(nextCompleted);
      showUndo({ task, message: `「${task.title}」を${newDate}に移動`, prevTasks, prevCompleted });
    }
  }

  function handleSave(task: Task) {
    const next = editing
      ? tasks.map(t => t.id === task.id ? task : t)
      : [...tasks, task];
    saveTasks(next);
    setTasks(next);
    setEditing(undefined);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setShowForm(true);
  }

  function openAdd() {
    setEditing(undefined);
    setShowForm(true);
  }

  const activeCategories = [...new Set(todayTasks.map(t => t.category).filter(Boolean))] as string[];
  const hasOther = todayTasks.some(t => !t.category);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-800">
              {viewDate === 'today' ? '今日のタスク' : '明日のタスク'}
            </h1>
            <p className="text-xs text-gray-400">{dateLabel(viewDate === 'today' ? 0 : 1)}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setViewDate('today')}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${viewDate === 'today' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              今日
            </button>
            <button onClick={() => setViewDate('tomorrow')}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${viewDate === 'tomorrow' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              明日
            </button>
          </div>
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

      <main className="max-w-lg mx-auto px-4 py-4 space-y-2">
        {slotTasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">{SECTIONS.find(s => s.slot === timeFilter)?.icon}</p>
            <p className="text-gray-400 text-sm">
              {SECTIONS.find(s => s.slot === timeFilter)?.label}のタスクはありません
            </p>
          </div>
        ) : (
          <>
            {viewDate === 'tomorrow' && (
              <p className="text-xs text-gray-400 text-center pb-1">明日の予定（読み取り専用）</p>
            )}
            {slotTasks.map(task => (
              <TaskItem key={task.id} task={task}
                onComplete={viewDate === 'today' ? handleComplete : undefined}
                onReschedule={viewDate === 'today' ? handleReschedule : undefined}
                onEdit={viewDate === 'today' ? openEdit : undefined} />
            ))}
          </>
        )}

        {/* 完了済みセクション（今日のみ） */}
        {viewDate === 'today' && todayCompleted.length > 0 && (
          <div className="pt-2">
            <button onClick={() => setShowDone(v => !v)}
              className="w-full flex items-center justify-between px-1 py-1.5 text-xs text-gray-400">
              <span>✓ 完了済み（{todayCompleted.length}件）</span>
              <span>{showDone ? '▲' : '▼'}</span>
            </button>
            {showDone && (
              <div className="space-y-1.5 mt-1">
                {todayCompleted.map(entry => {
                  const ps = entry.priority ? PRIORITY_STYLE[entry.priority] : null;
                  return (
                    <div key={entry.id + entry.completedAt}
                      className="bg-white rounded-xl px-4 py-3 shadow-sm opacity-60 flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-600 line-through truncate">{entry.title}</p>
                        <div className="flex gap-1.5 mt-0.5 flex-wrap">
                          {ps && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${ps.cls}`}>{ps.label}</span>}
                          {entry.category && <span className="text-[10px] bg-blue-50 text-blue-400 px-1.5 py-0.5 rounded-full">{entry.category}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <button onClick={openAdd}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-500 text-white rounded-full text-2xl shadow-lg hover:bg-blue-600 flex items-center justify-center z-40">
        +
      </button>

      {showForm && (
        <TaskForm
          editing={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(undefined); }}
          categories={categories}
        />
      )}

      {undo && (
        <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto bg-gray-800 text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-lg z-50">
          <div className="min-w-0 mr-3">
            <p className="text-sm truncate">{undo.message ?? `「${undo.task.title}」を完了`}</p>
            {undo.nextDate && (
              <p className="text-xs text-blue-300 mt-0.5">次回: {fmtDate(undo.nextDate)}</p>
            )}
          </div>
          <button onClick={handleUndo}
            className="shrink-0 text-sm font-medium text-blue-300 hover:text-blue-200">
            元に戻す
          </button>
        </div>
      )}
    </div>
  );
}
