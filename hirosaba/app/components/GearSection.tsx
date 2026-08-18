'use client';
import { useEffect, useRef, useState } from 'react';
import { Gear, GearKind, GEAR_CONFIG, Priority, PRIORITIES, priorityMeta, progressPct } from '../types';
import { loadGear, saveGear } from '../lib/storage';

type Filter = 'all' | Priority;
type SortKey = 'priority' | 'rarity' | 'grade' | 'progress' | 'name';
const PRIORITY_ORDER: Record<Priority, number> = { top: 0, active: 1, later: 2, done: 3 };
let seq = 0;
const newId = () => `${Date.now()}_${seq++}`;

export default function GearSection({ kind }: { kind: GearKind }) {
  const cfg = GEAR_CONFIG[kind];
  const [list, setList] = useState<Gear[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Gear | undefined>();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setList(loadGear(kind)); }, [kind]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function persist(next: Gear[]) { setList(next); saveGear(kind, next); }

  function toggleTask(gid: string, tid: string) {
    persist(list.map(g => g.id !== gid ? g
      : { ...g, tasks: g.tasks.map(t => t.id === tid ? { ...t, done: !t.done } : t) }));
  }

  const counts = {
    top:    list.filter(g => g.priority === 'top').length,
    active: list.filter(g => g.priority === 'active').length,
    done:   list.filter(g => g.priority === 'done').length,
  };
  const filtered = list.filter(g => filter === 'all' ? true : g.priority === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'rarity')   return b.rarity - a.rarity;
    if (sortKey === 'grade')    return b.grade - a.grade;
    if (sortKey === 'progress') return progressPct(b) - progressPct(a);
    if (sortKey === 'name')     return a.name.localeCompare(b.name, 'ja');
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });

  return (
    <div>
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <section className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-sm p-4 text-white">
          <div className="flex items-center justify-around text-center">
            <div><p className="text-[11px] text-white/70">最優先</p><p className="text-2xl font-bold">{counts.top}</p></div>
            <div className="w-px h-10 bg-white/20" />
            <div><p className="text-[11px] text-white/70">育成中</p><p className="text-2xl font-bold">{counts.active}</p></div>
            <div className="w-px h-10 bg-white/20" />
            <div><p className="text-[11px] text-white/70">完成</p><p className="text-2xl font-bold">{counts.done}</p></div>
          </div>
          <p className="text-center text-[11px] text-white/60 mt-2">{cfg.title} {list.length}件</p>
        </section>

        {list.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1 overflow-x-auto">
              <button onClick={() => setFilter('all')}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium ${filter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>すべて</button>
              {PRIORITIES.map(p => (
                <button key={p.value} onClick={() => setFilter(p.value)}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium ${filter === p.value ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{p.label}</button>
              ))}
            </div>
            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
              className="ml-auto border border-gray-200 rounded-xl px-2 py-1.5 text-xs bg-white text-gray-600 shrink-0">
              <option value="priority">優先度順</option>
              <option value="rarity">レア順</option>
              <option value="grade">{cfg.gradeLabel}順</option>
              <option value="progress">進捗順</option>
              <option value="name">名前順</option>
            </select>
          </div>
        )}

        {list.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">{cfg.emoji}</p>
            <p className="text-gray-400 text-sm">右下の＋から、育成したい{cfg.title}を登録しましょう</p>
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">該当する{cfg.title}がありません</p>
        ) : (
          <div className="space-y-2">
            {sorted.map(g => {
              const pm = priorityMeta(g.priority);
              const pct = progressPct(g);
              const doneTasks = g.tasks.filter(t => t.done).length;
              return (
                <div key={g.id} className="bg-white rounded-xl shadow-sm p-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setEditing(g); setShowForm(true); }} className="text-2xl shrink-0">{g.emoji}</button>
                    <button onClick={() => { setEditing(g); setShowForm(true); }} className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${pm.cls}`}>{pm.label}</span>
                        <p className="text-sm font-semibold text-gray-800 truncate">{g.name}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {g.rarity > 0 && <span className="text-amber-400">{'★'.repeat(g.rarity)}</span>}
                        {g.sub && <span> {g.sub}</span>}
                        {g.level > 0 && <span>　Lv{g.level}</span>}
                        {g.grade > 0 && <span>　{cfg.gradeLabel}{g.grade}</span>}
                      </p>
                    </button>
                  </div>

                  {g.tasks.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct === 100 ? 'bg-blue-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{doneTasks}/{g.tasks.length}・{pct}%</span>
                    </div>
                  )}
                  {g.tasks.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {g.tasks.map(t => (
                        <button key={t.id} onClick={() => toggleTask(g.id, t.id)}
                          className={`text-[11px] px-2 py-1 rounded-full border ${t.done ? 'bg-green-50 border-green-200 text-green-600 line-through' : 'bg-white border-gray-200 text-gray-500'}`}>
                          {t.done ? '✓ ' : ''}{t.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {g.effect && <p className="text-[11px] text-gray-500 mt-2">✨ {g.effect}</p>}
                  {g.memo && <p className="text-[11px] text-gray-400 mt-1">📝 {g.memo}</p>}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <button onClick={() => { setEditing(undefined); setShowForm(true); }} aria-label={`${cfg.title}を追加`}
        style={{ bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
        className="fixed right-4 w-14 h-14 bg-green-600 text-white rounded-full text-2xl shadow-lg active:scale-90 transition-transform flex items-center justify-center z-40">
        ＋
      </button>

      {showForm && (
        <GearForm kind={kind} editing={editing}
          onSave={g => {
            const exists = list.some(x => x.id === g.id);
            persist(exists ? list.map(x => x.id === g.id ? g : x) : [g, ...list]);
            setShowForm(false); setEditing(undefined);
          }}
          onDelete={editing ? () => { persist(list.filter(x => x.id !== editing.id)); setShowForm(false); setEditing(undefined); } : undefined}
          onClose={() => { setShowForm(false); setEditing(undefined); }} />
      )}
    </div>
  );
}

// ── 登録・編集フォーム ──
function GearForm({ kind, editing, onSave, onDelete, onClose }: {
  kind: GearKind;
  editing?: Gear;
  onSave: (g: Gear) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const cfg = GEAR_CONFIG[kind];
  const [name,   setName]   = useState(editing?.name ?? '');
  const [emoji,  setEmoji]  = useState(editing?.emoji ?? cfg.emojiChoices[0]);
  const [rarity, setRarity] = useState(editing?.rarity ?? 0);
  const [sub,    setSub]    = useState(editing?.sub ?? '');
  const [level,  setLevel]  = useState(editing?.level ? String(editing.level) : '');
  const [grade,  setGrade]  = useState(editing?.grade ?? 0);
  const [effect, setEffect] = useState(editing?.effect ?? '');
  const [priority, setPriority] = useState<Priority>(editing?.priority ?? 'active');
  const [memo,   setMemo]   = useState(editing?.memo ?? '');
  const [tasks,  setTasks]  = useState(editing?.tasks ?? cfg.defaultTasks.map(l => ({ id: newId(), label: l, done: false })));
  const [newTask, setNewTask] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  function addTask() {
    const l = newTask.trim(); if (!l) return;
    setTasks(ts => [...ts, { id: newId(), label: l, done: false }]);
    setNewTask('');
  }

  function submit() {
    if (!name.trim()) return;
    onSave({
      id: editing?.id ?? newId(),
      name: name.trim(), emoji: emoji || cfg.emojiChoices[0], rarity,
      level: Math.max(0, parseInt(level) || 0), grade,
      sub: sub.trim(), effect: effect.trim(), priority, tasks, memo: memo.trim(),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">{editing ? `${cfg.title}を編集` : `${cfg.title}を追加`}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{cfg.title}名 *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {cfg.emojiChoices.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border ${emoji === e ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>{e}</button>
              ))}
            </div>
          </div>

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

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{cfg.subLabel}</label>
            <input value={sub} onChange={e => setSub(e.target.value)} placeholder={cfg.subPlaceholder}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">レベル</label>
              <input type="number" inputMode="numeric" min={0} value={level} onChange={e => setLevel(e.target.value)} placeholder="1"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>
            <div className="w-32">
              <label className="text-xs font-medium text-gray-600 mb-1 block">{cfg.gradeLabel}</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setGrade(Math.max(0, grade - 1))} className="px-2.5 py-2 text-gray-500">−</button>
                <span className="flex-1 text-center text-sm font-bold">{grade}</span>
                <button onClick={() => setGrade(grade + 1)} className="px-2.5 py-2 text-green-600">＋</button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">強化効果（メモ）</label>
            <input value={effect} onChange={e => setEffect(e.target.value)} placeholder="例：攻撃力+15% / スキル威力UP"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">優先度</label>
            <div className="flex gap-1.5">
              {PRIORITIES.map(p => (
                <button key={p.value} onClick={() => setPriority(p.value)}
                  className={`flex-1 text-xs py-2 rounded-lg font-medium ${priority === p.value ? p.cls : 'bg-gray-100 text-gray-500'}`}>{p.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">育成チェックリスト</label>
            <div className="space-y-1.5">
              {tasks.map(t => (
                <div key={t.id} className="flex items-center gap-2">
                  <button onClick={() => setTasks(ts => ts.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}
                    className={`w-5 h-5 rounded shrink-0 flex items-center justify-center text-[11px] border ${t.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                    {t.done ? '✓' : ''}
                  </button>
                  <span className={`text-sm flex-1 ${t.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{t.label}</span>
                  <button onClick={() => setTasks(ts => ts.filter(x => x.id !== t.id))} className="text-gray-300 text-xs w-6 h-6 flex items-center justify-center">✕</button>
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

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">メモ</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none" />
          </div>
        </div>

        <div className="px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] border-t border-gray-100 flex gap-2">
          {onDelete && (
            <button onClick={() => { if (confirm('削除しますか？')) onDelete(); }}
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
