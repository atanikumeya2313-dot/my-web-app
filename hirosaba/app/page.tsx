'use client';
import { useEffect, useRef, useState } from 'react';
import { Character, Priority, PRIORITIES, priorityMeta, progressPct } from './types';
import { loadChars, saveChars, exportData, importData, hasData, todayYMD } from './lib/storage';
import { useAutoSync } from './lib/autoSync';
import CloudSync from './components/CloudSync';
import CharForm from './components/CharForm';
import GearSection from './components/GearSection';

type Tab = 'char' | 'equip' | 'collection';
type Filter = 'all' | Priority;
type SortKey = 'priority' | 'rarity' | 'power' | 'progress' | 'name';

const PRIORITY_ORDER: Record<Priority, number> = { top: 0, active: 1, later: 2, done: 3 };

export default function Home() {
  const [tab,      setTab]      = useState<Tab>('char');
  const [chars,    setChars]    = useState<Character[]>([]);
  const [filter,   setFilter]   = useState<Filter>('all');
  const [sortKey,  setSortKey]  = useState<SortKey>('priority');
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Character | undefined>();
  const [showCloud, setShowCloud] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setChars(loadChars()); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useAutoSync({ bucket: 'hirosaba', serialize: exportData, apply: (j) => importData(j), hasData });

  function persist(next: Character[]) { setChars(next); saveChars(next); }

  function handleSave(c: Character) {
    const exists = chars.some(x => x.id === c.id);
    persist(exists ? chars.map(x => x.id === c.id ? c : x) : [c, ...chars]);
    setShowForm(false); setEditing(undefined);
  }
  function handleDelete(id: string) {
    persist(chars.filter(c => c.id !== id));
    setShowForm(false); setEditing(undefined);
  }
  // カード上でチェックリストを直接トグル
  function toggleTask(charId: string, taskId: string) {
    persist(chars.map(c => c.id !== charId ? c
      : { ...c, tasks: c.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) }));
  }

  function handleExport() {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ヒロサバ育成_backup_${todayYMD()}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    if (!confirm('現在のデータを上書きします。よろしいですか？')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (importData(ev.target?.result as string)) setChars(loadChars());
      else alert('取り込みに失敗しました');
    };
    reader.readAsText(file);
  }

  // 集計
  const counts = {
    top:    chars.filter(c => c.priority === 'top').length,
    active: chars.filter(c => c.priority === 'active').length,
    done:   chars.filter(c => c.priority === 'done').length,
  };

  const groups = Array.from(new Set(chars.map(c => c.group).filter(Boolean)));

  const filtered = chars.filter(c => filter === 'all' ? true : c.priority === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'rarity')   return b.rarity - a.rarity;
    if (sortKey === 'power')    return b.power - a.power;
    if (sortKey === 'progress') return progressPct(b) - progressPct(a);
    if (sortKey === 'name')     return a.name.localeCompare(b.name, 'ja');
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]; // priority
  });

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <a href="/" aria-label="入口（ハブ）に戻る" className="text-gray-300 hover:text-gray-600 text-lg leading-none shrink-0">🏠</a>
            <h1 className="text-base font-bold text-gray-800">🦸 ヒロサバ育成管理</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowCloud(true)} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">☁️同期</button>
            <button onClick={handleExport} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">書出</button>
            <button onClick={() => importRef.current?.click()} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">読込</button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </div>
        <div className="max-w-lg mx-auto flex border-t border-gray-100">
          {([['char', '🦸 キャラ'], ['equip', '🛡️ 装備'], ['collection', '🎴 コレクション']] as [Tab, string][]).map(([t, lbl]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${tab === t ? 'text-green-600' : 'text-gray-400'}`}>
              {lbl}
              {tab === t && <span className="absolute bottom-0 inset-x-4 h-0.5 bg-green-600 rounded-full" />}
            </button>
          ))}
        </div>
      </header>

      {tab === 'equip' && <GearSection kind="equip" />}
      {tab === 'collection' && <GearSection kind="collection" />}
      {tab === 'char' && (
      <>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* 集計 */}
        <section className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-sm p-4 text-white">
          <div className="flex items-center justify-around text-center">
            <div><p className="text-[11px] text-white/70">最優先</p><p className="text-2xl font-bold">{counts.top}</p></div>
            <div className="w-px h-10 bg-white/20" />
            <div><p className="text-[11px] text-white/70">育成中</p><p className="text-2xl font-bold">{counts.active}</p></div>
            <div className="w-px h-10 bg-white/20" />
            <div><p className="text-[11px] text-white/70">完成</p><p className="text-2xl font-bold">{counts.done}</p></div>
          </div>
          <p className="text-center text-[11px] text-white/60 mt-2">登録キャラ {chars.length}体</p>
        </section>

        {/* フィルタ・並び替え */}
        {chars.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1 overflow-x-auto">
              <button onClick={() => setFilter('all')}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium ${filter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>すべて</button>
              {PRIORITIES.map(p => (
                <button key={p.value} onClick={() => setFilter(p.value)}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium ${filter === p.value ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
              className="ml-auto border border-gray-200 rounded-xl px-2 py-1.5 text-xs bg-white text-gray-600 shrink-0">
              <option value="priority">優先度順</option>
              <option value="rarity">レア順</option>
              <option value="power">戦闘力順</option>
              <option value="progress">進捗順</option>
              <option value="name">名前順</option>
            </select>
          </div>
        )}

        {/* 一覧 */}
        {chars.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🦸</p>
            <p className="text-gray-400 text-sm">右下の＋から、育成したいキャラを登録しましょう</p>
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">該当するキャラがいません</p>
        ) : (
          <div className="space-y-2">
            {sorted.map(c => {
              const pm = priorityMeta(c.priority);
              const pct = progressPct(c);
              const doneTasks = c.tasks.filter(t => t.done).length;
              return (
                <div key={c.id} className="bg-white rounded-xl shadow-sm p-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setEditing(c); setShowForm(true); }} className="text-2xl shrink-0">{c.emoji}</button>
                    <button onClick={() => { setEditing(c); setShowForm(true); }} className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${pm.cls}`}>{pm.label}</span>
                        <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {c.rarity > 0 && <span className="text-amber-400">{'★'.repeat(c.rarity)}</span>}
                        {c.group && <span> {c.group}</span>}
                        {c.level > 0 && <span>　Lv{c.level}</span>}
                        {c.intimacy > 0 && <span>　💚{c.intimacy}</span>}
                        {c.power > 0 && <span>　⚔{c.power.toLocaleString()}</span>}
                      </p>
                    </button>
                  </div>

                  {/* 進捗バー */}
                  {c.tasks.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct === 100 ? 'bg-blue-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{doneTasks}/{c.tasks.length}・{pct}%</span>
                    </div>
                  )}

                  {/* チェックリスト（カードから直接トグル） */}
                  {c.tasks.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.tasks.map(t => (
                        <button key={t.id} onClick={() => toggleTask(c.id, t.id)}
                          className={`text-[11px] px-2 py-1 rounded-full border ${t.done ? 'bg-green-50 border-green-200 text-green-600 line-through' : 'bg-white border-gray-200 text-gray-500'}`}>
                          {t.done ? '✓ ' : ''}{t.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {c.memo && <p className="text-[11px] text-gray-400 mt-2">📝 {c.memo}</p>}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <button onClick={() => { setEditing(undefined); setShowForm(true); }} aria-label="キャラを追加"
        style={{ bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
        className="fixed right-4 w-14 h-14 bg-green-600 text-white rounded-full text-2xl shadow-lg active:scale-90 transition-transform flex items-center justify-center z-40">
        ＋
      </button>

      {showForm && (
        <CharForm editing={editing} groups={groups} onSave={handleSave}
          onDelete={editing ? () => handleDelete(editing.id) : undefined}
          onClose={() => { setShowForm(false); setEditing(undefined); }} />
      )}
      </>
      )}

      {showCloud && <CloudSync bucket="hirosaba" serialize={exportData} apply={importData} onClose={() => setShowCloud(false)} />}
    </div>
  );
}
