'use client';
import { useState } from 'react';
import { DraftCard } from '../types';

interface Props {
  deckName: string;
  onAdd: (cards: DraftCard[]) => void;
  onClose: () => void;
}

type Mode = 'text' | 'topic' | 'photo';

const MODES: { value: Mode; label: string; icon: string }[] = [
  { value: 'text',  label: '文章を貼る', icon: '📋' },
  { value: 'topic', label: 'トピック',   icon: '💡' },
  { value: 'photo', label: '写真',       icon: '📷' },
];

// 画像を長辺max pxに縮小してJPEG base64（プレフィックス除く）にする
function downscaleImage(file: File, max = 1280): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load')); };
    img.src = url;
  });
}

// サーバー一時エラー(500/502)とネットワーク失敗のみ自動リトライ。65秒で打ち切り。
async function aiFetch(body: unknown): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 65000);
    try {
      const res = await fetch('/cards/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (attempt < 2 && [500, 502].includes(res.status)) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < 2) { await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); continue; }
      throw e;
    }
  }
  throw lastErr;
}

// 1リクエスト分の生成。成功なら cards、失敗なら status/error を返す（504などの非JSONも安全に処理）
async function requestCards(body: unknown): Promise<{ ok: boolean; status: number; cards?: DraftCard[]; error?: string }> {
  const res = await aiFetch(body);
  let data: { cards?: unknown; error?: string } | null = null;
  try { data = await res.json(); } catch { data = null; }
  if (res.ok && Array.isArray(data?.cards)) return { ok: true, status: res.status, cards: data!.cards as DraftCard[] };
  return { ok: false, status: res.status, error: data?.error };
}

function msgFor(status: number, error?: string): string {
  if (status === 503) return 'AI機能はまだ準備中です（APIキー未設定）';
  if (status === 429) return error ?? '短時間に多く作成したため一時的に制限中です。少し待って再実行してください。';
  if (status === 504 || status === 413) return '画像が多すぎ／重すぎました。写真の枚数や1枚あたりの枚数を減らして再試行してください。';
  return error ?? '生成に失敗しました';
}

