'use client';
import { useEffect, useMemo, useState } from 'react';
import { Entry, todayYMD, ReflectionRecord, loadReflections, upsertReflection } from '../lib/storage';

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// その日を含む週の月曜
function mondayOf(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = (d.getDay() + 6) % 7; // 月曜=0
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

// 通信断のみ再試行（混雑/一時エラーの再試行はサーバー側）
async function aiFetch(body: unknown): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 65000);
    try {
      const res = await fetch('/diary/api/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < 2) { await new Promise(r => setTimeout(r, 800 * (attempt + 1))); continue; }
      throw e;
    }
  }
  throw lastErr;
}

function fmtAt(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function Reflection({ entries }: { entries: Entry[] }) {
  const [period,  setPeriod]  = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [history, setHistory] = useState<ReflectionRecord[]>([]);
  const [openId,  setOpenId]  = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setHistory(loadReflections()); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const today = todayYMD();

  // 現在の期間のキー・ラベル・対象日記
  const { key, label, target } = useMemo(() => {
    if (period === 'month') {
      const mk = today.slice(0, 7);
      const [y, m] = mk.split('-');
      return {
        key: mk,
        label: `${y}年${Number(m)}月`,
        target: entries.filter(e => e.date.startsWith(mk)).sort((a, b) => a.date.localeCompare(b.date)),
      };
    }
    const ws = mondayOf(today);
    const wsY = ymd(ws);
    const we = new Date(ws); we.setDate(we.getDate() + 6);
    return {
      key: wsY,
      label: `${ws.getMonth() + 1}/${ws.getDate()}〜${we.getMonth() + 1}/${we.getDate()}の週`,
      target: entries.filter(e => e.date >= wsY && e.date <= today).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }, [period, entries, today]);

  const sig = JSON.stringify(target.map(e => [e.date, e.text]));
  const current = history.find(r => r.period === period && r.key === key);
  const stale = current ? current.sig !== sig : false;

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await aiFetch({ period, entries: target.map(e => ({ date: e.date, text: e.text })) });
      let data: { reflection?: string; error?: string } | null = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok || !data?.reflection) {
        setError(res.status === 503 ? 'AI機能はまだ準備中です（APIキー未設定）' : (data?.error ?? '生成に失敗しました'));
        return;
      }
      const rec: ReflectionRecord = {
        id: current?.id ?? crypto.randomUUID(),
        period, key, label, sig,
        text: data.reflection,
        at: new Date().toISOString(),
      };
      setHistory(upsertReflection(rec));
    } catch (e) {
      setError((e as Error)?.name === 'AbortError'
        ? 'AIの応答に時間がかかっています。少し待ってからお試しください。'
        : '通信に失敗しました。少し待ってから再試行してください。');
    } finally {
      setLoading(false);
    }
  }

  // 過去のふりかえり（今表示中の期間そのものは上に出すので一覧からは除外）
  const past = history.filter(r => !(r.period === period && r.key === key));

  return (
    <div className="space-y-3">
      {/* 今期間の生成 */}
      <section className="bg-white rounded-2xl shadow-sm border border-amber-100/70 p-5 space-y-3">
        <div className="flex rounded-lg overflow-hidden border border-amber-200 text-xs">
          {(['week', 'month'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 py-2 font-medium transition-colors ${period === p ? 'bg-amber-600 text-white' : 'bg-white text-amber-700/70'}`}>
              {p === 'week' ? '今週' : '今月'}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-amber-700/50">{label}　記録：{target.length}件</p>

        {current && (
          <div className="space-y-2">
            <div className="flex gap-2.5 items-start">
              <span className="text-lg leading-none mt-0.5">🪄</span>
              <p className="text-sm text-amber-900/90 leading-relaxed whitespace-pre-wrap">{current.text}</p>
            </div>
            {stale && (
              <p className="text-[11px] text-amber-600">※ この後に記録が増えています。「作り直す」で最新にできます。</p>
            )}
            <p className="text-[10px] text-amber-700/40 text-right">生成: {fmtAt(current.at)}</p>
          </div>
        )}

        {target.length < 2 ? (
          !current && <p className="text-sm text-amber-700/60 text-center py-4">記録がまだ少ないようです。もう少したまったら、やさしくふりかえります。</p>
        ) : (
          <button onClick={generate} disabled={loading}
            className={`w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2
              ${current ? 'text-amber-700 border border-amber-200 bg-white' : 'text-white bg-amber-700 hover:bg-amber-800'}`}>
            {loading && <span className={`w-4 h-4 border-2 rounded-full animate-spin ${current ? 'border-amber-300 border-t-transparent' : 'border-white/40 border-t-white'}`} />}
            {loading ? '考えています…' : current ? (stale ? '最新の内容で作り直す' : '作り直す') : `${label}をAIにふりかえってもらう`}
          </button>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
        <p className="text-[10px] text-amber-700/40">※ この期間の日記の本文をAIに送って要約します。結果は端末に保存され、バックアップにも含まれます。</p>
      </section>

      {/* 過去のふりかえり */}
      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-amber-700/70 mb-2 px-1">これまでのふりかえり</h2>
          <div className="space-y-2">
            {past.map(r => (
              <div key={r.id} className="bg-white/70 rounded-2xl border border-amber-100/60 overflow-hidden">
                <button onClick={() => setOpenId(openId === r.id ? null : r.id)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left">
                  <div className="min-w-0">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full mr-1.5 ${r.period === 'month' ? 'bg-orange-50 text-orange-500' : 'bg-amber-50 text-amber-600'}`}>
                      {r.period === 'month' ? '月' : '週'}
                    </span>
                    <span className="text-xs font-medium text-amber-800">{r.label}</span>
                  </div>
                  <span className="text-[10px] text-amber-700/40 shrink-0">{openId === r.id ? '閉じる' : '見る'}</span>
                </button>
                {openId === r.id && (
                  <div className="px-4 pb-3 -mt-1 flex gap-2 items-start">
                    <span className="text-base leading-none mt-0.5">🪄</span>
                    <p className="text-xs text-amber-900/80 leading-relaxed whitespace-pre-wrap">{r.text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
