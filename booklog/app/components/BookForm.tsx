'use client';
import { useState } from 'react';
import { Book, BookStatus } from '../types';
import { searchByISBN, searchByKeyword, BookInfo } from '../lib/googleBooks';

interface Props {
  onSave: (book: Book) => void;
  onDelete?: () => void;
  onClose: () => void;
  editing?: Book;
}

const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: 'want',    label: '読みたい' },
  { value: 'reading', label: '読んでいる' },
  { value: 'done',    label: '読み終わった' },
];

export default function BookForm({ onSave, onDelete, onClose, editing }: Props) {
  const [title,      setTitle]      = useState(editing?.title      ?? '');
  const [author,     setAuthor]     = useState(editing?.author     ?? '');
  const [genre,      setGenre]      = useState(editing?.genre      ?? '');
  const [thumbnail,  setThumbnail]  = useState(editing?.thumbnail  ?? '');
  const [isbn,       setIsbn]       = useState(editing?.isbn       ?? '');
  const [status,     setStatus]     = useState<BookStatus>(editing?.status ?? 'want');
  const [rating,     setRating]     = useState(editing?.rating     ?? 0);
  const [memo,       setMemo]       = useState(editing?.memo       ?? '');
  const [startDate,  setStartDate]  = useState(editing?.startDate  ?? '');
  const [endDate,    setEndDate]    = useState(editing?.endDate    ?? '');

  const [query,      setQuery]      = useState('');
  const [results,    setResults]    = useState<BookInfo[]>([]);
  const [searching,  setSearching]  = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    const isIsbn = /^[0-9\-]{9,17}$/.test(query.trim());
    const res = isIsbn
      ? (await searchByISBN(query.replace(/-/g, ''))) ? [await searchByISBN(query.replace(/-/g, '')) as BookInfo] : []
      : await searchByKeyword(query);
    setResults(res.filter(Boolean));
    setSearching(false);
  }

  function applyResult(info: BookInfo) {
    setTitle(info.title);
    setAuthor(info.author);
    setGenre(info.genre);
    setThumbnail(info.thumbnail ?? '');
    setIsbn(info.isbn ?? '');
    setResults([]);
    setQuery('');
  }

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      id:        editing?.id ?? crypto.randomUUID(),
      title:     title.trim(),
      author:    author.trim(),
      genre:     genre.trim(),
      thumbnail: thumbnail || undefined,
      isbn:      isbn || undefined,
      status,
      rating:    rating > 0 ? rating : undefined,
      memo:      memo.trim() || undefined,
      startDate: startDate || undefined,
      endDate:   endDate || undefined,
      addedAt:   editing?.addedAt ?? new Date().toISOString(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full max-w-lg mx-auto rounded-t-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">{editing ? '本を編集' : '本を追加'}</h2>
            {onDelete && (
              <button onClick={() => { if (confirm('削除しますか？')) { onDelete(); onClose(); } }}
                className="text-xs text-red-400 hover:text-red-600">削除</button>
            )}
          </div>

          {/* ISBN・タイトル検索 */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">ISBN・タイトルで検索</p>
            <div className="flex gap-2">
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="ISBN または タイトル"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <button onClick={handleSearch} disabled={searching}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {searching ? '…' : '検索'}
              </button>
            </div>
            {results.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
                {results.map((r, i) => (
                  <button key={i} onClick={() => applyResult(r)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0 text-left">
                    {r.thumbnail
                      ? <img src={r.thumbnail} alt="" className="w-8 h-10 object-cover rounded shrink-0" />
                      : <span className="w-8 h-10 bg-gray-100 rounded flex items-center justify-center text-lg shrink-0">📖</span>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{r.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">{r.author}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* タイトル・著者・ジャンル */}
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="タイトル *" required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <input value={author} onChange={e => setAuthor(e.target.value)}
            placeholder="著者"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <input value={genre} onChange={e => setGenre(e.target.value)}
            placeholder="ジャンル（例：小説、ビジネス）"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />

          {/* ステータス */}
          <div>
            <p className="text-xs text-gray-500 mb-2">ステータス</p>
            <div className="grid grid-cols-3 gap-1.5">
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setStatus(opt.value)}
                  className={`py-2 rounded-xl text-xs font-medium transition-colors ${status === opt.value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 日付 */}
          {(status === 'reading' || status === 'done') && (
            <div>
              <p className="text-xs text-gray-500 mb-2">読み始め日</p>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          )}
          {status === 'done' && (
            <div>
              <p className="text-xs text-gray-500 mb-2">読了日</p>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          )}

          {/* 評価 */}
          {status === 'done' && (
            <div>
              <p className="text-xs text-gray-500 mb-2">評価</p>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setRating(n === rating ? 0 : n)}
                    className={`text-2xl transition-transform ${n <= rating ? 'text-yellow-400' : 'text-gray-200'} hover:scale-110`}>
                    ★
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* メモ */}
          <textarea value={memo} onChange={e => setMemo(e.target.value)}
            placeholder="メモ・感想（任意）" rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" />

          {/* ボタン */}
          <div className="flex gap-2 pb-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">
              キャンセル
            </button>
            <button onClick={handleSave} disabled={!title.trim()}
              className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium disabled:opacity-40">
              {editing ? '保存' : '追加'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
