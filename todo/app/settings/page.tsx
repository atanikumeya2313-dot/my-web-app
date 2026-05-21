'use client';
import { useEffect, useState } from 'react';
import { Task, TimeSlot } from '../types';
import { loadTasks, saveTasks, loadCategories, saveCategories } from '../lib/storage';
import TaskForm from '../components/TaskForm';

const DOW = ['日','月','火','水','木','金','土'];

const SLOT_LABEL: Record<TimeSlot, string> = {
  morning: '🌅 朝', afternoon: '☀️ 昼', evening: '🌙 夜', anytime: '📋 その日',
};

function repeatDetail(task: Task): string {
  if (task.repeat === 'daily')    return '毎日';
  if (task.repeat === 'weekly')   return `毎週${(task.weekdays ?? []).map(d => DOW[d]).join('・')}`;
  if (task.repeat === 'monthly')  return `毎月${task.monthDay}日`;
  if (task.repeat === 'interval') return `${task.intervalDays}日ごと`;
  return '繰り返しなし';
}

export default function Settings() {
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [editing,    setEditing]    = useState<Task | undefined>();
  const [showForm,   setShowForm]   = useState(false);
  const [newCat,     setNewCat]     = useState('');

  useEffect(() => {
    setTasks(loadTasks());
    setCategories(loadCategories());
  }, []);

  function handleSave(task: Task) {
    const next = editing
      ? tasks.map(t => t.id === task.id ? task : t)
      : [...tasks, task];
    saveTasks(next);
    setTasks(next);
    setEditing(undefined);
  }

  function handleDeleteTask(id: string) {
    if (!confirm('削除しますか？')) return;
    const next = tasks.filter(t => t.id !== id);
    saveTasks(next);
    setTasks(next);
  }

  function addCategory() {
    const cat = newCat.trim();
    if (!cat || categories.includes(cat)) return;
    const next = [...categories, cat];
    saveCategories(next);
    setCategories(next);
    setNewCat('');
  }

  function deleteCategory(cat: string) {
    if (!confirm(`「${cat}」を削除しますか？`)) return;
    const next = categories.filter(c => c !== cat);
    saveCategories(next);
    setCategories(next);
  }

  function openEdit(task: Task) { setEditing(task); setShowForm(true); }
  function openAdd()             { setEditing(undefined); setShowForm(true); }

  const repeating = tasks.filter(t => t.repeat !== 'none');
  const once      = tasks.filter(t => t.repeat === 'none');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-base font-bold text-gray-800">設定</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-5">

        {/* カテゴリ管理 */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">カテゴリ管理</h2>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {categories.map(cat => (
              <div key={cat} className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-xs font-medium">
                <span>{cat}</span>
                <button onClick={() => deleteCategory(cat)} className="text-blue-300 hover:text-red-400 transition-colors ml-0.5">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCategory()}
              placeholder="新しいカテゴリ名"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button onClick={addCategory} disabled={!newCat.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-40">
              追加
            </button>
          </div>
        </section>

        {/* 繰り返しタスク */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 mb-2">繰り返しタスク</h2>
          {repeating.length === 0 ? (
            <p className="text-xs text-gray-400 py-3 text-center">まだありません</p>
          ) : (
            <div className="space-y-1.5">
              {repeating.map(task => (
                <div key={task.id} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                      {task.category && (
                        <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full">{task.category}</span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-xs text-blue-400">{repeatDetail(task)}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{SLOT_LABEL[task.timeSlot ?? 'anytime']}</span>
                    </div>
                  </div>
                  <button onClick={() => openEdit(task)} className="text-gray-400 hover:text-blue-500 p-1.5 rounded-lg hover:bg-blue-50 transition-colors text-sm">✎</button>
                  <button onClick={() => handleDeleteTask(task.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors text-sm">✕</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 通常タスク */}
        {once.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-2">通常タスク（未完了）</h2>
            <div className="space-y-1.5">
              {once.map(task => (
                <div key={task.id} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                      {task.category && (
                        <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full">{task.category}</span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-0.5">
                      {task.date && <span className="text-xs text-gray-400">{task.date}</span>}
                      <span className="text-xs text-gray-400">{SLOT_LABEL[task.timeSlot ?? 'anytime']}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteTask(task.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors text-sm">✕</button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <button onClick={openAdd}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-500 text-white rounded-full text-2xl shadow-lg hover:bg-blue-600 flex items-center justify-center z-40">
        +
      </button>

      {showForm && (
        <TaskForm
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(undefined); }}
          editing={editing}
          categories={categories}
        />
      )}
    </div>
  );
}
