'use client';
import { useState } from 'react';
import { SearchShop, GENRES, EHIME_AREAS } from '../types';

const genreName = (code: string) => GENRES.find(g => g.code === code)?.name ?? '';

function mapUrlFor(name: string, address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;
}

interface Props {
  onAdd: (s: SearchShop, area: string) => void;
  onClose: () => void;
}

export default function SearchModal({ onAdd, onClose }: Props) {
  const [area,    setArea]    = useState('すべて');
  const [genre,   setGenre]   = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [shops,   setShops]   = useState<SearchShop[] | null>(null);
  const [relaxed, setRelaxed] = useState(false);
  const [mapped,  setMapped]  = useState('');
  const [added,   setAdded]   = useState<Set<number>>(new Set());

  async function run() {
    if (loading) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/newshops/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area, genre, keyword: keyword.trim() }),
      });
      let data: { shops?: SearchShop[]; relaxed?: boolean; mappedGenre?: string; error?: string } | null = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok || !Array.isArray(data?.shops)) {
        setError(res.status === 503 ? 'ホットペッパーのAPIキーが未設定です' : (data?.error ?? '検索に失敗しました'));
        return;
      }
      setShops(data.shops);
      setRelaxed(!!data.relaxed);
      setMapped(data.mappedGenre ?? '');
      setAdded(new Set());
      if (data.shops.length === 0) setError(`「${keyword.trim()}」では見つかりませんでした。キーワードを変えるか、ジャンルで探してみてください。`);
    } catch {
      setError('通信に失敗しました。少し待ってから再試行してください。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-t-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
          <h2 className="font-bold text-gray-800 flex items-center gap-1.5">🍴 ジャンルでお店を探す</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-4 space-y-3 pb-8">
          {/* エリア・キーワード */}
          <div className="grid grid-cols-2 gap-2">
            <select value={area} onChange={e => setArea(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
              <option value="すべて">愛媛全域</option>
              {EHIME_AREAS.filter(a => a !== 'その他').map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <input value={keyword} onChange={e => setKeyword(e.target.value)}
              placeholder="キーワード（任意）"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          </div>

          {/* ジャンル */}
          <div className="flex flex-wrap gap-1.5">
            {GENRES.map(g => (
              <button key={g.code} onClick={() => setGenre(g.code)}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${genre === g.code ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {g.name}
              </button>
            ))}
          </div>

          <button onClick={run} disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? '検索中…' : 'この条件で探す'}
          </button>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {shops && shops.length > 0 && (
            <div className="space-y-2 pt-1">
              {mapped && (
                <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5">
                  「{keyword.trim()}」は<b>{genreName(mapped)}</b>として検索しました（APIはメニュー名で絞り込めないため）。
                </p>
              )}
              {relaxed && !mapped && (
                <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5">
                  「{keyword.trim()}」では見つからなかったため、キーワードを外して表示しています。
                </p>
              )}
              <p className="text-xs text-gray-400">{shops.length}件</p>
              {shops.map((s, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex gap-3">
                    {s.photo
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={s.photo} alt={s.name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                      : <div className="w-16 h-16 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-gray-300 text-xl">🍴</div>}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{s.genre}{s.budget ? `　${s.budget}` : ''}</p>
                      {s.catch && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{s.catch}</p>}
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{s.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-600 font-medium">🔗 詳細</a>}
                    <a href={mapUrlFor(s.name, s.address)} target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-600 font-medium">📍 地図</a>
                    <button onClick={() => { onAdd(s, area); setAdded(prev => new Set(prev).add(i)); }}
                      disabled={added.has(i)}
                      className="ml-auto text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white disabled:bg-gray-200 disabled:text-gray-400">
                      {added.has(i) ? '追加済' : '＋リストへ'}
                    </button>
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-gray-400 text-center pt-1">
                Powered by{' '}
                <a href="https://webservice.recruit.co.jp/" target="_blank" rel="noopener noreferrer" className="underline">ホットペッパー グルメ Webサービス</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
