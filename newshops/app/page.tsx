'use client';
import { useEffect, useRef, useState } from 'react';
import { Shop, ShopStatus, ShopCandidate, SearchShop, PlaceShop, EHIME_AREAS } from './types';
import { loadShops, saveShops, daysUntil, mapUrl, exportData, importData } from './lib/storage';
import ShopForm from './components/ShopForm';
import DiscoverModal from './components/DiscoverModal';
import SearchModal from './components/SearchModal';
import GoogleSearchModal from './components/GoogleSearchModal';

type StatusFilter = 'all' | 'planned' | 'open';

export default function Home() {
  const [shops,    setShops]    = useState<Shop[]>([]);
  const [statusF,  setStatusF]  = useState<StatusFilter>('all');
  const [areaF,    setAreaF]    = useState('');
  const [query,    setQuery]    = useState('');
  const [favOnly,  setFavOnly]  = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Shop | undefined>();
  const [draft,    setDraft]    = useState<Partial<Shop> | undefined>();
  const [showAi,   setShowAi]   = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setShops(loadShops()); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function persist(next: Shop[]) { setShops(next); saveShops(next); }

  function handleSave(shop: Shop) {
    const exists = shops.some(s => s.id === shop.id);
    persist(exists ? shops.map(s => s.id === shop.id ? shop : s) : [shop, ...shops]);
    setShowForm(false); setEditing(undefined); setDraft(undefined);
  }
  function handleDelete(id: string) {
    persist(shops.filter(s => s.id !== id));
    setShowForm(false); setEditing(undefined);
  }
  function toggleFav(id: string) {
    persist(shops.map(s => s.id === id ? { ...s, favorite: !s.favorite } : s));
  }
  function addFromCandidate(c: ShopCandidate) {
    const shop: Shop = {
      id: crypto.randomUUID(),
      name: c.name, category: c.category || 'その他', area: c.area || '',
      status: c.status === 'open' ? 'open' : 'planned',
      ...(c.openDate ? { openDate: c.openDate } : {}),
      ...(c.note ? { memo: c.note } : {}),
      favorite: false, source: 'ai', createdAt: new Date().toISOString(),
    };
    persist([shop, ...shops]);
  }

  function addFromSearch(s: SearchShop, selectedArea: string) {
    // 住所から市町を抽出（無ければ選択中エリア）
    const cityMatch = s.address.match(/[^\s　]+?[市町村]/);
    const area = (selectedArea && selectedArea !== 'すべて') ? selectedArea : (cityMatch?.[0] ?? '');
    const memo = [s.catch, s.access].filter(Boolean).join(' / ');
    const shop: Shop = {
      id: crypto.randomUUID(),
      name: s.name, category: s.genre || 'その他', area,
      status: 'open',
      ...(s.url ? { url: s.url } : {}),
      ...(memo ? { memo } : {}),
      favorite: false, source: 'hotpepper', createdAt: new Date().toISOString(),
    };
    persist([shop, ...shops]);
  }

  function addFromPlace(s: PlaceShop, selectedArea: string) {
    const cityMatch = s.address.match(/[^\s　]+?[市町村]/);
    const area = (selectedArea && selectedArea !== 'すべて') ? selectedArea : (cityMatch?.[0] ?? '');
    const memo = [typeof s.rating === 'number' ? `★${s.rating}${s.reviews ? `(${s.reviews})` : ''}` : '', s.price].filter(Boolean).join(' / ');
    const shop: Shop = {
      id: crypto.randomUUID(),
      name: s.name, category: s.genre || 'その他', area,
      status: 'open',
      ...(s.url ? { url: s.url } : {}),
      ...(memo ? { memo } : {}),
      favorite: false, source: 'google', createdAt: new Date().toISOString(),
    };
    persist([shop, ...shops]);
  }

  function openAdd()  { setEditing(undefined); setDraft(undefined); setShowForm(true); }
  function openEdit(s: Shop) { setEditing(s); setDraft(undefined); setShowForm(true); }

  // ── バックアップ ──
  function handleExport() {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `新店_backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    if (!confirm('現在のデータを上書きします。よろしいですか？')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try { if (importData(JSON.parse(ev.target?.result as string))) setShops(loadShops()); else alert('取り込みに失敗しました'); }
      catch { alert('JSONの読み込みに失敗しました'); }
    };
    reader.readAsText(file);
  }

  // ── 絞り込み・並び替え ──
  const q = query.trim().toLowerCase();
  const filtered = shops
    .filter(s => statusF === 'all' || s.status === statusF)
    .filter(s => !areaF || s.area === areaF)
    .filter(s => !favOnly || s.favorite)
    .filter(s => !q || s.name.toLowerCase().includes(q) || (s.memo ?? '').toLowerCase().includes(q) || s.category.toLowerCase().includes(q));

  const sorted = [...filtered].sort((a, b) => {
    // 予定: 近い順（昇順）／ オープン済・すべて: 新しい順（降順）。日付なしは末尾
    const asc = statusF === 'planned';
    const da = a.openDate ?? ''; const db = b.openDate ?? '';
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return asc ? da.localeCompare(db) : db.localeCompare(da);
  });

  const areasInUse = [...new Set(shops.map(s => s.area).filter(Boolean))].sort(
    (a, b) => EHIME_AREAS.indexOf(a) - EHIME_AREAS.indexOf(b));

  function badge(s: Shop) {
    const d = daysUntil(s.openDate);
    if (s.status === 'planned') {
      if (d === null) return { t: '予定', cls: 'bg-amber-50 text-amber-600' };
      if (d < 0)  return { t: 'オープン済?', cls: 'bg-gray-100 text-gray-400' };
      if (d === 0) return { t: '本日OPEN', cls: 'bg-red-500 text-white' };
      if (d <= 14) return { t: `あと${d}日`, cls: 'bg-red-100 text-red-600' };
      return { t: `予定 ${s.openDate!.slice(5).replace('-', '/')}`, cls: 'bg-amber-50 text-amber-600' };
    }
    if (d !== null && d >= -30) return { t: 'NEW', cls: 'bg-emerald-500 text-white' };
    return { t: 'オープン済', cls: 'bg-emerald-50 text-emerald-600' };
  }

  return (
    <div className="min-h-screen pb-28">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">🏪 えひめ新店チェック</h1>
          <div className="flex items-center gap-1.5">
            <button onClick={handleExport} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">書出</button>
            <button onClick={() => importRef.current?.click()} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">読込</button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </div>

        {/* 状態タブ */}
        <div className="max-w-lg mx-auto px-4 flex gap-1.5 pb-2">
          {([['all','すべて'],['planned','オープン予定'],['open','オープン済']] as [StatusFilter,string][]).map(([v,l]) => (
            <button key={v} onClick={() => setStatusF(v)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${statusF === v ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {l}
            </button>
          ))}
          <button onClick={() => setFavOnly(v => !v)}
            className={`ml-auto text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${favOnly ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
            ★気になる
          </button>
        </div>

        {/* 検索・エリア */}
        <div className="max-w-lg mx-auto px-4 pb-2 flex gap-2">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="店名・メモで検索"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          {areasInUse.length > 0 && (
            <select value={areaF} onChange={e => setAreaF(e.target.value)}
              className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs bg-white text-gray-600">
              <option value="">全エリア</option>
              {areasInUse.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-3 space-y-2">
        {shops.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🏪</p>
            <p className="text-gray-400 text-sm">「AIで探す」で候補を見つけるか、＋で手動追加できます</p>
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">条件に合うお店がありません</p>
        ) : (
          sorted.map(s => {
            const b = badge(s);
            return (
              <div key={s.id} className="bg-white rounded-xl shadow-sm p-3">
                <div className="flex items-start gap-2">
                  <button onClick={() => openEdit(s)} className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${b.cls}`}>{b.t}</span>
                      <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {s.category}{s.area ? `　${s.area}` : ''}{s.openDate ? `　${s.openDate}` : ''}
                    </p>
                    {s.memo && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.memo}</p>}
                  </button>
                  <button onClick={() => toggleFav(s.id)}
                    className={`shrink-0 text-lg leading-none ${s.favorite ? 'text-amber-400' : 'text-gray-200'}`}>★</button>
                </div>
                <div className="flex gap-3 mt-2 pl-0.5">
                  <a href={mapUrl(s.name, s.area)} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-emerald-600 font-medium">📍 地図</a>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-emerald-600 font-medium truncate">🔗 リンク</a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* アクションボタン（タップで開くメニュー） */}
      {menuOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
      )}
      <div className="fixed bottom-6 right-4 flex flex-col items-end gap-2.5 z-40">
        {menuOpen && (
          <>
            <button onClick={() => { setShowGoogle(true); setMenuOpen(false); }}
              className="h-10 pl-3 pr-4 bg-white text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold shadow-lg active:scale-95 transition flex items-center gap-1.5">
              🔍 Googleで探す
            </button>
            <button onClick={() => { setShowSearch(true); setMenuOpen(false); }}
              className="h-10 pl-3 pr-4 bg-white text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold shadow-lg active:scale-95 transition flex items-center gap-1.5">
              🍴 ジャンルで探す
            </button>
            <button onClick={() => { setShowAi(true); setMenuOpen(false); }}
              className="h-10 pl-3 pr-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full text-xs font-semibold shadow-lg active:scale-95 transition flex items-center gap-1.5">
              🔎 AIで新店を探す
            </button>
            <button onClick={() => { openAdd(); setMenuOpen(false); }}
              className="h-10 pl-3 pr-4 bg-white text-gray-600 border border-gray-200 rounded-full text-xs font-semibold shadow-lg active:scale-95 transition flex items-center gap-1.5">
              ✏️ 手動で追加
            </button>
          </>
        )}
        <button onClick={() => setMenuOpen(v => !v)} aria-label={menuOpen ? 'メニューを閉じる' : 'お店を追加'}
          className="w-14 h-14 bg-emerald-600 text-white rounded-full text-2xl shadow-lg active:scale-90 transition-transform flex items-center justify-center">
          {menuOpen ? '✕' : '＋'}
        </button>
      </div>

      {showGoogle && (
        <GoogleSearchModal onAdd={addFromPlace} onClose={() => setShowGoogle(false)} />
      )}
      {showSearch && (
        <SearchModal onAdd={addFromSearch} onClose={() => setShowSearch(false)} />
      )}
      {showAi && (
        <DiscoverModal onAdd={addFromCandidate} onClose={() => setShowAi(false)} />
      )}
      {showForm && (
        <ShopForm editing={editing} draft={draft} onSave={handleSave}
          onDelete={editing ? handleDelete : undefined}
          onClose={() => { setShowForm(false); setEditing(undefined); setDraft(undefined); }} />
      )}
    </div>
  );
}
