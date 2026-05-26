'use client';
import { Book, BookStatus } from '../types';

interface Props {
  book: Book;
  onClick: () => void;
  onStatusChange?: (id: string, status: BookStatus, extra?: Partial<Book>) => void;
}

const STATUS_LABEL = { want: '読みたい', reading: '読んでいる', done: '読み終わった' };
const STATUS_COLOR = {
  want:    'bg-gray-100 text-gray-500',
  reading: 'bg-blue-100 text-blue-600',
  done:    'bg-green-100 text-green-700',
};

function Stars({ n }: { n: number }) {
  return (
    <span className="text-yellow-400 text-xs">
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  );
}

export default function BookCard({ book, onClick, onStatusChange }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div onClick={onClick} className="p-3 flex gap-3 items-start cursor-pointer active:opacity-80">
        {/* サムネイル */}
        <div className="shrink-0 w-12 h-16 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
          {book.thumbnail
            ? <img src={book.thumbnail} alt={book.title} className="w-full h-full object-cover" />
            : <span className="text-2xl">📖</span>
          }
        </div>

        {/* 情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-gray-800 leading-snug line-clamp-2">{book.title}</p>
            <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[book.status]}`}>
              {STATUS_LABEL[book.status]}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{book.author}</p>
          {book.genre && <p className="text-[10px] text-gray-400 mt-0.5">{book.genre}</p>}

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {book.rating && <Stars n={book.rating} />}
            {book.endDate && <span className="text-[10px] text-gray-400">読了 {book.endDate}</span>}
            {book.status === 'reading' && book.startDate && (
              <span className="text-[10px] text-gray-400">開始 {book.startDate}</span>
            )}
          </div>

          {book.memo && (
            <p className="text-[11px] text-gray-500 mt-1.5 line-clamp-2 leading-relaxed border-l-2 border-gray-200 pl-2">
              {book.memo}
            </p>
          )}
        </div>
      </div>

      {/* クイックアクション */}
      {onStatusChange && book.status !== 'done' && (
        <div className="border-t border-gray-50 px-3 py-2 flex justify-end">
          {book.status === 'want' && (
            <button
              onClick={e => { e.stopPropagation(); onStatusChange(book.id, 'reading', { startDate: today }); }}
              className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
              📖 読み始める
            </button>
          )}
          {book.status === 'reading' && (
            <button
              onClick={e => { e.stopPropagation(); onStatusChange(book.id, 'done', { endDate: today }); }}
              className="text-xs px-3 py-1 rounded-full bg-green-50 text-green-600 font-medium">
              ✅ 読了にする
            </button>
          )}
        </div>
      )}
    </div>
  );
}
