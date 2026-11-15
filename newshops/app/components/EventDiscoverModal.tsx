'use client';
import { useState } from 'react';
import { EventCandidate, EHIME_AREAS } from '../types';

interface Source { title: string; uri: string }
interface Props {
  onAdd: (c: EventCandidate) => void;
  onClose: () => void;
}

function fmtDate(c: EventCandidate): string {
  if (!c.startDate) return '日程未定';
  const s = c.startDate.slice(5).replace('-', '/');
  if (c.endDate && c.endDate !== c.startDate) return `${s}〜${c.endDate.slice(5).replace('-', '/')}`;
  return s;
}

export default function EventDiscoverModal({ onAdd, onClose }: Props) {
  const [area,    setArea]    = useState('すべて');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [events,  setEvents]  = useState<EventCandidate[] | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [added,   setAdded]   = useState<Set<number>>(new Set());

  async function search() {
    if (loading) return;
    setLoading(true); setError('');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 75000);
    try {
      const res = await fetch('/newshops/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area, keyword: keyword.trim() }),
        signal: ctrl.signal,
      });
      let data: { events?: EventCandidate[]; sources?: Source[]; error?: string } | null = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok || !Array.isArray(data?.events)) {
        if (res.status === 503) setError('AI機能はまだ準備中です（APIキー未設定）');
        else if (res.status === 429) setError(data?.error ?? '短時間に多く実行したため制限中です。少し待って再実行してください。');
        else setError(data?.error ?? '検索が時間内に終わりませんでした。混雑時は時間がかかります。もう一度お試しください。');
        return;
      }
      setEvents(data.events);
      setSources(data.sources ?? []);
      setAdded(new Set());
      if (data.events.length === 0) setError('候補が見つかりませんでした。キーワードを変えてお試しください。');
    } catch (e) {
      setError((e as Error)?.name === 'AbortError'
        ? '検索に時間がかかりすぎました。もう一度お試しください。'
        : '通信に失敗しました。少し待ってから再試行してください。');
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
          <h2 className="font-bold text-gray-800 flex items-center gap-1.5">🎪 AIでイベントを探す</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-4 space-y-3 pb-8">
          <p className="text-xs text-gray-400">愛媛県内でこれから開催・開催中のイベントをAI（Google検索連携）が探します。<b>30〜60秒ほどかかります</b>。日程・会場は要確認です。</p>

          <div className="grid grid-cols-2 gap-2">
            <select value={area} onChange={e => setArea(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
              <option value="すべて">愛媛全域</option>
              {EHIME_AREAS.filter(a => a !== 'その他').map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <input value={keyword} onChange={e => setKeyword(e.target.value)}
              placeholder="ジャンル/キーワード（任意）"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          </div>

          <button onClick={search} disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? '検索中…（30〜60秒）' : 'AIで探す'}
          </button>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {events && events.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-gray-400">{events.length}件の候補（気になるものを「＋追加」）</p>
              {events.map((c, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded-full mr-1 bg-emerald-50 text-emerald-600">{fmtDate(c)}</span>
                        {c.category}　{c.area}{c.venue ? `　${c.venue}` : ''}
                      </p>
                      {c.note && <p className="text-xs text-gray-500 mt-1">{c.note}</p>}
                    </div>
                    <button onClick={() => { onAdd(c); setAdded(prev => new Set(prev).add(i)); }}
                      disabled={added.has(i)}
                      className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white disabled:bg-gray-200 disabled:text-gray-400">
                      {added.has(i) ? '追加済' : '＋追加'}
                    </button>
                  </div>
                </div>
              ))}

              {sources.length > 0 && (
                <div className="pt-2">
                  <p className="text-[11px] text-gray-400 mb-1">情報源</p>
                  <div className="space-y-0.5">
                    {sources.map((s, i) => (
                      <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer"
                        className="block text-[11px] text-emerald-600 underline truncate">{s.title}</a>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-gray-300 pt-1">※ AIの提案です。開催日・会場・料金は公式情報でご確認ください。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
