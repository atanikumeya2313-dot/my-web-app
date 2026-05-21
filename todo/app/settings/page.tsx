'use client';
import { useEffect, useState } from 'react';
import { Task } from '../types';
import { loadTasks, saveTasks } from '../lib/storage';
import TaskForm from '../components/TaskForm';

const DOW = ['日','月','火','水','木','金','土'];

function repeatDetail(task: Task): string {
  if (task.repeat === 'daily')   return '毎日';
  if (task.repeat === 'weekly')  return `毎週${(task.weekdays ?? []).map(d => DOW[d]).join('・')}`;
  if (task.repeat === 'monthly') return `毎月${task.monthDay}日`;
  return '繰り返しなし';
}

export default function Settings() {
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [editing,  setEditing]  = useState<Task | undefined>();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { setTasks(loadTasks()); }, []);

  function handleSave(task: Task) {
    const next = editing
      ? tasks.map(t => t.id === task.id ? task : t)
      : [...tasks, task];
    saveTasks(next);
    setTasks(next);
    setEditing(undefined);
  }

  function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return;
    const next = tasks.filter(t => t.id !== id);
    saveTasks(next);
    setTasks(next);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setShowForm(true);
  }

  function openAdd() {
    setEditing(undefined);
    setShowForm(true);
  }

  const repeating = tasks.filter(t => t.repeat !== 'none');
  const once      = tasks.filter(t => t.repeat === 'none');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-base font-bold text-gray-800">タスク管理</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
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
                    <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                    <p className="text-xs text-blue-400 mt-0.5">{repeatDetail(task)}</p>
                  </div>
                  <button onClick={() => openEdit(task)} className="text-gray-400 hover:text-blue-500 p-1.5 rounded-lg hover:bg-blue-50 transition-colors text-sm">✎</button>
                  <button onClick={() => handleDelete(task.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors text-sm">✕</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 通常タスク（残っているもの） */}
        {once.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-2">通常タスク（未完了）</h2>
            <div className="space-y-1.5">
              {once.map(task => (
                <div key={task.id} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                  </div>
                  <button onClick={() => handleDelete(task.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors text-sm">✕</button>
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
        />
      )}
    </div>
  );
}
