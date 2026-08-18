'use client';
import { useEffect, useState } from 'react';
import {
  Collection, CollectionRarity, CollStat, COLLECTION_RARITIES, COLL_RARITY_CLS,
  COLLECTION_EVOLUTION_MAX, COLL_STAT_TYPES,
  Priority, PRIORITIES, priorityMeta, progressPct,
} from '../types';
import { loadCollections, saveCollections } from '../lib/storage';

type Filter = 'all' | Priority;
type SortKey = 'priority' | 'rarity' | 'evolution' | 'progress' | 'name';
const PRIORITY_ORDER: Record<Priority, number> = { top: 0, active: 1, later: 2, done: 3 };
const RARITY_ORDER: Record<CollectionRarity, number> = { LR: 0, UR: 1, SR: 2, R: 3 };
let seq = 0;
const newId = () => `${Date.now()}_${seq++}`;

export default function CollectionSection() {
  const [list, setList] = useState<Collection[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Collection | undefined>();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setList(loadCollections()); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function persist(next: Collection[]) { setList(next); saveCollections(next); }
  function toggleTask(cid: string, tid: string) {
    persist(list.map(c => c.id !== cid ? c
      : { ...c, tasks: c.tasks.map(t => t.id === tid ? { ...t, done: !t.done } : t) }));
  }

  const counts = {
    top:    list.filter(c => c.priority === 'top').length,
    active: list.filter(c => c.priority === 'active').length,
    done:   list.filter(c => c.priority === 'done').length,
  };
  const filtered = list.filter(c => filter === 'all' ? true : c.priority === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'rarity')    return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
    if (sortKey === 'evolution') return b.evolution - a.evolution;
    if (sortKey === 'progress')  return progressPct(b) - progressPct(a);
    if (sortKey === 'name')      return a.name.localeCompare(b.name, 'ja');
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });

  return (
    <div>
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <section className="bg-gradient-to-br from-slate-600 to-slate-600 rounded-2xl shadow-sm p-4 text-white">
          <div className="flex items-center justify-around text-center">
            <div><p className="text-[11px] text-white/70">最優先</p><p className="text-2xl font-bold">{counts.top}</p></div>
            <div className="w-px h-10 bg-white/20" />
            <div><p className="text-[11px] text-white/70">育成中</p><p className="text-2xl font-bold">{counts.active}</p></div>
            <div className="w-px h-10 bg-white/20" />
            <div><p className="text-[11px] text-white/70">完成</p><p className="text-2xl font-bold">{counts.done}</p></div>
          </div>
          <p className="text-center text-[11px] text-white/60 mt-2">コレクション {list.length}件</p>
        </section>

        {list.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1 overflow-x-auto">
              <button onClick={() => setFilter('all')}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium ${filter === 'all' ? 'bg-slate-600 text-white' : 'bg-gray-100 text-gray-500'}`}>すべて</button>
              {PRIORITIES.map(p => (
                <button key={p.value} onClick={() => setFilter(p.value)}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium ${filter === p.value ? 'bg-slate-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{p.label}</button>
              ))}
            </div>
            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
              className="ml-auto border border-gray-200 rounded-xl px-2 py-1.5 text-xs bg-white text-gray-600 shrink-0">
              <option value="priority">優先度順</option>
              <option value="rarity">レア順</option>
              <option value="evolution">進化順</option>
              <option value="progress">進捗順</option>
              <option value="name">名前順</option>
            </select>
          </div>
        )}

        {list.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">右下の＋から、コレクションを登録しましょう</p>
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">該当するコレクションがありません</p>
        ) : (
          <div className="space-y-2">
            {sorted.map(c => {
              const pm = priorityMeta(c.priority);
              const pct = progressPct(c);
              const doneTasks = c.tasks.filter(t => t.done).length;
              return (
                <div key={c.id} className="bg-white rounded-xl shadow-sm p-3">
                  <button onClick={() => { setEditing(c); setShowForm(true); }} className="w-full text-left min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${COLL_RARITY_CLS[c.rarity]}`}>{c.rarity}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${pm.cls}`}>{pm.label}</span>
                        <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {(c.level > 0 || c.levelMax > 0) && <span>Lv{c.level}{c.levelMax > 0 ? `/${c.levelMax}` : ''}</span>}
                        {c.evolution > 0 && <span>　進化{c.evolution}/{COLLECTION_EVOLUTION_MAX}</span>}
                      </p>
                  </button>

                  {/* ステータス */}
                  {c.stats.filter(s => s.type).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.stats.filter(s => s.type).map((s, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 font-medium">
                          {s.type} +{s.pct}%
                        </span>
                      ))}
                    </div>
                  )}
                  {c.effectText && <p className="text-[11px] text-gray-500 mt-1.5">{c.effectText}</p>}

                  {c.tasks.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct === 100 ? 'bg-blue-500' : 'bg-slate-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{doneTasks}/{c.tasks.length}・{pct}%</span>
                    </div>
                  )}
                  {c.tasks.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.tasks.map(t => (
                        <button key={t.id} onClick={() => toggleTask(c.id, t.id)}
                          className={`text-[11px] px-2 py-1 rounded-full border ${t.done ? 'bg-slate-50 border-slate-200 text-slate-600 line-through' : 'bg-white border-gray-200 text-gray-500'}`}>
                          {t.done ? '✓ ' : ''}{t.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {c.memo && <p className="text-[11px] text-gray-400 mt-1.5">{c.memo}</p>}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <button onClick={() => { setEditing(undefined); setShowForm(true); }} aria-label="コレクションを追加"
        style={{ bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
        className="fixed right-4 w-14 h-14 bg-slate-600 text-white rounded-full text-2xl shadow-lg active:scale-90 transition-transform flex items-center justify-center z-40">
        ＋
      </button>

      {showForm && (
        <CollectionForm editing={editing}
          onSave={c => {
            const exists = list.some(x => x.id === c.id);
            persist(exists ? list.map(x => x.id === c.id ? c : x) : [c, ...list]);
            setShowForm(false); setEditing(undefined);
          }}
          onDelete={editing ? () => { persist(list.filter(x => x.id !== editing.id)); setShowForm(false); setEditing(undefined); } : undefined}
          onClose={() => { setShowForm(false); setEditing(undefined); }} />
      )}
    </div>
  );
}

const DEFAULT_TASKS = ['レベル上げ', '進化させる', '被りを集める'];

// ── 登録・編集フォーム ──
function CollectionForm({ editing, onSave, onDelete, onClose }: {
  editing?: Collection;
  onSave: (c: Collection) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name,     setName]     = useState(editing?.name ?? '');
  const [rarity,   setRarity]   = useState<CollectionRarity>(editing?.rarity ?? 'R');
  const [level,    setLevel]    = useState(editing?.level ? String(editing.level) : '');
  const [levelMax, setLevelMax] = useState(editing?.levelMax ? String(editing.levelMax) : '');
  const [evolution, setEvolution] = useState(editing?.evolution ?? 0);
  const [stats,    setStats]    = useState<CollStat[]>(
    editing?.stats?.length ? editing.stats : [{ type: '', pct: 0 }, { type: '', pct: 0 }],
  );
  const [effectText, setEffectText] = useState(editing?.effectText ?? '');
  const [priority, setPriority] = useState<Priority>(editing?.priority ?? 'active');
  const [memo,     setMemo]     = useState(editing?.memo ?? '');
  const [tasks,    setTasks]    = useState(editing?.tasks ?? DEFAULT_TASKS.map(l => ({ id: newId(), label: l, done: false })));
  const [newTask,  setNewTask]  = useState('');

  function setStat(i: number, patch: Partial<CollStat>) {
    setStats(ss => ss.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  }
  function addTask() {
    const l = newTask.trim(); if (!l) return;
    setTasks(ts => [...ts, { id: newId(), label: l, done: false }]); setNewTask('');
  }
  function submit() {
    if (!name.trim()) return;
    onSave({
      id: editing?.id ?? newId(),
      name: name.trim(), emoji: '', rarity,
      level: Math.max(0, parseInt(level) || 0), levelMax: Math.max(0, parseInt(levelMax) || 0),
      evolution,
      stats: stats.filter(s => s.type.trim()),
      effectText: effectText.trim(),
      priority, tasks, memo: memo.trim(),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">{editing ? 'コレクションを編集' : 'コレクションを追加'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">コレクション名 *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
          </div>

          {/* レアリティ */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">レアリティ</label>
            <div className="flex gap-1.5">
              {COLLECTION_RARITIES.map(r => (
                <button key={r} onClick={() => setRarity(r)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold ${rarity === r ? COLL_RARITY_CLS[r] + ' ring-2 ring-offset-1 ring-slate-400' : 'bg-gray-100 text-gray-400'}`}>{r}</button>
              ))}
            </div>
          </div>

          {/* レベル・上限 */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">レベル</label>
              <input type="number" inputMode="numeric" min={0} value={level} onChange={e => setLevel(e.target.value)} placeholder="1"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">レベル上限</label>
              <input type="number" inputMode="numeric" min={0} value={levelMax} onChange={e => setLevelMax(e.target.value)} placeholder="20"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
          </div>

          {/* 進化 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">進化（{evolution}/{COLLECTION_EVOLUTION_MAX}）</label>
            <div className="flex items-center gap-2">
              {Array.from({ length: COLLECTION_EVOLUTION_MAX }).map((_, i) => (
                <button key={i} onClick={() => setEvolution(evolution === i + 1 ? i : i + 1)}
                  className={`text-2xl leading-none ${i < evolution ? 'text-amber-400' : 'text-gray-200'}`}>★</button>
              ))}
            </div>
          </div>

          {/* ステータス2枠 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">ステータス上昇</label>
            <datalist id="coll-stat-types">
              {COLL_STAT_TYPES.map(t => <option key={t} value={t} />)}
            </datalist>
            <div className="space-y-2">
              {stats.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input list="coll-stat-types" value={s.type} onChange={e => setStat(i, { type: e.target.value })}
                    placeholder="例：最大HP"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                  <span className="text-gray-400 text-sm">+</span>
                  <input type="number" inputMode="decimal" step="0.1" value={s.pct || ''} onChange={e => setStat(i, { pct: parseFloat(e.target.value) || 0 })}
                    className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-300" />
                  <span className="text-gray-400 text-sm">%</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-1.5">
              {stats.length < 4 && (
                <button onClick={() => setStats(ss => [...ss, { type: '', pct: 0 }])} className="text-[11px] text-slate-600 font-medium">＋ 枠を追加</button>
              )}
              {stats.length > 1 && (
                <button onClick={() => setStats(ss => ss.slice(0, -1))} className="text-[11px] text-gray-400">− 枠を減らす</button>
              )}
            </div>
          </div>

          {/* 効果文 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">効果（対象グループなど）</label>
            <textarea value={effectText} onChange={e => setEffectText(e.target.value)} rows={2}
              placeholder="例：ヒーローグループの攻撃力を20%アップ"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none" />
          </div>

          {/* 優先度 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">優先度</label>
            <div className="flex gap-1.5">
              {PRIORITIES.map(p => (
                <button key={p.value} onClick={() => setPriority(p.value)}
                  className={`flex-1 text-xs py-2 rounded-lg font-medium ${priority === p.value ? p.cls : 'bg-gray-100 text-gray-500'}`}>{p.label}</button>
              ))}
            </div>
          </div>

          {/* チェックリスト */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">育成チェックリスト</label>
            <div className="space-y-1.5">
              {tasks.map(t => (
                <div key={t.id} className="flex items-center gap-2">
                  <button onClick={() => setTasks(ts => ts.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}
                    className={`w-5 h-5 rounded shrink-0 flex items-center justify-center text-[11px] border ${t.done ? 'bg-slate-500 border-slate-500 text-white' : 'border-gray-300'}`}>
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
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              <button onClick={addTask} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium">追加</button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">メモ</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none" />
          </div>
        </div>

        <div className="px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] border-t border-gray-100 flex gap-2">
          {onDelete && (
            <button onClick={() => { if (confirm('削除しますか？')) onDelete(); }}
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
