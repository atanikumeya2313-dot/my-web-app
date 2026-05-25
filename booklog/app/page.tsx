'use client';
import { useEffect, useState } from 'react';
import { Book, BookStatus } from './types';
import { loadBooks, addBook, updateBook, deleteBook } from './lib/storage';
import BookCard from './components/BookCard';
import BookForm from './components/BookForm';
import BookStats from './components/BookStats';

type Tab = BookStatus | 'stats';

const TABS: { value: Tab; label: string; icon: string }[] = [
  { value: 'want',    label: '読みたい',    icon: '📚' },
  { value: 'reading', label: '読んでいる',  icon: '📖' },
  { value: 'done',    label: '読み終わった', icon: '✅' },
  { value: 'stats',   label: '統計',        icon: '📊' },
];

export default function Home() {
  const [books,    setBooks]    = useState<Book[]>([]);
  const [tab,      setTab]      = useState<Tab>('want');
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Book | undefined>();
  const [query,    setQuery]    = useState('');

  useEffect(() => { setBooks(loadBooks()); }, []);

  const handleSave = (book: Book) => {
    setBooks(editing ? updateBook(book) : addBook(book));
    setEditing(undefined);
  };
  const handleDelete = (id: string) => {
    setBooks(deleteBook(id));
    setEditing(undefined);
  };
  const openEdit = (book: Book) => { setEditing(book); setShowForm(true); };
  const openAdd  = () => { setEditing(undefined); setShowForm(true); };

  const listBooks = tab === 'stats' ? [] : books
    .filter(b => b.status === tab)
    .filter(b => {
      if (!query) return true;
      const q = query.toLowerCase();
      return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    });

  const countOf = (s: BookStatus) => books.filter(b => b.status === s).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">📚 読書記録</h1>
          <span className="text-xs text-gray-400">{books.length}冊登録</span>
        </div>

        {tab !== 'stats' && (
          <div className="max-w-lg mx-auto px-4 pb-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="タイトル・著者で検索"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
        )}

        <div className="max-w-lg mx-auto flex border-t border-gray-100">
          {TABS.map(t => {
            const cnt = t.value !== 'stats' ? countOf(t.value as BookStatus) : null;
            return (
              <button key={t.value} onClick={() => setTab(t.value)}
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

      <main className="max-w-lg mx-auto px-4 py-4">
        {tab === 'stats' ? (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <BookStats books={books} />
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
              <BookCard key={book.id} book={book} onClick={() => openEdit(book)} />
            ))}
          </div>
        )}
      </main>

      <button onClick={openAdd}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-500 text-white rounded-full text-2xl shadow-lg hover:bg-blue-600 flex items-center justify-center z-40">
        +
      </button>

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