export default function GenerateModal({ deckName, onAdd, onClose }: Props) {
  const [mode,    setMode]    = useState<Mode>('text');
  const [text,    setText]    = useState('');
  const [topic,   setTopic]   = useState('');
  const [count,   setCount]   = useState('5');  // 入力中は文字列で自由に編集（生成時に1〜30へ正規化）
  const [images,  setImages]  = useState<{ base64: string; mimeType: string; preview: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress,setProgress]= useState<{ cur: number; total: number } | null>(null);
  const [error,   setError]   = useState('');
  const [drafts,  setDrafts]  = useState<DraftCard[] | null>(null);  // null=入力フェーズ

  const MAX_IMAGES = 10;

  async function handlePickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';   // 同じ写真を選び直せるようにクリア
    if (files.length === 0) return;
    setError('');
    try {
      const added = await Promise.all(files.map(async f => {
        const { base64, mimeType } = await downscaleImage(f);
        return { base64, mimeType, preview: `data:${mimeType};base64,${base64}` };
      }));
      setImages(prev => [...prev, ...added].slice(0, MAX_IMAGES));
    } catch {
      setError('画像を読み込めませんでした');
    }
  }
  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleGenerate() {
    if (loading) return;
    if (mode === 'text' && !text.trim()) return;
    if (mode === 'topic' && !topic.trim()) return;
    if (mode === 'photo' && images.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const n = Math.min(30, Math.max(1, parseInt(count) || 5));  // 生成時に1〜30へ正規化

      if (mode === 'photo') {
        // 大きく/重くなりすぎないよう、写真は4枚ずつに分割して順番に生成し合算
        const CHUNK = 4;
        const chunks: typeof images[] = [];
        for (let i = 0; i < images.length; i += CHUNK) chunks.push(images.slice(i, i + CHUNK));
        const all: DraftCard[] = [];
        for (let ci = 0; ci < chunks.length; ci++) {
          setProgress({ cur: ci + 1, total: chunks.length });
          const r = await requestCards({
            mode: 'photo', count: n,
            images: chunks[ci].map(img => ({ base64: img.base64, mimeType: img.mimeType })),
          });
          if (!r.ok) {
            // 一部成功していれば、その分は確認画面に出しつつ残りの失敗を知らせる
            if (all.length > 0) {
              setError(`写真${chunks.length}グループ中${ci}グループ分まで作成しました。${msgFor(r.status, r.error)}`);
              setDrafts(all);
            } else {
              setError(msgFor(r.status, r.error));
            }
            return;
          }
          all.push(...(r.cards ?? []));
        }
        setDrafts(all);
        return;
      }

      // テキスト/トピックは1回で生成
      const r = await requestCards(
        mode === 'text' ? { mode, count: n, text: text.trim() } : { mode, count: n, topic: topic.trim() }
      );
      if (!r.ok) { setError(msgFor(r.status, r.error)); return; }
      setDrafts(r.cards ?? []);
    } catch (e) {
      setError((e as Error)?.name === 'AbortError'
        ? '生成に時間がかかりすぎました。写真の枚数や1枚あたりの枚数を減らして再試行してください。'
        : '通信に失敗しました。電波の良い場所で、少し待ってから再試行してください。');
    } finally {
      setProgress(null);
      setLoading(false);
    }
  }

  function patch(idx: number, next: Partial<DraftCard>) {
    setDrafts(list => list!.map((c, i) => i === idx ? { ...c, ...next } : c));
  }
  function remove(idx: number) {
    setDrafts(list => list!.filter((_, i) => i !== idx));
  }

  const numericCount = Math.min(30, Math.max(1, parseInt(count) || 5));

  const canGenerate =
    (mode === 'text' && text.trim().length > 0) ||
    (mode === 'topic' && topic.trim().length > 0) ||
    (mode === 'photo' && images.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
            <span>✨</span>{drafts ? '確認して保存' : 'AIでカード作成'}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-4 space-y-4 pb-8">
          {!drafts && (
            <>
              <p className="text-xs text-gray-400">「{deckName}」にAIでカードを追加します。生成後、確認してから保存します。</p>

              {/* モードタブ */}
              <div className="grid grid-cols-3 gap-1.5">
                {MODES.map(m => (
                  <button key={m.value} onClick={() => setMode(m.value)}
                    className={`py-2 rounded-lg text-xs font-medium flex flex-col items-center gap-0.5 transition-colors ${mode === m.value ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <span className="text-base">{m.icon}</span>{m.label}
                  </button>
                ))}
              </div>

              {mode === 'text' && (
                <textarea value={text} onChange={e => setText(e.target.value)}
                  placeholder="教科書やノートの文章を貼り付け（1ページ分など）"
                  rows={6}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
              )}
              {mode === 'topic' && (
                <input value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="例）日本史・鎌倉時代／TOEIC頻出単語"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              )}
              {mode === 'photo' && (
                <div className="space-y-2">
                  <label className="block w-full border-2 border-dashed border-gray-200 rounded-xl px-3 py-5 text-center text-sm text-gray-400 cursor-pointer hover:border-indigo-300">
                    {images.length > 0 ? '＋ 写真を追加' : '📷 写真を選ぶ（複数まとめて選べます）'}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePickImages} />
                  </label>
                  <p className="text-[11px] text-gray-400">ライブラリから複数選択／撮影もできます（最大{MAX_IMAGES}枚）。複数ページを一度にカード化します。</p>
                  {images.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.preview} alt={`写真${idx + 1}`} className="w-full h-16 object-cover rounded-lg border border-gray-100" />
                          <button onClick={() => removeImage(idx)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full text-[10px] flex items-center justify-center shadow">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {images.length > 0 && <p className="text-[11px] text-gray-400 text-right">{images.length}枚 選択中</p>}
                </div>
              )}

              {/* 枚数 */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{mode === 'photo' ? '写真1枚あたりの枚数' : '作る枚数の目安'}</span>
                  <input type="number" inputMode="numeric" min={1} max={30} value={count}
                    onChange={e => setCount(e.target.value)}
                    onBlur={() => setCount(String(Math.min(30, Math.max(1, parseInt(count) || 5))))}
                    className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  <span className="text-xs text-gray-400">枚</span>
                </div>
                {mode === 'photo' && images.length > 0 && (
                  <p className="text-[11px] text-gray-400">
                    写真{images.length}枚 × {numericCount}枚 ＝ 合計 約{numericCount * images.length}枚
                  </p>
                )}
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button onClick={handleGenerate} disabled={!canGenerate || loading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {loading ? (progress ? `作成中… (${progress.cur}/${progress.total})` : 'カードを作成中…') : 'カードを作る'}
              </button>
            </>
          )}

          {drafts && (
            <>
              {drafts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">追加するカードがありません</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">{drafts.length}枚を確認してください（編集・削除できます）</p>
                  {drafts.map((c, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-1.5">
                          <input value={c.front} onChange={e => patch(idx, { front: e.target.value })}
                            placeholder="問題"
                            className="w-full text-sm font-semibold text-gray-800 border-b border-transparent focus:border-indigo-300 focus:outline-none" />
                          <input value={c.back} onChange={e => patch(idx, { back: e.target.value })}
                            placeholder="答え"
                            className="w-full text-sm text-indigo-600 border-b border-transparent focus:border-indigo-300 focus:outline-none" />
                          <textarea value={c.explanation} onChange={e => patch(idx, { explanation: e.target.value })}
                            placeholder="解説"
                            rows={2}
                            className="w-full text-xs text-gray-500 border border-gray-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-200 resize-none" />
                        </div>
                        <button onClick={() => remove(idx)}
                          className="text-gray-300 hover:text-red-400 text-sm w-6 h-6 flex items-center justify-center shrink-0">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setDrafts(null); setError(''); }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium">戻る</button>
                <button onClick={() => onAdd(drafts)} disabled={drafts.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold disabled:opacity-40">
                  {drafts.length}枚を保存
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
