'use client';
import { useState } from 'react';
import { Book, Shelf, GENRES } from '../types';

interface Props {
  editing?: Book;
  draft?: Partial<Book>;
  onSave: (b: Book) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function BookForm({ editing, draft, onSave, onDelete, onClose }: Props) {
  const base = editing ?? draft ?? {};
  const [title,    setTitle]    = useState(base.title ?? '');
  const [author,   setAuthor]   = useState(base.author ?? '');
  const [genre,    setGenre]    = useState(base.genre ?? GENRES[0]);
  const [year,     setYear]     = useState(base.year ?? '');
  const [shelf,    setShelf]    = useState<Shelf>(base.shelf ?? 'read');
  const [rating,   setRating]   = useState<number>(base.rating ?? 0);
  const [finishedAt, setFinishedAt] = useState(base.finishedAt ?? '');
  const [synopsis, setSynopsis] = useState(base.synopsis ?? '');
  const [memo,     setMemo]     = useState(base.memo ?? '');

  const submit = () => {
    if (!title.trim()) return;
    onSave({
      id:         editing?.id ?? crypto.randomUUID(),
      title:      title.trim(),
      author:     author.trim(),
      genre,
      shelf,
      ...(year.trim()       ? { year: year.trim() }             : {}),
      ...(shelf === 'read' && rating > 0 ? { rating }           : {}),
      ...(shelf === 'read' && finishedAt ? { finishedAt }       : {}),
      ...(synopsis.trim()   ? { synopsis: synopsis.trim() }     : {}),
      ...(memo.trim()       ? { memo: memo.trim() }             : {}),
      ...(base.source       ? { source: base.source }           : {}),
      addedAt:    editing?.addedAt ?? new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-800">{editing ? '本を編集' : '本を追加'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* 本棚（読んだ/読みたい） */}
          <div className="flex gap-2">
            {(['read', 'want'] as Shelf[]).map(s => (
              <button key={s} onClick={() => setShelf(s)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  shelf === s ? 'bg-amber-500 text-white border-amber-500' : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                {s === 'read' ? '📖 読んだ' : '🔖 読みたい'}
              </button>
            ))}
          </div>

          {/* タイトル */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">タイトル *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="本のタイトル"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>

          {/* 著者 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">著者</label>
            <input value={author} onChange={e => setAuthor(e.target.value)}
              placeholder="著者名"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>

          {/* ジャンル */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">ジャンル</label>
            <div className="flex flex-wrap gap-1.5">
              {GENRES.map(g => (
                <button key={g} onClick={() => setGenre(g)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    genre === g ? 'bg-amber-500 text-white border-amber-500' : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 読んだ本の詳細 */}
          {shelf === 'read' && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">評価</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRating(n === rating ? 0 : n)}
                      className={`text-2xl leading-none ${n <= rating ? 'text-amber-400' : 'text-gray-200'}`}>★</button>
                  ))}
                  {rating > 0 && <button onClick={() => setRating(0)} className="ml-2 text-xs text-gray-400 underline">クリア</button>}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">読了日（任意）</label>
                <input type="date" value={finishedAt} onChange={e => setFinishedAt(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300" />
                {finishedAt && <button onClick={() => setFinishedAt('')} className="mt-1 text-xs text-gray-400 underline">クリア</button>}
              </div>
            </>
          )}

          {/* 出版年 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">出版年（任意）</label>
            <input value={year} onChange={e => setYear(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
              placeholder="例）2017" inputMode="numeric"
              className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>

          {/* あらすじ */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">あらすじ・内容（任意）</label>
            <textarea value={synopsis} onChange={e => setSynopsis(e.target.value)} rows={2}
              placeholder="どんな本か"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
          </div>

          {/* 感想 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">感想・メモ（任意）</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={3}
              placeholder="読んで感じたこと・印象に残った点など"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
          </div>
        </div>

        {/* 操作（固定フッター） */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
          {onDelete && (
            <button onClick={onDelete}
              className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium">
              削除
            </button>
          )}
          <button onClick={submit} disabled={!title.trim()}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold disabled:opacity-40">
            {editing ? '更新' : '追加'}
          </button>
        </div>
      </div>
    </div>
  );
}
