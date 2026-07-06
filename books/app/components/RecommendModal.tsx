'use client';
import { useState } from 'react';
import { Recommendation } from '../types';

interface InBook { title: string; author?: string; genre?: string; rating?: number }

interface Props {
  read: InBook[];
  exclude: string[];
  onAddWant: (r: Recommendation) => void;
  onClose: () => void;
}

export default function RecommendModal({ read, exclude, onAddWant, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [analysis, setAnalysis] = useState('');
  const [recs,    setRecs]    = useState<Recommendation[] | null>(null);
  const [added,   setAdded]   = useState<Set<number>>(new Set());

  async function run() {
    if (loading) return;
    setLoading(true); setError(''); setRecs(null);
    try {
      let res!: Response;
      for (let attempt = 0; ; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 45000);
        try {
          res = await fetch('/books/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ read, exclude }),
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
      let data: { analysis?: string; recommendations?: Recommendation[]; error?: string } | null = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok || !Array.isArray(data?.recommendations)) {
        setError(res.status === 503 ? 'AI機能はまだ準備中です（APIキー未設定）' : (data?.error ?? 'おすすめの取得に失敗しました'));
        return;
      }
      setAnalysis(data.analysis ?? '');
      setRecs(data.recommendations);
      setAdded(new Set());
      if (data.recommendations.length === 0) setError('おすすめを取得できませんでした。もう一度お試しください。');
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
          <h2 className="font-bold text-gray-800 flex items-center gap-1.5">✨ 傾向からおすすめ</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-4 space-y-3 pb-8">
          {!recs && !loading && (
            <>
              <p className="text-xs text-gray-500">
                これまで登録した「読んだ本」{read.length}冊の傾向をAIが分析し、次に読むとよい本を5冊提案します。
              </p>
              <button onClick={run}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center gap-2">
                おすすめを見る
              </button>
            </>
          )}

          {loading && (
            <div className="text-center py-10">
              <span className="inline-block w-6 h-6 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400 mt-3">読書傾向を分析中…</p>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          {recs && recs.length > 0 && (
            <>
              {analysis && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-amber-700 mb-1">📚 あなたの読書傾向</p>
                  <p className="text-xs text-amber-900/80 leading-relaxed">{analysis}</p>
                </div>
              )}
              <div className="space-y-2">
                {recs.map((r, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{r.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{r.author}{r.genre ? `　${r.genre}` : ''}</p>
                      </div>
                      <button onClick={() => { onAddWant(r); setAdded(prev => new Set(prev).add(i)); }}
                        disabled={added.has(i)}
                        className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500 text-white disabled:bg-gray-200 disabled:text-gray-400">
                        {added.has(i) ? '追加済' : '🔖 読みたい'}
                      </button>
                    </div>
                    {r.reason && <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">💡 {r.reason}</p>}
                  </div>
                ))}
              </div>
              <button onClick={run} disabled={loading}
                className="w-full py-2 rounded-xl text-xs font-medium text-amber-600 border border-amber-200">
                別のおすすめを見る
              </button>
              <p className="text-[10px] text-gray-300 text-center">AIによる提案のため、念のためご確認ください</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
