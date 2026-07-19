'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Note, Kind, Priority,
  APPS, KIND_LABEL, KIND_CLS, PRIORITY_CLS, PRIORITY_ORDER,
} from './types';
import {
  loadNotes, saveNotes, loadLastApp, saveLastApp, fmtDate, exportData, importData,
} from './lib/storage';
import CloudSync from './components/CloudSync';
import { useAutoSync } from './lib/autoSync';
import NoteForm from './components/NoteForm';

type Filter = 'open' | 'weekend' | 'done' | 'all';
const KINDS: Kind[] = ['bug', 'improve', 'idea'];

export default function Home() {
  const [notes,   setNotes]   = useState<Note[]>([]);
  const [app,     setApp]     = useState(APPS[0]);
  const [text,    setText]    = useState('');
  const [kind,    setKind]    = useState<Kind>('improve');
  const [priority,setPriority]= useState<Priority>('mid');
  const [filter,  setFilter]  = useState<Filter>('open');
  const [appF,    setAppF]    = useState('');
  const [editing, setEditing] = useState<Note | null>(null);
  const [showCloud, setShowCloud] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setNotes(loadNotes());
    const last = loadLastApp();
    if (last && APPS.includes(last)) setApp(last);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useAutoSync({ bucket: 'appnotes', serialize: () => JSON.stringify(exportData()), apply: (j) => { try { return importData(JSON.parse(j)); } catch { return false; } }, hasData: () => { try { return loadNotes().length > 0; } catch { return false; } } });

  function persist(next: Note[]) { setNotes(next); saveNotes(next); }

  function add() {
    const t = text.trim();
    if (!t) return;
    const note: Note = {
      id: crypto.randomUUID(),
      app, text: t, kind, priority,
      status: 'open', weekend: false,
      createdAt: new Date().toISOString(),
    };
    persist([note, ...notes]);
    saveLastApp(app);
    setText('');
  }

  function toggleDone(n: Note) {
    persist(notes.map(x => x.id === n.id
      ? { ...x, status: x.status === 'done' ? 'open' : 'done', doneAt: x.status === 'done' ? undefined : new Date().toISOString() }
      : x));
  }
  function toggleWeekend(n: Note) {
    persist(notes.map(x => x.id === n.id ? { ...x, weekend: !x.weekend } : x));
  }
  function saveEdit(n: Note) { persist(notes.map(x => x.id === n.id ? n : x)); setEditing(null); }
  function del(id: string) { persist(notes.filter(x => x.id !== id)); setEditing(null); }

  // ── バックアップ ──
  function handleExport() {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `改善メモ_backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    if (!confirm('現在のメモを上書きします。よろしいですか？')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try { if (importData(JSON.parse(ev.target?.result as string))) setNotes(loadNotes()); else alert('取り込みに失敗しました'); }
      catch { alert('JSONの読み込みに失敗しました'); }
    };
    reader.readAsText(file);
  }

  // ── 絞り込み・並び替え ──
  const filtered = notes
    .filter(n => filter === 'all' ? true : filter === 'weekend' ? (n.weekend && n.status !== 'done') : n.status === (filter === 'done' ? 'done' : 'open'))
    .filter(n => !appF || n.app === appF);

  const sorted = [...filtered].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1;     // 未対応を上
    if (a.status === 'done') return (b.doneAt ?? '').localeCompare(a.doneAt ?? '');
    if (a.weekend !== b.weekend) return a.weekend ? -1 : 1;             // ★週末を上
    if (a.priority !== b.priority) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return b.createdAt.localeCompare(a.createdAt);
  });

  const openCount    = notes.filter(n => n.status === 'open').length;
  const weekendCount = notes.filter(n => n.weekend && n.status !== 'done').length;
  const appsInUse    = [...new Set(notes.map(n => n.app))].sort((a, b) => APPS.indexOf(a) - APPS.indexOf(b));

  return (
    <div className="min-h-screen pb-10">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <a href="/" aria-label="入口（ハブ）に戻る" className="text-gray-300 hover:text-gray-600 text-lg leading-none shrink-0">🏠</a>
            <h1 className="text-base font-bold text-gray-800">🔧 アプリ改善メモ</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowCloud(true)} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">☁️同期</button>
            <button onClick={handleExport} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">書出</button>
            <button onClick={() => importRef.current?.click()} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">読込</button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            {showCloud && <CloudSync bucket="appnotes" serialize={() => JSON.stringify(exportData())} apply={(j) => { try { return importData(JSON.parse(j)); } catch { return false; } }} onClose={() => setShowCloud(false)} />}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-3 space-y-3">
        {/* クイック追加 */}
        <section className="bg-white rounded-2xl shadow-sm p-3 space-y-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
            {APPS.map(a => (
              <button key={a} onClick={() => setApp(a)}
                className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${app === a ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {a}
              </button>
            ))}
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder={`「${app}」の不便な点・直したいこと…`}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-gray-200 text-[11px]">
              {KINDS.map(k => (
                <button key={k} onClick={() => setKind(k)}
                  className={`px-2.5 py-1.5 font-medium ${kind === k ? 'bg-orange-500 text-white' : 'bg-white text-gray-500'}`}>{KIND_LABEL[k]}</button>
              ))}
            </div>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 text-[11px]">
              {(['high','mid','low'] as Priority[]).map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`px-2.5 py-1.5 font-medium ${priority === p ? 'bg-orange-500 text-white' : 'bg-white text-gray-500'}`}>
                  {p === 'high' ? '高' : p === 'mid' ? '中' : '低'}
                </button>
              ))}
            </div>
            <button onClick={add} disabled={!text.trim()}
              className="ml-auto px-5 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold disabled:opacity-40">追加</button>
          </div>
        </section>

        {/* フィルター */}
        <div className="flex gap-1.5">
          {([['open',`未対応 ${openCount}`],['weekend',`★週末 ${weekendCount}`],['done','完了'],['all','すべて']] as [Filter,string][]).map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filter === v ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {l}
            </button>
          ))}
          {appsInUse.length > 0 && (
            <select value={appF} onChange={e => setAppF(e.target.value)}
              className="ml-auto border border-gray-200 rounded-full px-2 py-1.5 text-xs bg-white text-gray-600">
              <option value="">全アプリ</option>
              {appsInUse.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </div>

        {/* リスト */}
        {sorted.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">
            {notes.length === 0 ? '不便な点を上のフォームでメモしましょう' : '該当するメモはありません'}
          </p>
        ) : (
          <div className="space-y-2">
            {sorted.map(n => (
              <div key={n.id} className={`bg-white rounded-xl shadow-sm p-3 flex items-start gap-3 ${n.status === 'done' ? 'opacity-60' : ''}`}>
                <button onClick={() => toggleDone(n)} aria-label="完了"
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${n.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                  {n.status === 'done' && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  )}
                </button>
                <button onClick={() => setEditing(n)} className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_CLS[n.priority]}`} />
                    <span className="text-[10px] text-gray-500 font-medium">{n.app}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${KIND_CLS[n.kind]}`}>{KIND_LABEL[n.kind]}</span>
                  </div>
                  <p className={`text-sm text-gray-800 ${n.status === 'done' ? 'line-through' : ''}`}>{n.text}</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">{fmtDate(n.createdAt)}</p>
                </button>
                <button onClick={() => toggleWeekend(n)} aria-label="今週末やる"
                  className={`shrink-0 text-lg leading-none ${n.weekend ? 'text-amber-400' : 'text-gray-200'}`}>★</button>
              </div>
            ))}
          </div>
        )}
      </main>

      {editing && (
        <NoteForm editing={editing} onSave={saveEdit} onDelete={del} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
