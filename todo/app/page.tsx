"use client";

import { useState, useEffect, useRef } from "react";

type Priority = "high" | "medium" | "low";
type Filter = "all" | "active" | "completed";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  dueDate: string;
  createdAt: string;
}

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

const PRIORITY_BORDER: Record<Priority, string> = {
  high: "border-l-red-400",
  medium: "border-l-yellow-400",
  low: "border-l-green-400",
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("todos");
    if (saved) {
      try {
        setTodos(JSON.parse(saved));
      } catch {
        // 壊れたデータは無視
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  function addTodo() {
    const text = inputText.trim();
    if (!text) return;
    setTodos((prev) => [
      {
        id: generateId(),
        text,
        completed: false,
        priority,
        dueDate,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setInputText("");
    setDueDate("");
    setPriority("medium");
    inputRef.current?.focus();
  }

  function toggleTodo(id: string) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const willComplete = !todo.completed;
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: willComplete } : t))
    );
    // 完了にしたとき、フィルターで消える前に一瞬見せる
    if (willComplete && filter === "active") {
      setFadingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setFadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 600);
    }
    // 未完了に戻したとき、completedフィルターからも同様に
    if (!willComplete && filter === "completed") {
      setFadingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setFadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 600);
    }
  }

  function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function startEdit(todo: Todo) {
    setEditingId(todo.id);
    setEditText(todo.text);
  }

  function commitEdit(id: string) {
    const text = editText.trim();
    if (text) {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, text } : t))
      );
    }
    setEditingId(null);
  }

  function clearCompleted() {
    setTodos((prev) => prev.filter((t) => !t.completed));
  }

  const filtered = todos.filter((t) => {
    if (fadingIds.has(t.id)) return true; // フェード中は残す
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;

  function isOverdue(todo: Todo) {
    if (!todo.dueDate || todo.completed) return false;
    return new Date(todo.dueDate) < new Date(new Date().toDateString());
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-700 tracking-tight">
            📝 TODO
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {activeCount} 件残り / 合計 {todos.length} 件
          </p>
        </div>

        {/* 入力エリア */}
        <div className="bg-white rounded-2xl shadow-md p-5 mb-6">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="新しいタスクを入力..."
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-3"
          />
          <div className="flex gap-3 items-center flex-wrap">
            {/* 優先度 */}
            <div className="flex gap-1">
              {(["high", "medium", "low"] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    priority === p
                      ? PRIORITY_COLOR[p] + " ring-2 ring-offset-1 ring-current"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
            {/* 期限 */}
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {/* 追加ボタン */}
            <button
              onClick={addTodo}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded-lg font-medium text-sm transition-colors"
            >
              追加
            </button>
          </div>
        </div>

        {/* フィルター */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {([["all", "すべて"], ["active", "未完了"], ["completed", "完了"]] as [Filter, string][]).map(
            ([f, label]) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 hover:bg-indigo-50"
                }`}
              >
                {label}
              </button>
            )
          )}
          {completedCount > 0 && (
            <button
              onClick={clearCompleted}
              className="ml-auto px-4 py-1.5 rounded-full text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              完了を削除
            </button>
          )}
        </div>

        {/* TODOリスト */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center text-gray-400 py-12">
              {filter === "completed" ? "完了したタスクはありません" : "タスクがありません"}
            </div>
          )}
          {filtered.map((todo) => (
            <div
              key={todo.id}
              className={`bg-white rounded-xl shadow-sm border-l-4 px-4 py-3 flex items-start gap-3 transition-all duration-500 ${
                PRIORITY_BORDER[todo.priority]
              } ${todo.completed ? "opacity-60" : ""} ${fadingIds.has(todo.id) ? "opacity-0 scale-95" : ""}`}
            >
              {/* チェックボックス */}
              <button
                onClick={() => toggleTodo(todo.id)}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  todo.completed
                    ? "bg-indigo-500 border-indigo-500"
                    : "border-gray-300 hover:border-indigo-400"
                }`}
              >
                {todo.completed && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* テキスト */}
              <div className="flex-1 min-w-0">
                {editingId === todo.id ? (
                  <input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => commitEdit(todo.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit(todo.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full border-b border-indigo-400 focus:outline-none text-gray-800 bg-transparent"
                  />
                ) : (
                  <span
                    onDoubleClick={() => startEdit(todo)}
                    className={`block text-gray-800 cursor-pointer break-words ${
                      todo.completed ? "line-through text-gray-400" : ""
                    }`}
                  >
                    {todo.text}
                  </span>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[todo.priority]}`}>
                    {PRIORITY_LABEL[todo.priority]}
                  </span>
                  {todo.dueDate && (
                    <span className={`text-xs ${isOverdue(todo) ? "text-red-500 font-medium" : "text-gray-400"}`}>
                      {isOverdue(todo) ? "⚠ " : ""}期限: {todo.dueDate}
                    </span>
                  )}
                </div>
              </div>

              {/* アクション */}
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(todo)}
                  className="p-1.5 text-gray-400 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 transition-colors"
                  title="編集"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  title="削除"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* フッター */}
        {todos.length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-6">
            データはブラウザに自動保存されます
          </p>
        )}
      </div>
    </div>
  );
}
