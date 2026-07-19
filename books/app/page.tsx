'use client';
import { useEffect, useRef, useState } from 'react';
import { Book, BookCandidate, Recommendation, Shelf, coverColors } from './types';
import { loadBooks, saveBooks, exportData, importData, todayYMD } from './lib/storage';
import CloudSync from './components/CloudSync';
import BookForm from './components/BookForm';
import SearchModal from './components/SearchModal';
import RecommendModal from './components/RecommendModal';

type SortKey = 'added' | 'rating' | 'title';

export default function Home() {
  const [books,   setBooks]   = useState<Book[]>([]);
  const [shelf,   setShelf]   = useState<Shelf>('read');
  const [query,   setQuery]   = useState('');
  const [genreF,  setGenreF]  = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('added');
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Book | undefined>();
  const [draft,    setDraft]    = useState<Partial<Book> | undefined>();
  const [showSearch,    setShowSearch]    = useState(false);
  const [showRecommend, setShowRecommend] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCloud, setShowCloud] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setBooks(loadBooks()); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function persist(next: Book[]) { setBooks(next); saveBooks(next); }

  function handleSave(book: Book) {
    const exists = books.some(b => b.id === book.id);
    persist(exists ? books.map(b => b.id === book.id ? book : b) : [book, ...books]);
    setShowForm(false); setEditing(undefined); setDraft(undefined);
  }
  function handleDelete(id: string) {
    persist(books.filter(b => b.id !== id));
    setShowForm(false); setEditing(undefined);
  }
  function openAdd()  { setEditing(undefined); setDraft({ shelf }); setShowForm(true); }
  function openEdit(b: Book) { setEditing(b); setDraft(undefined); setShowForm(true); }

  // AI検索の候補をフォームへ（現在の本棚に合わせる）
  function pickCandidate(c: BookCandidate) {
    setShowSearch(false);
    setEditing(undefined);
    setDraft({ ...c, shelf });
    setShowForm(true);
  }

  // 検索で見つからない時、入力タイトルのまま手動追加フォームを開く
  function manualFromQuery(title: string) {
    setShowSearch(false);
    setEditing(undefined);
    setDraft({ title, shelf });
    setShowForm(true);
  }

  // おすすめを「読みたい」に追加（重複はスキップ）
  function addWant(r: Recommendation) {
    const dup = books.some(b => b.title === r.title && b.author === r.author);
    if (dup) return;
    const book: Book = {
      id: crypto.randomUUID(),
      title: r.title, author: r.author, genre: r.genre || 'その他',
      shelf: 'want', source: 'ai',
      ...(r.reason ? { memo: `おすすめ理由: ${r.reason}` } : {}),
      addedAt: new Date().toISOString(),
    };
    persist([book, ...books]);
  }

  function moveToRead(b: Book) {
    persist(books.map(x => x.id === b.id ? { ...x, shelf: 'read' } : x));
  }

  // ── バックアップ ──
  function handleExport() {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `本だな_backup_${todayYMD()}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    if (!confirm('現在のデータを上書きします。よろしいですか？')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (importData(ev.target?.result as string)) setBooks(loadBooks());
      else alert('取り込みに失敗しました');
    };
    reader.readAsText(file);
  }

  // ── 絞り込み・並び替え ──
  const shelfBooks = books.filter(b => b.shelf === shelf);
  const genresInUse = [...new Set(shelfBooks.map(b => b.genre).filter(Boolean))];
  const q = query.trim().toLowerCase();
  const filtered = shelfBooks
    .filter(b => !genreF || b.genre === genreF)
    .filter(b => !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || (b.memo ?? '').toLowerCase().includes(q));

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'rating') return (b.rating ?? 0) - (a.rating ?? 0) || b.addedAt.localeCompare(a.addedAt);
    if (sortKey === 'title')  return a.title.localeCompare(b.title, 'ja');
    return b.addedAt.localeCompare(a.addedAt); // 追加が新しい順
  });

  // ── 統計（読んだ本） ──
  const readBooks = books.filter(b => b.shelf === 'read');
  const thisYear = String(new Date().getFullYear());
  const thisYearCount = readBooks.filter(b => (b.finishedAt ?? b.addedAt).startsWith(thisYear)).length;
  const genreCount: Record<string, number> = {};
  readBooks.forEach(b => { genreCount[b.genre] = (genreCount[b.genre] ?? 0) + 1; });
  const topGenre = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  // おすすめ用の入力
  const recRead = readBooks.map(b => ({ title: b.title, author: b.author, genre: b.genre, rating: b.rating }));
  const excludeTitles = books.map(b => b.title);

  return (
    <div className="min-h-screen pb-28">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">📚 AI本だな</h1>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowCloud(true)} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">☁️同期</button>
            <button onClick={handleExport} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">書出</button>
            <button onClick={() => importRef.current?.click()} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">読込</button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </div>

        {/* 本棚タブ */}
        <div className="max-w-lg mx-auto px-4 flex gap-1.5 pb-2">
          {([['read', `📖 読んだ (${readBooks.length})`], ['want', `🔖 読みたい (${books.length - readBooks.length})`]] as [Shelf, string][]).map(([v, l]) => (
            <button key={v} onClick={() => { setShelf(v); setGenreF(''); }}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${shelf === v ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* 検索・並び替え */}
        <div className="max-w-lg mx-auto px-4 pb-2 flex gap-2">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="タイトル・著者・メモで検索"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300" />
          <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
            className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs bg-white text-gray-600">
            <option value="added">追加順</option>
            <option value="rating">評価順</option>
            <option value="title">タイトル順</option>
          </select>
        </div>

        {/* ジャンル絞り込み */}
        {genresInUse.length > 1 && (
          <div className="max-w-lg mx-auto px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
            <button onClick={() => setGenreF('')}
              className={`shrink-0 text-xs px-3 py-1 rounded-full font-medium ${genreF === '' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-500'}`}>
              すべて
            </button>
            {genresInUse.map(g => (
              <button key={g} onClick={() => setGenreF(g === genreF ? '' : g)}
                className={`shrink-0 text-xs px-3 py-1 rounded-full font-medium ${genreF === g ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {g}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 py-3 space-y-2">
        {/* 統計＋おすすめ（読んだタブ） */}
        {shelf === 'read' && readBooks.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-3 mb-1">
            <div className="flex items-center justify-around text-center mb-2">
              <div><p className="text-lg font-bold text-amber-600">{readBooks.length}</p><p className="text-[10px] text-gray-400">冊 読了</p></div>
              <div className="w-px h-8 bg-gray-100" />
              <div><p className="text-lg font-bold text-amber-600">{thisYearCount}</p><p className="text-[10px] text-gray-400">今年</p></div>
              <div className="w-px h-8 bg-gray-100" />
              <div><p className="text-sm font-bold text-amber-600 truncate max-w-[6rem]">{topGenre}</p><p className="text-[10px] text-gray-400">よく読む</p></div>
            </div>
            <button onClick={() => setShowRecommend(true)}
              className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center gap-1.5">
              ✨ 傾向から次の一冊をおすすめ
            </button>
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">📚</p>
            <p className="text-gray-400 text-sm">
              {shelfBooks.length === 0
                ? (shelf === 'read' ? '読んだ本を「＋」から登録しましょう' : '読みたい本をここにためておけます')
                : '条件に合う本がありません'}
            </p>
          </div>
        ) : (
          sorted.map(b => {
            const c = coverColors(b.title);
            return (
              <div key={b.id} className="bg-white rounded-xl shadow-sm p-3">
                <div className="flex gap-3">
                  <button onClick={() => openEdit(b)} className="shrink-0">
                    <div style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                      className="w-11 h-16 rounded-md shadow-sm flex items-center justify-center text-white text-lg font-bold">
                      {b.title.slice(0, 1)}
                    </div>
                  </button>
                  <button onClick={() => openEdit(b)} className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-gray-800 line-clamp-2">{b.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{b.author}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">{b.genre}</span>
                      {b.shelf === 'read' && typeof b.rating === 'number' && b.rating > 0 && (
                        <span className="text-[11px] text-amber-400">{'★'.repeat(b.rating)}<span className="text-gray-200">{'★'.repeat(5 - b.rating)}</span></span>
                      )}
                      {b.finishedAt && <span className="text-[10px] text-gray-400">{b.finishedAt}</span>}
                    </div>
                    {b.memo && <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{b.memo}</p>}
                  </button>
                  {b.shelf === 'want' && (
                    <button onClick={() => moveToRead(b)}
                      className="shrink-0 self-start text-[10px] px-2 py-1 rounded-lg bg-amber-100 text-amber-700 font-medium whitespace-nowrap">
                      読んだ本に
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* アクションボタン（タップで開くメニュー） */}
      {menuOpen && <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />}
      <div className="fixed bottom-6 right-4 flex flex-col items-end gap-2.5 z-40">
        {menuOpen && (
          <>
            <button onClick={() => { setShowSearch(true); setMenuOpen(false); }}
              className="h-10 pl-3 pr-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-xs font-semibold shadow-lg active:scale-95 transition flex items-center gap-1.5">
              🔎 タイトルで探して追加
            </button>
            <button onClick={() => { openAdd(); setMenuOpen(false); }}
              className="h-10 pl-3 pr-4 bg-white text-gray-600 border border-gray-200 rounded-full text-xs font-semibold shadow-lg active:scale-95 transition flex items-center gap-1.5">
              ✏️ 手動で追加
            </button>
          </>
        )}
        <button onClick={() => setMenuOpen(v => !v)} aria-label={menuOpen ? 'メニューを閉じる' : '本を追加'}
          className="w-14 h-14 bg-amber-500 text-white rounded-full text-2xl shadow-lg active:scale-90 transition-transform flex items-center justify-center">
          {menuOpen ? '✕' : '＋'}
        </button>
      </div>

      {showCloud && <CloudSync bucket="books" serialize={exportData} apply={importData} onClose={() => setShowCloud(false)} />}
      {showSearch && <SearchModal onPick={pickCandidate} onManual={manualFromQuery} onClose={() => setShowSearch(false)} />}
      {showRecommend && (
        <RecommendModal read={recRead} exclude={excludeTitles} onAddWant={addWant} onClose={() => setShowRecommend(false)} />
      )}
      {showForm && (
        <BookForm editing={editing} draft={draft} onSave={handleSave}
          onDelete={editing ? () => handleDelete(editing.id) : undefined}
          onClose={() => { setShowForm(false); setEditing(undefined); setDraft(undefined); }} />
      )}
    </div>
  );
}
