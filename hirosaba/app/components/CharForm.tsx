'use client';
import { useState } from 'react';
import { Character, Task, Priority, PRIORITIES, DEFAULT_TASKS } from '../types';

interface Props {
  editing?: Character;
  onSave: (c: Character) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const EMOJI_CHOICES = ['🦸', '🦹', '💥', '🔥', '⚡', '❄️', '🌀', '🛡️', '👊', '🦴', '🍃', '🎯', '🌟', '🩸', '👁️', '🕷️'];

let seq = 0;
const newId = () => `${Date.now()}_${seq++}`;

export default function CharForm({ editing, onSave, onDelete, onClose }: Props) {
  const [name,     setName]     = useState(editing?.name ?? '');
  const [emoji,    setEmoji]    = useState(editing?.emoji ?? '🦸');
  const [rarity,   setRarity]   = useState(editing?.rarity ?? 0);
  const [type,     setType]     = useState(editing?.type ?? '');
  const [quirk,    setQuirk]    = useState(editing?.quirk ?? '');
  const [curLv,    setCurLv]    = useState(editing?.curLv ? String(editing.curLv) : '');
  const [targetLv, setTargetLv] = useState(editing?.targetLv ? String(editing.targetLv) : '');
  const [awaken,   setAwaken]   = useState(editing?.awaken ?? 0);
  const [priority, setPriority] = useState<Priority>(editing?.priority ?? 'active');
  const [memo,     setMemo]     = useState(editing?.memo ?? '');
  const [tasks,    setTasks]    = useState<Task[]>(
    editing?.tasks ?? DEFAULT_TASKS.map(l => ({ id: newId(), label: l, done: false })),
  );
  const [newTask,  setNewTask]  = useState('');

  function toggleTask(id: string) {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }
  function removeTask(id: string) {
    setTasks(ts => ts.filter(t => t.id !== id));
  }
  function addTask() {
    const l = newTask.trim();
    if (!l) return;
    setTasks(ts => [...ts, { id: newId(), label: l, done: false }]);
    setNewTask('');
  }

  function submit() {
    if (!name.trim()) return;
    onSave({
      id:        editing?.id ?? newId(),
      name:      name.trim(),
      emoji:     emoji || '🦸',
      rarity,
      type:      type.trim(),
      quirk:     quirk.trim(),
      curLv:     Math.max(0, parseInt(curLv) || 0),
      targetLv:  Math.max(0, parseInt(targetLv) || 0),
      awaken,
      priority,
      tasks,
      memo:      memo.trim(),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">{editing ? 'キャラを編集' : 'キャラを追加'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* 名前＋アイコン */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">キャラ名 *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="例：緑谷出久"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {EMOJI_CHOICES.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border ${emoji === e ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* レアリティ */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">レアリティ</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button key={n} onClick={() => setRarity(rarity === n ? 0 : n)}
                  className={`text-2xl leading-none ${n <= rarity ? 'text-amber-400' : 'text-gray-200'}`}>★</button>
              ))}
              <span className="text-xs text-gray-400 ml-1">{rarity > 0 ? `★${rarity}` : '未設定'}</span>
            </div>
          </div>

          {/* タイプ・個性 */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">タイプ/属性</label>
              <input value={type} onChange={e => setType(e.target.value)} placeholder="例：アタッカー"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">個性</label>
              <input value={quirk} onChange={e => setQuirk(e.target.value)} placeholder="例：ワン・フォー・オール"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>
          </div>

          {/* レベル・凸 */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">現在Lv</label>
              <input type="number" inputMode="numeric" min={0} value={curLv} onChange={e => setCurLv(e.target.value)}
                placeholder="1"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">目標Lv</label>
              <input type="number" inputMode="numeric" min={0} value={targetLv} onChange={e => setTargetLv(e.target.value)}
                placeholder="80"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>
            <div className="w-24">
              <label className="text-xs font-medium text-gray-600 mb-1 block">凸/覚醒</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setAwaken(Math.max(0, awaken - 1))} className="px-2.5 py-2 text-gray-500">−</button>
                <span className="flex-1 text-center text-sm font-bold">{awaken}</span>
                <button onClick={() => setAwaken(awaken + 1)} className="px-2.5 py-2 text-green-600">＋</button>
              </div>
            </div>
          </div>

          {/* 優先度 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">優先度</label>
            <div className="flex gap-1.5">
              {PRIORITIES.map(p => (
                <button key={p.value} onClick={() => setPriority(p.value)}
                  className={`flex-1 text-xs py-2 rounded-lg font-medium ${priority === p.value ? p.cls : 'bg-gray-100 text-gray-500'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 育成チェックリスト */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">育成チェックリスト</label>
            <div className="space-y-1.5">
              {tasks.map(t => (
                <div key={t.id} className="flex items-center gap-2">
                  <button onClick={() => toggleTask(t.id)}
                    className={`w-5 h-5 rounded shrink-0 flex items-center justify-center text-[11px] border ${t.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                    {t.done ? '✓' : ''}
                  </button>
                  <span className={`text-sm flex-1 ${t.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{t.label}</span>
                  <button onClick={() => removeTask(t.id)} className="text-gray-300 text-xs w-6 h-6 flex items-center justify-center">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input value={newTask} onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && addTask()}
                placeholder="育成項目を追加"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
              <button onClick={addTask} className="px-3 py-1.5 rounded-lg bg-green-100 text-green-600 text-sm font-medium">追加</button>
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">メモ</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2}
              placeholder="ビルド・装備・必要素材など"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none" />
          </div>
        </div>

        <div className="px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] border-t border-gray-100 flex gap-2">
          {onDelete && (
            <button onClick={() => { if (confirm('このキャラを削除しますか？')) onDelete(); }}
              className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium">削除</button>
          )}
          <button onClick={submit} disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-40">
            {editing ? '更新' : '追加'}
          </button>
        </div>
      </div>
    </div>
  );
}
