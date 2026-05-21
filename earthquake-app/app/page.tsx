'use client';
import { useEffect, useState, useCallback } from 'react';
import { Earthquake, fetchEarthquakes } from './lib/api';
import EarthquakeCard from './components/EarthquakeCard';

const INTERVAL = 30_000;

export default function Home() {
  const [quakes,    setQuakes]    = useState<Earthquake[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(INTERVAL / 1000);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchEarthquakes();
      setQuakes(data);
      setUpdatedAt(new Date());
      setCountdown(INTERVAL / 1000);
    } catch {
      setError('データの取得に失敗しました。しばらくお待ちください。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer   = setInterval(load, INTERVAL);
    const counter = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => { clearInterval(timer); clearInterval(counter); };
  }, [load]);

  const fmtUpdated = (d: Date) =>
    `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-800">🗾 地震情報</h1>
            <p className="text-[10px] text-gray-400">
              {updatedAt ? `最終更新 ${fmtUpdated(updatedAt)}` : '取得中…'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[10px] text-gray-400">次回更新</p>
              <p className="text-xs font-mono font-semibold text-blue-500">{countdown}s</p>
            </div>
            <button
              onClick={load}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors text-sm"
              title="今すぐ更新"
            >
              ↻
            </button>
          </div>
        </div>
      </header>

      {/* 震度凡例 */}
      <div className="max-w-lg mx-auto px-4 pt-3 pb-1">
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {[
            { label: '7',   color: 'bg-purple-700 text-white' },
            { label: '6強', color: 'bg-red-600 text-white' },
            { label: '6弱', color: 'bg-red-500 text-white' },
            { label: '5強', color: 'bg-orange-400 text-white' },
            { label: '5弱', color: 'bg-orange-300 text-white' },
            { label: '4',   color: 'bg-yellow-400 text-gray-900' },
            { label: '3',   color: 'bg-yellow-200 text-gray-900' },
            { label: '1-2', color: 'bg-blue-100 text-gray-700' },
          ].map(({ label, color }) => (
            <span key={label} className={`${color} px-2 py-0.5 rounded font-medium`}>震度{label}</span>
          ))}
        </div>
      </div>

      {/* リスト */}
      <main className="max-w-lg mx-auto px-4 py-3 space-y-2">
        {loading && (
          <div className="text-center py-12 text-gray-400 text-sm">読み込み中…</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>
        )}
        {!loading && !error && quakes.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">データがありません</div>
        )}
        {quakes.map((q, i) => (
          <EarthquakeCard key={q.id} quake={q} isLatest={i === 0} />
        ))}
      </main>

      <footer className="max-w-lg mx-auto px-4 py-4 text-center text-[10px] text-gray-300">
        データ提供: P2PQuake API
      </footer>
    </div>
  );
}
