'use client';
import { useEffect, useState } from 'react';
import { Howto, Part, PART_ICON } from '../types';
import { loadHowto, saveHowto } from '../lib/storage';

interface Props {
  name: string;
  part?: Part | string;
  onClose: () => void;
}

export default function ExerciseHowto({ name, part, onClose }: Props) {
  const [howto, setHowto] = useState<Howto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const cached = loadHowto(name);
    if (cached) { setHowto(cached); return; }
    void fetchHowto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function fetchHowto() {
    setLoading(true); setError('');
    try {
      let res!: Response;
      for (let attempt = 0; attempt < 3; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 60000);
        try {
          res = await fetch('/gym/api/howto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, part }),
            signal: ctrl.signal,
          });
        } catch (e) {
          if (attempt < 2) { await new Promise(r => setTimeout(r, 800 * (attempt + 1))); continue; }
          throw e;
        } finally { clearTimeout(timer); }
        break;
      }
      let data: (Howto & { error?: string }) | null = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok || !data || (!data.summary && !data.steps?.length)) {
        setError(res.status === 503 ? 'AI機能はまだ準備中です（APIキー未設定）' : (data?.error ?? '説明の取得に失敗しました'));
        return;
      }
      const h: Howto = {
        summary: data.summary ?? '', target: data.target ?? '',
        steps: data.steps ?? [], tips: data.tips ?? [],
        mistakes: data.mistakes ?? [], beginner: data.beginner ?? '',
      };
      setHowto(h);
      saveHowto(name, h);
    } catch (e) {
      setError((e as Error)?.name === 'AbortError'
        ? '応答に時間がかかっています。少し待ってからお試しください。'
        : '通信に失敗しました。少し待ってから再試行してください。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[85] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 min-w-0 truncate">
            {part ? `${PART_ICON[part as Part] ?? '🏋️'} ` : ''}{name}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center shrink-0">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
              <span className="w-4 h-4 border-2 border-gray-200 border-t-rose-400 rounded-full animate-spin" />
              説明を用意しています…
            </div>
          )}

          {error && (
            <div className="space-y-2">
              <p className="text-xs bg-red-50 text-red-500 rounded-lg px-3 py-2">{error}</p>
              <button onClick={fetchHowto} className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold">再試行</button>
            </div>
          )}

          {howto && (
            <>
              {howto.summary && <p className="text-sm text-gray-700 leading-relaxed">{howto.summary}</p>}

              {howto.target && (
                <div className="bg-rose-50/70 rounded-xl px-3 py-2">
                  <p className="text-[11px] text-gray-500">効く筋肉</p>
                  <p className="text-sm font-semibold text-gray-800">{howto.target}</p>
                </div>
              )}

              {howto.steps.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1.5">やり方</h3>
                  <ol className="space-y-1.5">
                    {howto.steps.map((s, i) => (
                      <li key={i} className="flex gap-2 text-xs text-gray-600 leading-relaxed">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-rose-100 text-rose-600 font-bold flex items-center justify-center text-[10px]">{i + 1}</span>
                        <span className="min-w-0">{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {howto.tips.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1.5">コツ</h3>
                  <ul className="space-y-1">
                    {howto.tips.map((s, i) => (
                      <li key={i} className="text-xs text-gray-600 leading-relaxed flex gap-1.5">
                        <span className="text-rose-400 shrink-0">✓</span><span className="min-w-0">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {howto.mistakes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1.5">よくある間違い</h3>
                  <ul className="space-y-1">
                    {howto.mistakes.map((s, i) => (
                      <li key={i} className="text-xs text-gray-600 leading-relaxed flex gap-1.5">
                        <span className="text-amber-500 shrink-0">⚠️</span><span className="min-w-0">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {howto.beginner && (
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-gray-600 mb-0.5">初心者の目安</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{howto.beginner}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] text-gray-400 leading-relaxed flex-1 pr-2">
                  ※ 一般的な目安です。痛みが出たら中止し、必要ならジムのスタッフに相談してください。
                </p>
                <button onClick={fetchHowto} disabled={loading}
                  className="shrink-0 text-[11px] text-gray-400 underline disabled:opacity-40">作り直す</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
