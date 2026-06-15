'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Earthquake, fetchEarthquakes } from './lib/api';
import { TyphoonData, fetchTyphoons } from './lib/typhoonApi';
import {
  loadSeenIds, saveSeenIds, loadNotifyEnabled, saveNotifyEnabled,
  ensureNotifyPermission, notifyQuake, notifySupported, isSignificant,
} from './lib/notify';
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
  const [newIds,        setNewIds]        = useState<Set<string>>(new Set());
  const [notifyOn,      setNotifyOn]      = useState(false);

  // 新着判定・通知のための「既読ID」と通知設定。再描画に依存しないよう ref で保持
  const seenRef       = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const notifyRef     = useRef(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchEarthquakes();
      setQuakes(data);
      setUpdatedAt(new Date());
      setCountdown(INTERVAL / 1000);

      // 新着（前回までに見ていないID）を抽出
      const ids = data.map(q => q.id);
      if (!initializedRef.current) {
        // 初回：保存済み既読と突き合わせ、前回訪問以降の新着のみハイライト
        initializedRef.current = true;
        const hadSeen = seenRef.current.size > 0;
        const fresh = hadSeen ? data.filter(q => !seenRef.current.has(q.id)) : [];
        setNewIds(new Set(fresh.map(q => q.id)));
      } else {
        const fresh = data.filter(q => !seenRef.current.has(q.id));
        setNewIds(new Set(fresh.map(q => q.id)));
        if (notifyRef.current) {
          fresh.filter(isSignificant).slice(0, 3).forEach(notifyQuake);
        }
      }
      seenRef.current = new Set(ids);
      saveSeenIds(ids);
    } catch {
      setError('データの取得に失敗しました。しばらくお待ちください。');
      setCountdown(INTERVAL / 1000);
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

  // 手動更新・可視化復帰からタイマーを張り直せるよう、restart を ref で公開
  const restartRef = useRef<() => void>(() => {});

  useEffect(() => {
    // 永続化していた既読IDと通知設定を復元
    seenRef.current = new Set(loadSeenIds());
    const savedNotify = loadNotifyEnabled() && notifySupported() && Notification.permission === 'granted';
    notifyRef.current = savedNotify;
    setNotifyOn(savedNotify);

    let dataTimer: ReturnType<typeof setInterval>;
    let tyTimer:   ReturnType<typeof setInterval>;
    let counter:   ReturnType<typeof setInterval>;

    const start = () => {
      dataTimer = setInterval(load, INTERVAL);
      tyTimer   = setInterval(loadTyphoon, INTERVAL);
      counter   = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    };
    const stop = () => { clearInterval(dataTimer); clearInterval(tyTimer); clearInterval(counter); };
    const restart = () => { stop(); setCountdown(INTERVAL / 1000); start(); };
    restartRef.current = restart;

    load();
    loadTyphoon();
    start();

    // タブが非表示の間はポーリングを止め、復帰時にまとめて更新（省電力・省通信）
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        load();
        loadTyphoon();
        restart();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [load, loadTyphoon]);

  const handleRefresh = () => { load(); loadTyphoon(); restartRef.current(); };

  const toggleNotify = async () => {
    if (notifyOn) {
      setNotifyOn(false);
      notifyRef.current = false;
      saveNotifyEnabled(false);
      return;
    }
    const ok = await ensureNotifyPermission();
    setNotifyOn(ok);
    notifyRef.current = ok;
    saveNotifyEnabled(ok);
    if (!ok && notifySupported() && Notification.permission === 'denied') {
      alert('ブラウザの設定で通知がブロックされています。サイトの通知を許可してください。');
    }
  };

  const fmtUpdated = (d: Date) =>
    `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;

  const pinned     = quakes.filter(isPinnedQuake);
  const pinnedIds  = new Set(pinned.map(q => q.id));
  const unpinned   = quakes.filter(q => !pinnedIds.has(q.id));

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
            {notifySupported() && (
              <button
                onClick={toggleNotify}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors text-sm ${
                  notifyOn ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
                title={notifyOn ? '地震通知：ON（震度3以上 / M5.0以上）' : '地震通知：OFF'}
                aria-pressed={notifyOn}
              >{notifyOn ? '🔔' : '🔕'}</button>
            )}
            <button
              onClick={handleRefresh}
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
                      <EarthquakeCard key={q.id} quake={q} isLatest={false} isPinned isNew={newIds.has(q.id)} onClick={() => setSelected(q)} />
                    ))}
                  </div>
                )}
                {quakes.length === 0
                  ? <div className="text-center py-12 text-gray-400 text-sm">データがありません</div>
                  : unpinned.map((q, i) => (
                      <EarthquakeCard key={q.id} quake={q} isLatest={i === 0 && pinned.length === 0} isNew={newIds.has(q.id)} onClick={() => setSelected(q)} />
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
            {error   && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>}
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
