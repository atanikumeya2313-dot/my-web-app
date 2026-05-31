'use client';
import { useEffect, useState, useCallback } from 'react';
import { Earthquake, fetchEarthquakes } from './lib/api';
import { TyphoonData, fetchTyphoons } from './lib/typhoonApi';
import EarthquakeCard from './components/EarthquakeCard';
import EarthquakeDetail from './components/EarthquakeDetail';
import EarthquakeStats from './components/EarthquakeStats';
import TyphoonTab from './components/TyphoonTab';

const INTERVAL = 30_000;

function isPinnedQuake(q: Earthquake) {
  return q.maxScale >= 45 || q.hypocenter.magnitude >= 6.0;
}

export default function Home() {
  const [quakes,        setQuakes]        = useState<Earthquake[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [updatedAt,     setUpdatedAt]     = useState<Date | null>(null);
  const [countdown,     setCountdown]     = useState(INTERVAL / 1000);
  const [selected,      setSelected]      = useState<Earthquake | null>(null);
  const [view,          setView]          = useState<'list' | 'stats' | 'typhoon'>('list');
  const [typhoons,      setTyphoons]      = useState<TyphoonData[]>([]);
  const [typhoonLoading,setTyphoonLoading]= useState(true);
  const [typhoonError,  setTyphoonError]  = useState<string | null>(null);
  const [typhoonUpdated,setTyphoonUpdated]= useState<Date | null>(null);

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

  const loadTyphoon = useCallback(async () => {
    try {
      setTyphoonError(null);
      const data = await fetchTyphoons();
      setTyphoons(data);
      setTyphoonUpdated(new Date());
    } catch {
      setTyphoonError('台風データの取得に失敗しました。');
    } finally {
      setTyphoonLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadTyphoon();
    const timer   = setInterval(load, INTERVAL);
    const tyTimer = setInterval(loadTyphoon, INTERVAL);
    const counter = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => { clearInterval(timer); clearInterval(tyTimer); clearInterval(counter); };
  }, [load, loadTyphoon]);

  const fmtUpdated = (d: Date) =>
    `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;

  const pinned = quakes.filter(isPinnedQuake);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-800">🗾 防災情報</h1>
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
              onClick={() => { load(); loadTyphoon(); }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors text-sm"
              title="今すぐ更新"
            >↻</button>
          </div>
        </div>

        {/* 凡例 + ビュー切り替え */}
        <div className="max-w-lg mx-auto px-4 pb-2 flex items-center justify-between gap-2">
          {view !== 'typhoon' && (
            <div className="flex flex-wrap gap-1 text-[10px]">
              {[
                { label: '7',   color: 'bg-purple-700 text-white' },
                { label: '6強', color: 'bg-red-600 text-white' },
                { label: '6弱', color: 'bg-red-500 text-white' },
                { label: '5強', color: 'bg-orange-400 text-white' },
                { label: '5弱', color: 'bg-orange-300 text-white' },
                { label: '4',   color: 'bg-yellow-400 text-gray-900' },
                { label: '3',   color: 'bg-yellow-200 text-gray-900' },
              ].map(({ label, color }) => (
                <span key={label} className={`${color} px-1.5 py-0.5 rounded font-medium`}>震度{label}</span>
              ))}
            </div>
          )}
          {view === 'typhoon' && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <span>🌀 台風情報</span>
              {typhoonUpdated && <span>• 更新 {fmtUpdated(typhoonUpdated)}</span>}
            </div>
          )}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 shrink-0 text-xs">
            <button onClick={() => setView('list')}
              className={`px-2.5 py-1 font-medium transition-colors ${view === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}>
              地震
            </button>
            <button onClick={() => setView('stats')}
              className={`px-2.5 py-1 font-medium transition-colors ${view === 'stats' ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}>
              統計
            </button>
            <button onClick={() => setView('typhoon')}
              className={`px-2.5 py-1 font-medium transition-colors relative ${view === 'typhoon' ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}>
              🌀 台風
              {typhoons.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {typhoons.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-3 space-y-2">
        {/* 地震リスト */}
        {view === 'list' && (
          <>
            {loading && <div className="text-center py-12 text-gray-400 text-sm">読み込み中…</div>}
            {error   && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>}
            {!loading && !error && (
              <>
                {pinned.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-orange-600 flex items-center gap-1">
                      📌 注目の地震（震度5弱以上 / M6.0以上）
                    </p>
                    {pinned.map(q => (
                      <EarthquakeCard key={q.id} quake={q} isLatest={false} isPinned onClick={() => setSelected(q)} />
                    ))}
                  </div>
                )}
                {quakes.length === 0
                  ? <div className="text-center py-12 text-gray-400 text-sm">データがありません</div>
                  : quakes.map((q, i) => (
                      <EarthquakeCard key={q.id} quake={q} isLatest={i === 0} onClick={() => setSelected(q)} />
                    ))
                }
              </>
            )}
          </>
        )}

        {/* 統計 */}
        {view === 'stats' && (
          <>
            {loading && <div className="text-center py-12 text-gray-400 text-sm">読み込み中…</div>}
            {!loading && !error && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <EarthquakeStats quakes={quakes} />
              </div>
            )}
          </>
        )}

        {/* 台風 */}
        {view === 'typhoon' && (
          <TyphoonTab
            typhoons={typhoons}
            loading={typhoonLoading}
            error={typhoonError}
            updatedAt={typhoonUpdated}
          />
        )}
      </main>

      <footer className="max-w-lg mx-auto px-4 py-4 text-center text-[10px] text-gray-300">
        地震: P2PQuake API　台風: 気象庁
      </footer>

      {selected && <EarthquakeDetail quake={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
