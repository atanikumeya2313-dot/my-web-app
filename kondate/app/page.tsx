'use client';
import { useEffect, useRef, useState } from 'react';
import { Ingredient, Suggestion, SavedMeal, HistoryEntry, CUISINES, TIME_OPTIONS } from './types';
import {
  loadPantry, savePantry, loadSaved, saveSaved, loadHistory, saveHistory,
  exportData, importData, todayYMD,
} from './lib/storage';
import { readInventoryFood, writeInventoryFromBackup } from './lib/inventory';
import { inStock, decrementInventory, addMissingToInventory } from './lib/inventoryWrite';
import { cloudPull, CODE_KEY } from './lib/cloud';
import MealCard from './components/MealCard';
import PhotoModal from './components/PhotoModal';
import CloudSync from './components/CloudSync';
import { useAutoSync } from './lib/autoSync';

type Tab = 'make' | 'saved' | 'history';

export default function Home() {
  const [pantry,  setPantry]  = useState<Ingredient[]>([]);
  const [saved,   setSaved]   = useState<SavedMeal[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [tab,     setTab]     = useState<Tab>('make');
  const [newIng,  setNewIng]  = useState('');

  const [servings, setServings] = useState(2);
  const [cuisine,  setCuisine]  = useState('指定なし');
  const [maxTime,  setMaxTime]  = useState('');
  const [useUp,    setUseUp]    = useState(true);

  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [showPhoto, setShowPhoto] = useState(false);
  const [showCloud, setShowCloud] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPantry(loadPantry());
    setSaved(loadSaved());
    setHistory(loadHistory());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 自動同期（安全設計・オン時のみ動作）
  useAutoSync({
    bucket: 'kondate',
    serialize: exportData,
    apply: (j) => importData(j),
    hasData: () => { try { return loadPantry().length + loadSaved().length + loadHistory().length > 0; } catch { return false; } },
  });

  function persistPantry(list: Ingredient[]) { setPantry(list); savePantry(list); }

  function addIngredient(name: string, soon = false) {
    const n = name.trim();
    if (!n) return;
    if (pantry.some(p => p.name === n)) { if (soon) persistPantry(pantry.map(p => p.name === n ? { ...p, soon: true } : p)); return; }
    persistPantry([...pantry, { name: n, soon }]);
  }
  function addMany(names: string[], soon = false) {
    const cur = [...pantry];
    for (const raw of names) {
      const n = raw.trim(); if (!n) continue;
      const idx = cur.findIndex(p => p.name === n);
      if (idx >= 0) { if (soon) cur[idx] = { ...cur[idx], soon: true }; }
      else cur.push({ name: n, soon });
    }
    persistPantry(cur);
  }
  function removeIngredient(name: string) { persistPantry(pantry.filter(p => p.name !== name)); }

  async function importFromInventory() {
    let res = readInventoryFood();

    // この端末に在庫データが無い場合は、クラウド（同じ同期コード）から在庫を取得して再試行
    if (!res.keyPresent) {
      let code = '';
      try { code = (localStorage.getItem(CODE_KEY) ?? '').trim(); } catch {}
      if (!code) {
        alert(
          '在庫データがこの端末に見つかりませんでした。\n\n' +
          '「☁️同期」を開き、在庫アプリと同じ同期コードを設定してください。\n' +
          '（在庫アプリ側で「クラウドに保存」しておくと、ここから取得できます）'
        );
        return;
      }
      if (!confirm('在庫データがこの端末にありません。\nクラウドから在庫を取得しますか？（在庫アプリと同じ同期コードを使用）')) return;
      try {
        const { json } = await cloudPull(code, 'inventory');
        if (!json) { alert('クラウドにこのコードの在庫データがありません。\n先に在庫アプリで「☁️同期 → クラウドに保存」してください。'); return; }
        if (!writeInventoryFromBackup(json)) { alert('取得した在庫データを読み込めませんでした。'); return; }
        res = readInventoryFood();
      } catch (e) {
        const m = (e as Error).message || '';
        alert(/decrypt|復号|OperationError/i.test(m) ? '同期コードが違うため復号できませんでした。' : ('クラウドからの取得に失敗しました：' + m));
        return;
      }
    }

    // データはあるが取り込める食材が無い＝在庫0 or 日用品/薬のみ
    if (res.food.length === 0) {
      alert(
        `在庫は読み込めましたが（全${res.totalItems}件・在庫あり${res.inStock}件）、取り込める食材がありませんでした。\n\n` +
        '・数量が1以上あるか\n・カテゴリが「日用品・消耗品」「薬・医療品」以外か\nをご確認ください。'
      );
      return;
    }

    // 期限が近い(soon)ものと通常を「一度にまとめて」追加する。
    // 2回に分けて呼ぶと、状態更新の都合で後の追加が前の追加を打ち消し、🔥の食材が消えるため。
    const cur = [...pantry];
    for (const f of res.food) {
      const idx = cur.findIndex(p => p.name === f.name);
      if (idx >= 0) { if (f.soon) cur[idx] = { ...cur[idx], soon: true }; }
      else cur.push({ name: f.name, soon: f.soon });
    }
    persistPantry(cur);
  }

  async function generate() {
    if (pantry.length === 0 || loading) return;
    setLoading(true); setError(''); setSuggestions(null);
    try {
      let res!: Response;
      for (let attempt = 0; ; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 50000);
        try {
          res = await fetch('/kondate/api/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ingredients: pantry, servings, cuisine, maxTime, useUp,
              recent: history.slice(0, 8).map(h => h.title),
            }),
            signal: ctrl.signal,
          });
        } catch (e) {
          if (attempt < 2) { await new Promise(r => setTimeout(r, 800 * (attempt + 1))); continue; }
          throw e;
        } finally { clearTimeout(timer); }
        break;
      }
      let data: { meals?: Suggestion[]; error?: string } | null = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok || !Array.isArray(data?.meals)) {
        setError(res.status === 503 ? 'AI機能はまだ準備中です（APIキー未設定）' : (data?.error ?? '献立の提案に失敗しました'));
        return;
      }
      setSuggestions(data.meals);
      if (data.meals.length === 0) setError('提案を作れませんでした。食材を足すか、条件を変えてお試しください。');
    } catch (e) {
      setError((e as Error)?.name === 'AbortError'
        ? 'AIの応答に時間がかかっています。少し待ってからお試しください。'
        : '通信に失敗しました。少し待ってから再試行してください。');
    } finally {
      setLoading(false);
    }
  }

  function saveMeal(m: Suggestion) {
    if (saved.some(s => s.title === m.title)) return;
    const next = [{ ...m, id: crypto.randomUUID(), savedAt: new Date().toISOString() }, ...saved];
    setSaved(next); saveSaved(next);
  }
  function deleteSaved(id: string) {
    const next = saved.filter(s => s.id !== id); setSaved(next); saveSaved(next);
  }
  function markCooked(title: string, used: string[] = []) {
    const next = [{ id: crypto.randomUUID(), title, date: todayYMD() }, ...history];
    setHistory(next); saveHistory(next);
    // 在庫連携：使った食材が在庫にあれば、確認のうえ1つずつ減らす
    const matched = inStock(used);
    if (matched.length > 0 &&
        confirm(`「${title}」を作った記録をつけました🍳\n使った食材を在庫から1つずつ減らしますか？\n（${matched.join('、')}）`)) {
      const done = decrementInventory(matched);
      if (done.length) alert(`在庫を更新しました：${done.join('、')} を1つ減らしました`);
    } else if (matched.length === 0) {
      alert(`「${title}」を作った記録をつけました🍳`);
    }
  }

  function addMissingToInv(missing: string[]) {
    const added = addMissingToInventory(missing);
    alert(added > 0
      ? `在庫に${added}品を追加しました（在庫切れ＝要補充として登録）。在庫管理アプリで確認できます。`
      : '追加する食材がありませんでした（すべて在庫に登録済みです）。');
  }

  function handleExport() {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `献立_backup_${todayYMD()}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    if (!confirm('現在のデータを上書きします。よろしいですか？')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (importData(ev.target?.result as string)) {
        setPantry(loadPantry()); setSaved(loadSaved()); setHistory(loadHistory());
      } else alert('取り込みに失敗しました');
    };
    reader.readAsText(file);
  }

  const savedTitles = new Set(saved.map(s => s.title));

  return (
    <div className="min-h-screen pb-16">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <a href="/" aria-label="入口（ハブ）に戻る" className="text-gray-300 hover:text-gray-600 text-lg leading-none shrink-0">🏠</a>
            <h1 className="text-base font-bold text-gray-800">🍳 献立アシスタント</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowCloud(true)} className="text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 font-medium">☁️同期</button>
            <button onClick={handleExport} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">書出</button>
            <button onClick={() => importRef.current?.click()} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">読込</button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 flex gap-1.5 pb-2">
          {([['make', '献立をつくる'], ['saved', `お気に入り (${saved.length})`], ['history', '履歴']] as [Tab, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${tab === v ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {tab === 'make' && (
          <>
            {/* 手持ち食材 */}
            <section className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-700">今ある食材</h2>
                {pantry.length > 0 && (
                  <button onClick={() => persistPantry([])} className="text-[11px] text-gray-400 hover:text-red-400">すべて消す</button>
                )}
              </div>

              <div className="flex gap-2 mb-2">
                <input value={newIng} onChange={e => setNewIng(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { addIngredient(newIng); setNewIng(''); } }}
                  placeholder="食材を入力して追加（例: 鶏もも肉）"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                <button onClick={() => { addIngredient(newIng); setNewIng(''); }} disabled={!newIng.trim()}
                  className="px-4 rounded-xl bg-orange-500 text-white text-sm font-bold disabled:opacity-40">追加</button>
              </div>

              <div className="flex gap-2 mb-3">
                <button onClick={importFromInventory}
                  className="flex-1 py-1.5 rounded-lg bg-orange-50 text-orange-600 text-xs font-medium border border-orange-100">📦 在庫から取り込む</button>
                <button onClick={() => setShowPhoto(true)}
                  className="flex-1 py-1.5 rounded-lg bg-orange-50 text-orange-600 text-xs font-medium border border-orange-100">📷 写真から</button>
              </div>

              {pantry.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-3">食材を追加すると、献立を提案できます</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {pantry.map(p => (
                    <span key={p.name}
                      className={`inline-flex items-center gap-1 text-xs pl-2.5 pr-1.5 py-1 rounded-full border ${
                        p.soon ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                      {p.soon && <span title="期限が近い">🔥</span>}{p.name}
                      <button onClick={() => removeIngredient(p.name)} className="text-gray-300 hover:text-red-400 leading-none">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* 条件 */}
            <section className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">条件</h2>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">人数</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setServings(s => Math.max(1, s - 1))}
                    className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center">−</button>
                  <span className="text-sm font-bold w-8 text-center">{servings}人</span>
                  <button onClick={() => setServings(s => Math.min(8, s + 1))}
                    className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center">＋</button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500 shrink-0">ジャンル</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {CUISINES.map(c => (
                    <button key={c} onClick={() => setCuisine(c)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border ${cuisine === c ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500 shrink-0">調理時間</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {TIME_OPTIONS.map(t => (
                    <button key={t.value} onClick={() => setMaxTime(t.value)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border ${maxTime === t.value ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{t.label}</button>
                  ))}
                </div>
              </div>
              <label className="flex items-center justify-between">
                <span className="text-xs text-gray-500">🔥 期限が近い食材を使い切る</span>
                <button onClick={() => setUseUp(v => !v)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${useUp ? 'bg-orange-500' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${useUp ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </label>
            </section>

            {/* 提案ボタン */}
            <button onClick={generate} disabled={pantry.length === 0 || loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm">
              {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {loading ? '献立を考えています…' : '✨ この食材で献立を提案'}
            </button>

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            {/* 結果 */}
            {suggestions && suggestions.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400">{suggestions.length}つの献立</p>
                {suggestions.map((m, i) => (
                  <MealCard key={i} meal={m}
                    onSave={() => saveMeal(m)} saved={savedTitles.has(m.title)}
                    onCooked={() => markCooked(m.title, m.used)}
                    onAddMissing={m.missing.length > 0 ? () => addMissingToInv(m.missing) : undefined} />
                ))}
                <button onClick={generate} disabled={loading}
                  className="w-full py-2 rounded-xl text-xs font-medium text-orange-600 border border-orange-200">
                  別の献立を提案
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'saved' && (
          saved.length === 0 ? (
            <div className="text-center py-16"><p className="text-5xl mb-3">🔖</p><p className="text-gray-400 text-sm">気に入った献立を保存できます</p></div>
          ) : (
            <div className="space-y-3">
              {saved.map(m => (
                <MealCard key={m.id} meal={m} onDelete={() => deleteSaved(m.id)}
                  onCooked={() => markCooked(m.title, m.used)}
                  onAddMissing={m.missing.length > 0 ? () => addMissingToInv(m.missing) : undefined} />
              ))}
            </div>
          )
        )}

        {tab === 'history' && (
          history.length === 0 ? (
            <div className="text-center py-16"><p className="text-5xl mb-3">🍽️</p><p className="text-gray-400 text-sm">「作った」を押すとここに記録されます</p></div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-end">
                <button onClick={() => { if (confirm('履歴をすべて消しますか？')) { setHistory([]); saveHistory([]); } }}
                  className="text-[11px] text-gray-400 hover:text-red-400">履歴クリア</button>
              </div>
              {history.map(h => (
                <div key={h.id} className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-gray-700">{h.title}</span>
                  <span className="text-xs text-gray-400">{h.date}</span>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      {showPhoto && <PhotoModal onAdd={(names) => addMany(names)} onClose={() => setShowPhoto(false)} />}
      {showCloud && (
        <CloudSync bucket="kondate"
          serialize={exportData}
          apply={(json) => importData(json)}
          onClose={() => setShowCloud(false)} />
      )}
    </div>
  );
}
