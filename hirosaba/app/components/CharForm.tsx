'use client';
import { useState } from 'react';
import { Character, Task, Priority, Rarity, RARITIES, RARITY_CLS, PRIORITIES, DEFAULT_TASKS } from '../types';

interface Props {
  editing?: Character;
  groups: string[];              // 既存キャラで使われているグループ（候補チップ用）
  onSave: (c: Character) => void;
  onDelete?: () => void;
  onClose: () => void;
}

let seq = 0;
const newId = () => `${Date.now()}_${seq++}`;

export default function CharForm({ editing, groups, onSave, onDelete, onClose }: Props) {
  const [name,     setName]     = useState(editing?.name ?? '');
  const [title,    setTitle]    = useState(editing?.title ?? '');
  const [rarity,   setRarity]   = useState<Rarity>(editing?.rarity ?? 'R');
  const [group,    setGroup]    = useState(editing?.group ?? '');
  const [intimacy, setIntimacy] = useState(editing?.intimacy ? String(editing.intimacy) : '');
  const [level,    setLevel]    = useState(editing?.level ? String(editing.level) : '');
  const [levelMax, setLevelMax] = useState(editing?.levelMax ? String(editing.levelMax) : '');
  const [atk,      setAtk]      = useState(editing?.atk ? String(editing.atk) : '');
  const [hp,       setHp]       = useState(editing?.hp ? String(editing.hp) : '');
  const [power,    setPower]    = useState(editing?.power ? String(editing.power) : '');
  const [priority, setPriority] = useState<Priority>(editing?.priority ?? 'active');
  const [memo,     setMemo]     = useState(editing?.memo ?? '');
  const [tasks,    setTasks]    = useState<Task[]>(
    editing?.tasks ?? DEFAULT_TASKS.map(l => ({ id: newId(), label: l, done: false })),
  );
  const [newTask,  setNewTask]  = useState('');

  function toggleTask(id: string) { setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t)); }
  function removeTask(id: string) { setTasks(ts => ts.filter(t => t.id !== id)); }
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
      title:     title.trim(),
      rarity,
      group:     group.trim(),
      intimacy:  Math.max(0, parseInt(intimacy) || 0),
      level:     Math.max(0, parseInt(level) || 0),
      levelMax:  Math.max(0, parseInt(levelMax) || 0),
      atk:       Math.max(0, parseInt(atk.replace(/,/g, '')) || 0),
      hp:        Math.max(0, parseInt(hp.replace(/,/g, '')) || 0),
      power:     Math.max(0, parseInt(power.replace(/,/g, '')) || 0),
      priority,
      tasks,
      memo:      memo.trim(),
      emoji:     '',
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
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">キャラ名 *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="例：緑谷出久"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">二つ名（省略可）</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="例：見出した力の形"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>

          {/* レアリティ */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">レアリティ</label>
            <div className="flex gap-1.5">
              {RARITIES.map(r => (
                <button key={r} onClick={() => setRarity(r)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold ${rarity === r ? RARITY_CLS[r] + ' ring-2 ring-offset-1 ring-slate-400' : 'bg-gray-100 text-gray-400'}`}>{r}</button>
              ))}
            </div>
          </div>

          {/* グループ */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">グループ</label>
            <input value={group} onChange={e => setGroup(e.target.value)} placeholder="例：雄英1年A組 / 敵〈ヴィラン〉連合"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            {groups.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {groups.map(g => (
                  <button key={g} onClick={() => setGroup(g)}
                    className={`text-[11px] px-2 py-1 rounded-full border ${group === g ? 'border-slate-500 bg-slate-50 text-slate-600' : 'border-gray-200 text-gray-500'}`}>
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* レベル（現在/上限）・親密度 */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">レベル</label>
              <input type="number" inputMode="numeric" min={0} value={level} onChange={e => setLevel(e.target.value)}
                placeholder="50"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">レベル上限</label>
              <input type="number" inputMode="numeric" min={0} value={levelMax} onChange={e => setLevelMax(e.target.value)}
                placeholder="80"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">親密度</label>
              <input type="number" inputMode="numeric" min={0} value={intimacy} onChange={e => setIntimacy(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
          </div>

          {/* 攻撃力・HP・戦闘力 */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">攻撃力</label>
              <input type="number" inputMode="numeric" min={0} value={atk} onChange={e => setAtk(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">HP</label>
              <input type="number" inputMode="numeric" min={0} value={hp} onChange={e => setHp(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">戦闘力</label>
              <input type="number" inputMode="numeric" min={0} value={power} onChange={e => setPower(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
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
                    className={`w-5 h-5 rounded shrink-0 flex items-center justify-center text-[11px] border ${t.done ? 'bg-slate-500 border-slate-500 text-white' : 'border-gray-300'}`}>
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
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              <button onClick={addTask} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium">追加</button>
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">メモ</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2}
              placeholder="ビルド・装備・必要素材など"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none" />
          </div>
        </div>

        <div className="px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] border-t border-gray-100 flex gap-2">
          {onDelete && (
            <button onClick={() => { if (confirm('このキャラを削除しますか？')) onDelete(); }}
              className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium">削除</button>
          )}
          <button onClick={submit} disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-slate-600 text-white text-sm font-bold disabled:opacity-40">
            {editing ? '更新' : '追加'}
          </button>
        </div>
      </div>
    </div>
  );
}
