'use client';
import { useEffect, useState } from 'react';
import { Task, CompletedMap, TimeSlot } from './types';
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

export default function Home() {
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [completed,  setCompleted]  = useState<CompletedMap>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [showForm,   setShowForm]   = useState(false);
  const [filterCat,  setFilterCat]  = useState('');

  useEffect(() => {
    setTasks(loadTasks());
    setCompleted(loadCompleted());
    setCategories(loadCategories());
  }, []);

  const todayTasks   = getTodayTasks(tasks, completed);
  const filteredTasks = filterCat
    ? todayTasks.filter(t => t.category === filterCat)
    : todayTasks;

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

  // 今日のタスクに含まれるカテゴリだけ表示
  const activeCategories = [...new Set(todayTasks.map(t => t.category).filter(Boolean))] as string[];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-800">今日のタスク</h1>
            <p className="text-xs text-gray-400">{todayLabel()}</p>
          </div>
          <span className="text-xs text-gray-400">{filteredTasks.length}件</span>
        </div>

        {/* カテゴリフィルター */}
        {activeCategories.length > 0 && (
          <div className="max-w-lg mx-auto px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
            <button onClick={() => setFilterCat('')}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${!filterCat ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              すべて
            </button>
            {activeCategories.map(cat => (
              <button key={cat} onClick={() => setFilterCat(cat === filterCat ? '' : cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterCat === cat ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {cat}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-5">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">✓</p>
            <p className="text-gray-400 text-sm">
              {filterCat ? `「${filterCat}」のタスクはありません` : '今日のタスクはすべて完了です'}
            </p>
          </div>
        ) : (
          SECTIONS.map(({ slot, label, icon }) => {
            const sectionTasks = filteredTasks.filter(t => (t.timeSlot ?? 'anytime') === slot);
            if (sectionTasks.length === 0) return null;
            return (
              <section key={slot}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base">{icon}</span>
                  <h2 className="text-xs font-semibold text-gray-500">{label}</h2>
                  <span className="text-xs text-gray-300">{sectionTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {sectionTasks.map(task => (
                    <TaskItem key={task.id} task={task} onComplete={handleComplete} />
                  ))}
                </div>
              </section>
            );
          })
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
    </div>
  );
}
