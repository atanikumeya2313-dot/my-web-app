'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Book, BookStatus, ReadingGoal, SortKey } from './types';
import {
  loadBooks, addBook, updateBook, deleteBook,
  loadGoal, exportData, importData,
} from './lib/storage';
import BookCard from './components/BookCard';
import BookForm from './components/BookForm';
import BookStats from './components/BookStats';
import { Recommendation } from './api/recommend/route';

type Tab = BookStatus | 'stats' | 'recommend';

const TABS: { value: Tab; label: string; icon: string }[] = [
  { value: 'want',      label: '読みたい',    icon: '📚' },
  { value: 'reading',   label: '読んでいる',  icon: '📖' },
  { value: 'done',      label: '読み終わった', icon: '✅' },
  { value: 'stats',     label: '統計',        icon: '📊' },
  { value: 'recommend', label: 'おすすめ',    icon: '✨' },
];

const SORT_LABELS: Record<SortKey, string> = {
  addedAt: '追加順',
  title:   'タイトル順',
  rating:  '評価順',
  endDate: '読了日順',
};

export default function Home() {
  const [books,    setBooks]    = useState<Book[]>([]);
  const [goal,     setGoal]     = useState<ReadingGoal | null>(null);
  const [tab,      setTab]      = useState<Tab>('want');
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Book | undefined>();
  const [query,    setQuery]    = useState('');
  const [sortKey,  setSortKey]  = useState<SortKey>('addedAt');
  const [showSort, setShowSort] = useState(false);

  const [recs,        setRecs]        = useState<Recommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsFetched, setRecsFetched] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBooks(loadBooks());
    setGoal(loadGoal());
  }, []);

  const fetchRecs = useCallback(async (bookList: Book[]) => {
    setRecsLoading(true);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books: bookList }),
      });
      setRecs(res.ok ? await res.json() : []);
    } catch {
      setRecs([]);
    } finally {
      setRecsLoading(false);
      setRecsFetched(true);
    }
  }, []);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === 'recommend' && !recsFetched) fetchRecs(books);
  };

  const handleSave = (book: Book) => {
    const updated = editing ? updateBook(book) : addBook(book);
    setBooks(updated);
    setEditing(undefined);
    setRecsFetched(false);
  };

  const handleDelete = (id: string) => {
    setBooks(deleteBook(id));
    setEditing(undefined);
    setRecsFetched(false);
  };

  const handleStatusChange = (id: string, status: BookStatus, extra?: Partial<Book>) => {
    const book = books.find(b => b.id === id);
    if (!book) return;
    setBooks(updateBook({ ...book, status, ...extra }));
    setRecsFetched(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = importData(ev.target?.result as string);
      if (result) {
        setBooks(result.books);
        if (result.goal) setGoal(result.goal);
        alert('インポート完了しました');
      } else {
        alert('インポートに失敗しました。ファイル形式を確認してください。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const addToWantList = (rec: Recommendation) => {
    const book: Book = {
      id:        crypto.randomUUID(),
      title:     rec.title,
      author:    rec.author,
      genre:     '',
      thumbnail: rec.thumbnail,
      isbn:      rec.isbn,
      status:    'want',
      addedAt:   new Date().toISOString(),
    };
    setBooks(addBook(book));
  };

  const openEdit = (book: Book) => { setEditing(book); setShowForm(true); };
  const openAdd  = () => { setEditing(undefined); setShowForm(true); };

  function sortBooks(list: Book[]): Book[] {
    return [...list].sort((a, b) => {
      if (sortKey === 'title')   return a.title.localeCompare(b.title, 'ja');
      if (sortKey === 'rating')  return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortKey === 'endDate') {
        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return b.endDate.localeCompare(a.endDate);
      }
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });
  }

  const isListTab = tab !== 'stats' && tab !== 'recommend';
  const listBooks = isListTab ? sortBooks(
    books
      .filter(b => b.status === tab)
      .filter(b => {
        if (!query) return true;
        const q = query.toLowerCase();
        return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
      })
  ) : [];

  const countOf   = (s: BookStatus) => books.filter(b => b.status === s).length;
  const doneCount = countOf('done');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">📚 読書記録</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{books.length}冊</span>
            <button onClick={() => exportData()}
              className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
              書き出し
            </button>
            <button onClick={() => importRef.current?.click()}
              className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
              読み込み
            </button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </div>

        {isListTab && (
          <div className="max-w-lg mx-auto px-4 pb-2 flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="タイトル・著者で検索"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="relative">
              <button onClick={() => setShowSort(v => !v)}
                className={`px-3 py-2 text-xs rounded-xl border transition-colors ${showSort ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                ↕ {SORT_LABELS[sortKey]}
              </button>
              {showSort && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[120px]">
                  {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
                    <button key={k} onClick={() => { setSortKey(k); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs ${sortKey === k ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                      {SORT_LABELS[k]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="max-w-lg mx-auto flex border-t border-gray-100">
          {TABS.map(t => {
            const cnt = (t.value !== 'stats' && t.value !== 'recommend')
              ? countOf(t.value as BookStatus) : null;
            return (
              <button key={t.value} onClick={() => handleTabChange(t.value)}
                className={`relative flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors
                  ${tab === t.value ? 'text-blue-500' : 'text-gray-400'}`}>
                <span className="text-sm leading-none">{t.icon}</span>
                <span className="font-medium text-[10px]">{t.label}</span>
                {cnt !== null && (
                  <span className={`text-[10px] ${tab === t.value ? 'text-blue-400' : 'text-gray-300'}`}>{cnt}</span>
                )}
                {tab === t.value && (
                  <span className="absolute bottom-0 inset-x-3 h-0.5 bg-blue-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 pb-24">
        {tab === 'stats' ? (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <BookStats books={books} goal={goal} onGoalChange={setGoal} />
          </div>

        ) : tab === 'recommend' ? (
          <div>
            {recsLoading ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-3 animate-spin inline-block">⚙️</p>
                <p className="text-gray-400 text-sm mt-2">好みを分析中…</p>
              </div>
            ) : doneCount < 2 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">✨</p>
                <p className="text-gray-400 text-sm">
                  本を2冊以上読んで記録すると<br />おすすめが表示されます
                </p>
              </div>
            ) : recs.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-gray-400 text-sm">おすすめが見つかりませんでした</p>
                <button onClick={() => { setRecsFetched(false); fetchRecs(books); }}
                  className="mt-4 text-xs text-blue-500 underline">再度試す</button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 mb-1">
                  読んだ{doneCount}冊をもとにおすすめを選びました
                </p>
                {recs.map((rec, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm p-3 flex gap-3">
                    {rec.thumbnail ? (
                      <img src={rec.thumbnail} alt="" className="w-12 h-16 object-cover rounded shrink-0"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div className="w-12 h-16 bg-gray-100 rounded shrink-0 flex items-center justify-center text-2xl">📖</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 leading-snug line-clamp-2">{rec.title}</p>
                      {rec.author && <p className="text-xs text-gray-500 mt-0.5 truncate">{rec.author}</p>}
                      <span className="inline-block mt-1.5 text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">
                        {rec.reason}
                      </span>
                      <button onClick={() => addToWantList(rec)}
                        className="mt-2 block text-xs bg-blue-500 text-white px-3 py-1 rounded-full">
                        ＋ 読みたいに追加
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => { setRecsFetched(false); fetchRecs(books); }}
                  className="w-full py-2 text-xs text-gray-400 border border-gray-200 rounded-xl bg-white mt-2">
                  再度おすすめを取得
                </button>
              </div>
            )}
          </div>

        ) : listBooks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">{TABS.find(t => t.value === tab)?.icon}</p>
            <p className="text-gray-400 text-sm">
              {query ? '該当する本がありません' : `${TABS.find(t => t.value === tab)?.label}本はありません`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {listBooks.map(book => (
              <BookCard key={book.id} book={book}
                onClick={() => openEdit(book)}
                onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </main>

      {tab !== 'recommend' && (
        <button onClick={openAdd}
          className="fixed bottom-20 right-4 w-14 h-14 bg-blue-500 text-white rounded-full text-2xl shadow-lg hover:bg-blue-600 flex items-center justify-center z-40">
          +
        </button>
      )}

      {showForm && (
        <BookForm
          editing={editing}
          onSave={handleSave}
          onDelete={editing ? () => handleDelete(editing.id) : undefined}
          onClose={() => { setShowForm(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}
