'use client';
import { useState } from 'react';
import { PlaceShop, EHIME_AREAS } from '../types';

function mapUrlFor(name: string, address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;
}

interface Props {
  onAdd: (s: PlaceShop, area: string) => void;
  onClose: () => void;
}

export default function GoogleSearchModal({ onAdd, onClose }: Props) {
  const [query,   setQuery]   = useState('');
  const [area,    setArea]    = useState('すべて');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [shops,   setShops]   = useState<PlaceShop[] | null>(null);
  const [added,   setAdded]   = useState<Set<number>>(new Set());

  async function run() {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/newshops/api/gsearch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, area }),
      });
      let data: { shops?: PlaceShop[]; error?: string } | null = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok || !Array.isArray(data?.shops)) {
        setError(res.status === 503 ? 'Google APIキーが未設定です' : (data?.error ?? '検索に失敗しました'));
        return;
      }
      setShops(data.shops);
      setAdded(new Set());
      if (data.shops.length === 0) setError('該当するお店が見つかりませんでした。語を変えてお試しください。');
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
          <h2 className="font-bold text-gray-800 flex items-center gap-1.5">🔍 Googleで探す</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-4 space-y-3 pb-8">
          <p className="text-xs text-gray-400">料理名・店名など自由に。「つけ麺」「クラフトビール」などメニュー寄りの語でも探せます。</p>
          <div className="flex gap-2">
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && run()}
              placeholder="例）つけ麺 / 古民家カフェ"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            <select value={area} onChange={e => setArea(e.target.value)}
              className="border border-gray-200 rounded-xl px-2 py-2 text-xs bg-white text-gray-600">
              <option value="すべて">愛媛全域</option>
              {EHIME_AREAS.filter(a => a !== 'その他').map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <button onClick={run} disabled={loading || !query.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? '検索中…' : 'Googleで探す'}
          </button>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {shops && shops.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-gray-400">{shops.length}件</p>
              {shops.map((s, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {s.name}{s.closed && <span className="text-[10px] text-gray-400 ml-1">（臨時休業）</span>}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {s.genre}{s.price ? `　${s.price}` : ''}
                        {typeof s.rating === 'number' && <span className="ml-1 text-amber-500">★{s.rating.toFixed(1)}{s.reviews ? `(${s.reviews})` : ''}</span>}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{s.address}</p>
                    </div>
                    <button onClick={() => { onAdd(s, area); setAdded(prev => new Set(prev).add(i)); }}
                      disabled={added.has(i)}
                      className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white disabled:bg-gray-200 disabled:text-gray-400">
                      {added.has(i) ? '追加済' : '＋リストへ'}
                    </button>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <a href={s.url || mapUrlFor(s.name, s.address)} target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-600 font-medium">📍 Googleマップ</a>
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-gray-300 text-center pt-1">Powered by Google</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
