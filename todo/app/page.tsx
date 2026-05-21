'use client';
import { useEffect, useState } from 'react';
import { Task, CompletedMap } from './types';
import {
  loadTasks, saveTasks, loadCompleted, saveCompleted,
  getTodayTasks, completeOnce, completeRepeat,
} from './lib/storage';
import TaskItem from './components/TaskItem';
import TaskForm from './components/TaskForm';

const DOW = ['日','月','火','水','木','金','土'];

function todayLabel() {
  const d = new Date();
  return `${d.getMonth()+1}月${d.getDate()}日（${DOW[d.getDay()]}）`;
}

export default function Home() {
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [completed, setCompleted] = useState<CompletedMap>({});
  const [showForm,  setShowForm]  = useState(false);

  useEffect(() => {
    setTasks(loadTasks());
    setCompleted(loadCompleted());
  }, []);

  const todayTasks = getTodayTasks(tasks, completed);

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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-800">今日のタスク</h1>
            <p className="text-xs text-gray-400">{todayLabel()}</p>
          </div>
          <span className="text-xs text-gray-400">{todayTasks.length}件</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-2">
        {todayTasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">✓</p>
            <p className="text-gray-400 text-sm">今日のタスクはすべて完了です</p>
          </div>
        ) : (
          todayTasks.map(task => (
            <TaskItem key={task.id} task={task} onComplete={handleComplete} />
          ))
        )}
      </main>

      {/* 追加ボタン */}
      <button onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-500 text-white rounded-full text-2xl shadow-lg hover:bg-blue-600 flex items-center justify-center z-40">
        +
      </button>

      {showForm && (
        <TaskForm onSave={handleAdd} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
