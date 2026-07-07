'use client';
import { useState } from 'react';

interface Props {
  onAdd: (names: string[]) => void;
  onClose: () => void;
}

// 画像を長辺1280pxに縮小して JPEG base64 にする（送信サイズ・速度対策）
async function fileToInline(file: File): Promise<{ mimeType: string; data: string }> {
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img: HTMLImageElement = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = dataUrl;
  });
  const max = 1280;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL('image/jpeg', 0.8);
  return { mimeType: 'image/jpeg', data: out.split(',')[1] };
}

export default function PhotoModal({ onAdd, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [found,   setFound]   = useState<string[] | null>(null);
  const [picked,  setPicked]  = useState<Set<string>>(new Set());

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLoading(true); setError(''); setFound(null);
    try {
      const image = await fileToInline(file);
      let res!: Response;
      for (let attempt = 0; ; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 50000);
        try {
          res = await fetch('/kondate/api/photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image }),
            signal: ctrl.signal,
          });
        } catch (err) {
          if (attempt < 2) { await new Promise(r => setTimeout(r, 800 * (attempt + 1))); continue; }
          throw err;
        } finally { clearTimeout(timer); }
        break;
      }
      let data: { ingredients?: string[]; error?: string } | null = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok || !Array.isArray(data?.ingredients)) {
        setError(res.status === 503 ? 'AI機能はまだ準備中です（APIキー未設定）' : (data?.error ?? '読み取りに失敗しました'));
        return;
      }
      setFound(data.ingredients);
      setPicked(new Set(data.ingredients));
      if (data.ingredients.length === 0) setError('食材を認識できませんでした。明るく写った写真でお試しください。');
    } catch (err) {
      setError((err as Error)?.name === 'AbortError'
        ? '読み取りに時間がかかっています。少し待ってからお試しください。'
        : '通信に失敗しました。少し待ってから再試行してください。');
    } finally {
      setLoading(false);
    }
  }

  function toggle(name: string) {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-800 flex items-center gap-1.5">📷 写真から食材を読み取る</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-4 space-y-3 pb-8">
          {!found && !loading && (
            <>
              <p className="text-xs text-gray-500">冷蔵庫の中や、食材をまとめて撮った写真を選ぶと、AIが食材名を読み取ります。</p>
              <label className="block w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 text-center cursor-pointer">
                写真を撮る / 選ぶ
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
              </label>
            </>
          )}

          {loading && (
            <div className="text-center py-10">
              <span className="inline-block w-6 h-6 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400 mt-3">写真を読み取り中…</p>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          {found && found.length > 0 && (
            <>
              <p className="text-xs text-gray-500">認識した食材（タップで選択を切り替え）</p>
              <div className="flex flex-wrap gap-1.5">
                {found.map(n => (
                  <button key={n} onClick={() => toggle(n)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      picked.has(n) ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-400 border-gray-200'
                    }`}>
                    {picked.has(n) ? '✓ ' : ''}{n}
                  </button>
                ))}
              </div>
              <button onClick={() => { onAdd([...picked]); onClose(); }} disabled={picked.size === 0}
                className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold disabled:opacity-40">
                選んだ{picked.size}品を食材に追加
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
