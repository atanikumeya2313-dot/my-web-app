'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Earthquake, fetchEarthquakes, tsunamiLabel } from './lib/api';
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

// 震度しきい値の選択肢（maxScale値）
const SCALE_FILTERS: { label: string; value: number }[] = [
  { label: 'すべて',  value: 0 },
  { label: '震度3+', value: 30 },
  { label: '震度4+', value: 40 },
  { label: '震度5弱+', value: 45 },
];

// 地域フィルター用：地方ごとの都道府県
const REGIONS: { region: string; prefs: string[] }[] = [
  { region: '北海道', prefs: ['北海道'] },
  { region: '東北', prefs: ['青森県','岩手県','宮城県','秋田県','山形県','福島県'] },
  { region: '関東', prefs: ['茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県'] },
  { region: '中部', prefs: ['新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県'] },
  { region: '近畿', prefs: ['三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県'] },
  { region: '中国', prefs: ['鳥取県','島根県','岡山県','広島県','山口県'] },
  { region: '四国', prefs: ['徳島県','香川県','愛媛県','高知県'] },
  { region: '九州・沖縄', prefs: ['福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'] },
];

// 選択した都道府県で、その地震が該当するか（観測地 or 震源名で判定）
function matchesPref(q: Earthquake, pref: string): boolean {
  if (!pref) return true;
  const base = pref.replace(/[都道府県]$/, '');
  return q.prefectures.some(p => p.includes(base)) || q.hypocenter.name.includes(base);
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
  const [minScale,      setMinScale]      = useState(0);   // 震度しきい値（maxScale）
  const [prefFilter,    setPrefFilter]    = useState('');  // 地域（都道府県）。''=全国

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

    // フィルター設定を復元
    try {
      const ms = parseInt(localStorage.getItem('eq_min_scale') || '0');
      if (!isNaN(ms)) setMinScale(ms);
      setPrefFilter(localStorage.getItem('eq_pref') || '');
    } catch {}

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

  const changeMinScale = (v: number) => {
    setMinScale(v);
    try { localStorage.setItem('eq_min_scale', String(v)); } catch {}
  };
  const changePref = (v: string) => {
    setPrefFilter(v);
    try { localStorage.setItem('eq_pref', v); } catch {}
  };

  // しきい値・地域でフィルタ
  const filtered   = quakes.filter(q => q.maxScale >= minScale && matchesPref(q, prefFilter));
  const pinned     = filtered.filter(isPinnedQuake);
  const pinnedIds  = new Set(pinned.map(q => q.id));
  const unpinned   = filtered.filter(q => !pinnedIds.has(q.id));
  const filterOn   = minScale > 0 || prefFilter !== '';

  // 津波の警報/注意報/調査中（フィルタに関係なく全件から検出して常に強調）
  const tsunamiQuakes = quakes.filter(q =>
    q.domesticTsunami === 'Warning' || q.domesticTsunami === 'Watch' || q.domesticTsunami === 'Checking');
  const hasWarning = tsunamiQuakes.some(q => q.domesticTsunami === 'Warning');
  const hasWatch   = tsunamiQuakes.some(q => q.domesticTsunami === 'Watch');
  const tsunamiStyle = hasWarning
    ? 'bg-red-600 border-red-700 text-white'
    : hasWatch
    ? 'bg-orange-500 border-orange-600 text-white'
    : 'bg-gray-500 border-gray-600 text-white';
  const tsunamiTitle = hasWarning ? '津波警報が発表されています'
    : hasWatch ? '津波注意報が発表されています'
    : '津波の有無を調査中です';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 min-w-0">
              <a href="/" aria-label="入口（ハブ）に戻る" className="text-gray-300 hover:text-gray-600 text-lg leading-none shrink-0">🏠</a>
              <h1 className="text-base font-bold text-gray-800">🗾 防災情報</h1>
            </div>
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
        {/* 津波の警報・注意報・調査中（全ビュー共通で上部に強調表示） */}
        {tsunamiQuakes.length > 0 && (
          <div className={`rounded-xl p-3 border shadow-sm ${tsunamiStyle}`}>
            <p className="font-bold text-sm flex items-center gap-1.5">🌊 {tsunamiTitle}</p>
            <div className="mt-1.5 space-y-0.5">
              {tsunamiQuakes.slice(0, 3).map(q => (
                <p key={q.id} className="text-xs opacity-95">
                  {q.hypocenter.name || '震源地不明'}（{tsunamiLabel(q.domesticTsunami) ?? '調査中'}）
                </p>
              ))}
            </div>
          </div>
        )}

        {/* 地震リスト */}
        {view === 'list' && (
          <>
            {loading && <div className="text-center py-12 text-gray-400 text-sm">読み込み中…</div>}
            {error   && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>}
            {!loading && !error && (
              <>
                {/* フィルター（震度しきい値・地域） */}
                <div className="bg-white rounded-xl shadow-sm p-2.5 flex flex-wrap items-center gap-2">
                  <div className="flex gap-1">
                    {SCALE_FILTERS.map(f => (
                      <button key={f.value} onClick={() => changeMinScale(f.value)}
                        className={`text-[11px] px-2 py-1 rounded-full font-medium transition-colors ${minScale === f.value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <select value={prefFilter} onChange={e => changePref(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white ml-auto">
                    <option value="">全国</option>
                    {REGIONS.map(r => (
                      <optgroup key={r.region} label={r.region}>
                        {r.prefs.map(p => <option key={p} value={p}>{p}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                {filterOn && (
                  <p className="text-[10px] text-gray-400 px-1 flex items-center gap-1.5">
                    絞り込み中：{filtered.length}件
                    <button onClick={() => { changeMinScale(0); changePref(''); }}
                      className="text-blue-400 underline">クリア</button>
                  </p>
                )}

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
                {filtered.length === 0
                  ? <div className="text-center py-12 text-gray-400 text-sm">
                      {quakes.length === 0 ? 'データがありません' : '条件に合う地震がありません'}
                    </div>
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
