'use client';
import { useEffect, useRef, useState } from 'react';
import { Sub, CYCLE_LABEL, catIcon, monthlyEquiv } from './types';
import { loadSubs, saveSubs, rollForward, daysUntil, exportData, importData, todayYMD } from './lib/storage';
import SubForm from './components/SubForm';

type StatusFilter = 'all' | 'active' | 'paused';
type SortKey = 'soon' | 'amount' | 'name';

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

export default function Home() {
  const [subs,   setSubs]   = useState<Sub[]>([]);
  const [statusF, setStatusF] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('soon');
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Sub | undefined>();
  const importRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const { subs: rolled, changed } = rollForward(loadSubs());
    if (changed) saveSubs(rolled);
    setSubs(rolled);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function persist(next: Sub[]) { setSubs(next); saveSubs(next); }

  function handleSave(s: Sub) {
    const exists = subs.some(x => x.id === s.id);
    persist(exists ? subs.map(x => x.id === s.id ? s : x) : [s, ...subs]);
    setShowForm(false); setEditing(undefined);
  }
  function handleDelete(id: string) {
    persist(subs.filter(s => s.id !== id));
    setShowForm(false); setEditing(undefined);
  }
  function toggleActive(id: string) {
    persist(subs.map(s => s.id === id ? { ...s, active: !s.active } : s));
  }

  function handleExport() {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `サブスク_backup_${todayYMD()}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    if (!confirm('現在のデータを上書きします。よろしいですか？')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (importData(ev.target?.result as string)) {
        const { subs: rolled, changed } = rollForward(loadSubs());
        if (changed) saveSubs(rolled);
        setSubs(rolled);
      } else alert('取り込みに失敗しました');
    };
    reader.readAsText(file);
  }

  // 合計（稼働中のみ）
  const activeSubs = subs.filter(s => s.active);
  const monthlyTotal = activeSubs.reduce((sum, s) => sum + monthlyEquiv(s), 0);
  const yearlyTotal  = monthlyTotal * 12;

  // カテゴリ別（月あたり・稼働中）
  const byCat: Record<string, number> = {};
  activeSubs.forEach(s => { byCat[s.category] = (byCat[s.category] ?? 0) + monthlyEquiv(s); });
  const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const catMax = Math.max(...catRows.map(r => r[1]), 1);

  // 一覧
  const filtered = subs.filter(s =>
    statusF === 'all' ? true : statusF === 'active' ? s.active : !s.active);
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'amount') return monthlyEquiv(b) - monthlyEquiv(a);
    if (sortKey === 'name')   return a.name.localeCompare(b.name, 'ja');
    return a.nextDate.localeCompare(b.nextDate); // soon
  });

  function badge(s: Sub) {
    const d = daysUntil(s.nextDate);
    if (s.trial) return { t: d <= 0 ? '本日課金開始' : `無料体験 あと${d}日`, cls: 'bg-amber-100 text-amber-700' };
    if (d <= 0)  return { t: '本日更新', cls: 'bg-red-500 text-white' };
    if (d <= 3)  return { t: `あと${d}日`, cls: 'bg-red-100 text-red-600' };
    if (d <= 7)  return { t: `あと${d}日`, cls: 'bg-orange-100 text-orange-600' };
    return { t: `あと${d}日`, cls: 'bg-gray-100 text-gray-500' };
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">📆 サブスク管理</h1>
          <div className="flex items-center gap-1.5">
            <button onClick={handleExport} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">書出</button>
            <button onClick={() => importRef.current?.click()} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">読込</button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* 合計サマリー */}
        <section className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl shadow-sm p-4 text-white">
          <div className="flex items-end justify-around text-center">
            <div>
              <p className="text-[11px] text-white/70">月あたり</p>
              <p className="text-2xl font-bold">{yen(monthlyTotal)}</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <p className="text-[11px] text-white/70">年あたり</p>
              <p className="text-2xl font-bold">{yen(yearlyTotal)}</p>
            </div>
          </div>
          <p className="text-center text-[11px] text-white/60 mt-2">稼働中 {activeSubs.length}件（年額・週は月割りで換算）</p>
        </section>

        {/* カテゴリ内訳 */}
        {catRows.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2.5">カテゴリ別（月あたり）</h2>
            <div className="space-y-2">
              {catRows.map(([cat, val]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-24 shrink-0 truncate">{catIcon(cat)} {cat}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-400 rounded-full" style={{ width: `${(val / catMax) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right shrink-0">{yen(val)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* フィルター */}
        {subs.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {([['all', 'すべて'], ['active', '稼働中'], ['paused', '停止']] as [StatusFilter, string][]).map(([v, l]) => (
                <button key={v} onClick={() => setStatusF(v)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${statusF === v ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {l}
                </button>
              ))}
            </div>
            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
              className="ml-auto border border-gray-200 rounded-xl px-2 py-1.5 text-xs bg-white text-gray-600">
              <option value="soon">更新が近い順</option>
              <option value="amount">金額が高い順</option>
              <option value="name">名前順</option>
            </select>
          </div>
        )}

        {/* 一覧 */}
        {subs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">📆</p>
            <p className="text-gray-400 text-sm">右下の＋から、契約中のサブスクを登録しましょう</p>
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">該当するサブスクがありません</p>
        ) : (
          <div className="space-y-2">
            {sorted.map(s => {
              const b = badge(s);
              return (
                <div key={s.id} className={`bg-white rounded-xl shadow-sm p-3 ${!s.active ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setEditing(s); setShowForm(true); }} className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${b.cls}`}>{b.t}</span>
                        <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                        {!s.active && <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">停止中</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {catIcon(s.category)} {s.category}　次回 {s.nextDate.slice(5).replace('-', '/')}
                      </p>
                    </button>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-800">{yen(s.amount)}</p>
                      <p className="text-[10px] text-gray-400">{CYCLE_LABEL[s.cycle]}</p>
                    </div>
                    <button onClick={() => toggleActive(s.id)}
                      className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium ${s.active ? 'bg-violet-50 text-violet-500' : 'bg-gray-100 text-gray-400'}`}
                      title={s.active ? '停止する' : '再開する'}>
                      {s.active ? '⏸' : '▶'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <button onClick={() => { setEditing(undefined); setShowForm(true); }} aria-label="サブスクを追加"
        className="fixed bottom-6 right-4 w-14 h-14 bg-violet-600 text-white rounded-full text-2xl shadow-lg active:scale-90 transition-transform flex items-center justify-center z-40">
        ＋
      </button>

      {showForm && (
        <SubForm editing={editing} onSave={handleSave}
          onDelete={editing ? () => handleDelete(editing.id) : undefined}
          onClose={() => { setShowForm(false); setEditing(undefined); }} />
      )}
    </div>
  );
}
