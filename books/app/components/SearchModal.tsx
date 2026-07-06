'use client';
import { useState } from 'react';
import { BookCandidate } from '../types';

interface Props {
  onPick: (b: BookCandidate) => void;   // 候補を選んでフォームへ
  onClose: () => void;
}

export default function SearchModal({ onPick, onClose }: Props) {
  const [query,   setQuery]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [books,   setBooks]   = useState<BookCandidate[] | null>(null);

  async function run() {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true); setError('');
    try {
      // 通信断は最大3回まで再試行。混雑/一時エラーの再試行はサーバー側で行う。
      let res!: Response;
      for (let attempt = 0; ; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 40000);
        try {
          res = await fetch('/books/api/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: q }),
            signal: ctrl.signal,
          });
        } catch (e) {
          if (attempt < 2) { await new Promise(r => setTimeout(r, 800 * (attempt + 1))); continue; }
          throw e;
        } finally {
          clearTimeout(timer);
        }
        break;
      }
      let data: { books?: BookCandidate[]; error?: string } | null = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok || !Array.isArray(data?.books)) {
        setError(res.status === 503 ? 'AI機能はまだ準備中です（APIキー未設定）' : (data?.error ?? '検索に失敗しました'));
        return;
      }
      setBooks(data.books);
      if (data.books.length === 0) setError('見つかりませんでした。タイトルや著者名を変えてお試しください。');
    } catch (e) {
      setError((e as Error)?.name === 'AbortError'
        ? 'AIの応答に時間がかかっています。少し待ってからお試しください。'
        : '通信に失敗しました。少し待ってから再試行してください。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-800 flex items-center gap-1.5">🔎 タイトルで探して追加</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-4 space-y-3 pb-8">
          <p className="text-xs text-gray-400">タイトル（あいまいでも可）や著者名を入れると、AIが本の情報を探して候補を出します。</p>
          <div className="flex gap-2">
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && run()}
              placeholder="例）かがみの孤城 / 村上春樹"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>
          <button onClick={run} disabled={loading || !query.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? '探しています…' : 'AIで探す'}
          </button>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {books && books.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-gray-400">{books.length}件の候補（タップで追加へ）</p>
              {books.map((b, i) => (
                <button key={i} onClick={() => onPick(b)}
                  className="w-full text-left border border-gray-200 rounded-xl p-3 hover:bg-amber-50 transition-colors">
                  <p className="text-sm font-semibold text-gray-800">{b.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {b.author}{b.genre ? `　${b.genre}` : ''}{b.year ? `　${b.year}` : ''}
                  </p>
                  {b.synopsis && <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{b.synopsis}</p>}
                </button>
              ))}
              <p className="text-[10px] text-gray-300 text-center pt-1">AIによる情報のため、念のためご確認ください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
