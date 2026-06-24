'use client';
import { useEffect, useState } from 'react';
import { Entry, todayYMD } from '../lib/storage';

const CACHE_KEY = 'hitokoto_reflect';

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

export default function Reflection({ entries }: { entries: Entry[] }) {
  const [period,  setPeriod]  = useState<'week' | 'month'>('week');
  const [text,    setText]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const today = todayYMD();
  const cutoff = (() => { const d = new Date(today + 'T00:00:00'); d.setDate(d.getDate() - 6); return ymd(d); })();

  // 対象期間の日記
  const target = entries
    .filter(e => period === 'month' ? e.date.startsWith(today.slice(0, 7)) : (e.date >= cutoff && e.date <= today))
    .sort((a, b) => a.date.localeCompare(b.date));

  // この期間の内容シグネチャ（変化したらキャッシュは古いとみなす）
  const sig = JSON.stringify(target.map(e => [e.date, e.text]));

  // 期間切替・内容変化に合わせてキャッシュを読み込む
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setError('');
    try {
      const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      const c = all?.[period];
      setText(c && c.sig === sig ? c.text : '');
    } catch { setText(''); }
  // sig は意図的に依存に含める（内容が変われば読み直す）
  }, [period, sig]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
      setText(data.reflection);
      try {
        const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        all[period] = { sig, text: data.reflection, at: new Date().toISOString() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(all));
      } catch {}
    } catch (e) {
      setError((e as Error)?.name === 'AbortError'
        ? 'AIの応答に時間がかかっています。少し待ってからお試しください。'
        : '通信に失敗しました。少し待ってから再試行してください。');
    } finally {
      setLoading(false);
    }
  }

  const label = period === 'month' ? '今月' : 'この1週間';

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-amber-100/70 p-5 space-y-3">
      {/* 期間切替 */}
      <div className="flex rounded-lg overflow-hidden border border-amber-200 text-xs">
        {(['week', 'month'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-2 font-medium transition-colors ${period === p ? 'bg-amber-600 text-white' : 'bg-white text-amber-700/70'}`}>
            {p === 'week' ? 'この1週間' : '今月'}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-amber-700/50">{label}の記録：{target.length}件</p>

      {target.length < 2 ? (
        <p className="text-sm text-amber-700/60 text-center py-6">
          {label}の記録がまだ少ないようです。もう少したまったら、やさしくふりかえります。
        </p>
      ) : text ? (
        <div className="space-y-3">
          <div className="flex gap-2.5 items-start">
            <span className="text-lg leading-none mt-0.5">🪄</span>
            <p className="text-sm text-amber-900/90 leading-relaxed whitespace-pre-wrap">{text}</p>
          </div>
          <button onClick={generate} disabled={loading}
            className="text-[11px] text-amber-600/70 hover:text-amber-700 disabled:opacity-50">
            {loading ? '考えています…' : '作り直す'}
          </button>
        </div>
      ) : (
        <button onClick={generate} disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          {loading ? '考えています…' : `${label}をAIにふりかえってもらう`}
        </button>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-[10px] text-amber-700/40">※ この期間の日記の本文をAIに送って要約します。</p>
    </section>
  );
}
