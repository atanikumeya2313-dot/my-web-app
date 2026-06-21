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

export default function GenerateModal({ deckName, onAdd, onClose }: Props) {
  const [mode,    setMode]    = useState<Mode>('text');
  const [text,    setText]    = useState('');
  const [topic,   setTopic]   = useState('');
  const [count,   setCount]   = useState(10);
  const [image,   setImage]   = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [drafts,  setDrafts]  = useState<DraftCard[] | null>(null);  // null=入力フェーズ

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const { base64, mimeType } = await downscaleImage(file);
      setImage({ base64, mimeType, preview: `data:${mimeType};base64,${base64}` });
    } catch {
      setError('画像を読み込めませんでした');
    }
  }

  async function handleGenerate() {
    if (loading) return;
    if (mode === 'text' && !text.trim()) return;
    if (mode === 'topic' && !topic.trim()) return;
    if (mode === 'photo' && !image) return;
    setLoading(true);
    setError('');
    try {
      const payload: Record<string, unknown> = { mode, count };
      if (mode === 'text')  payload.text = text.trim();
      if (mode === 'topic') payload.topic = topic.trim();
      if (mode === 'photo' && image) { payload.imageBase64 = image.base64; payload.imageMimeType = image.mimeType; }

      const res = await fetch('/cards/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data?.cards)) {
        setError(res.status === 503 ? 'AI機能はまだ準備中です（APIキー未設定）' : (data?.error ?? '生成に失敗しました'));
        return;
      }
      setDrafts(data.cards as DraftCard[]);
    } catch {
      setError('通信に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  function patch(idx: number, next: Partial<DraftCard>) {
    setDrafts(list => list!.map((c, i) => i === idx ? { ...c, ...next } : c));
  }
  function remove(idx: number) {
    setDrafts(list => list!.filter((_, i) => i !== idx));
  }

  const canGenerate =
    (mode === 'text' && text.trim().length > 0) ||
    (mode === 'topic' && topic.trim().length > 0) ||
    (mode === 'photo' && !!image);

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
                  <label className="block w-full border-2 border-dashed border-gray-200 rounded-xl px-3 py-6 text-center text-sm text-gray-400 cursor-pointer hover:border-indigo-300">
                    {image ? '別の写真を選ぶ' : '📷 写真を選ぶ / 撮影する'}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePickImage} />
                  </label>
                  {image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.preview} alt="プレビュー" className="max-h-40 rounded-lg mx-auto" />
                  )}
                </div>
              )}

              {/* 枚数 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">作る枚数の目安</span>
                <input type="number" min={1} max={30} value={count}
                  onChange={e => setCount(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <span className="text-xs text-gray-400">枚</span>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button onClick={handleGenerate} disabled={!canGenerate || loading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {loading ? 'カードを作成中…' : 'カードを作る'}
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
