'use client';
import { useState } from 'react';
import { getCategoryIcon } from '../types';

export interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

interface Props {
  categories: string[];
  customIcons?: Record<string, string>;
  onAdd: (items: ParsedItem[]) => void;
  onClose: () => void;
}

const EXAMPLES = [
  '牛乳2本と卵1パック、食パン',
  'トイレットペーパー12ロール、ティッシュ5箱',
  'お米5kg、醤油、みりん',
];

export default function AiAddModal({ categories, customIcons, onAdd, onClose }: Props) {
  const [text,    setText]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [items,   setItems]   = useState<ParsedItem[] | null>(null);  // null=入力フェーズ

  async function handleParse() {
    const t = text.trim();
    if (!t || loading) return;
    setLoading(true);
    setError('');
    try {
      // 通信断は最大3回再試行。混雑/一時エラーの再試行はサーバー側で行う。
      let res!: Response;
      for (let attempt = 0; ; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 65000);
        try {
          res = await fetch('/inventory/api/parse-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: t, categories }),
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
      let data: { items?: unknown; error?: string } | null = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok || !Array.isArray(data?.items)) {
        setError(res.status === 503 ? 'AI機能はまだ準備中です（APIキー未設定）' : (data?.error ?? '解析に失敗しました'));
        return;
      }
      setItems(data.items as ParsedItem[]);
    } catch (e) {
      setError((e as Error)?.name === 'AbortError'
        ? 'AIの応答に時間がかかっています。少し待ってからお試しください。'
        : '通信に失敗しました。少し待ってから再試行してください。');
    } finally {
      setLoading(false);
    }
  }

  function patch(idx: number, next: Partial<ParsedItem>) {
    setItems(list => list!.map((it, i) => i === idx ? { ...it, ...next } : it));
  }
  function remove(idx: number) {
    setItems(list => list!.filter((_, i) => i !== idx));
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-800 flex items-center gap-1.5">
            <span>✨</span>{items ? '内容を確認して追加' : 'AIでまとめて追加'}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-4 space-y-4 pb-8">
          {/* 入力フェーズ */}
          {!items && (
            <>
              <p className="text-xs text-gray-400">
                買ったもの・補充したいものを、ふだんの言葉でまとめて書くと、品名・数量・カテゴリを読み取ります。
              </p>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="例）牛乳2本と卵1パック、トイレットペーパー"
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map(ex => (
                  <button key={ex} type="button" onClick={() => setText(ex)}
                    className="px-2.5 py-1 rounded-full text-[11px] bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                    {ex}
                  </button>
                ))}
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button onClick={handleParse} disabled={!text.trim() || loading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-blue-500 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {loading ? '読み取り中…' : '解析する'}
              </button>
            </>
          )}

          {/* 確認フェーズ */}
          {items && (
            <>
              {items.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">追加するアイテムがありません</p>
              ) : (
                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-xl p-2.5 flex items-center gap-2">
                      <span className="text-lg shrink-0">{getCategoryIcon(it.category, customIcons)}</span>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <input value={it.name} onChange={e => patch(idx, { name: e.target.value })}
                          className="w-full text-sm font-medium text-gray-800 border-b border-transparent focus:border-blue-300 focus:outline-none" />
                        <div className="flex flex-wrap gap-1">
                          {categories.map(cat => (
                            <button key={cat} onClick={() => patch(idx, { category: cat })}
                              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                                it.category === cat ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-50 text-gray-500 border-gray-200'
                              }`}>
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => patch(idx, { quantity: Math.max(1, it.quantity - 1) })}
                          className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center">−</button>
                        <span className="w-5 text-center text-sm font-bold">{it.quantity}</span>
                        <button onClick={() => patch(idx, { quantity: it.quantity + 1 })}
                          className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center">＋</button>
                        <input value={it.unit} onChange={e => patch(idx, { unit: e.target.value })}
                          className="w-9 text-center text-xs border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-blue-300" />
                      </div>
                      <button onClick={() => remove(idx)}
                        className="text-gray-300 hover:text-red-400 text-sm w-6 h-6 flex items-center justify-center shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              )}
              {error && <p className="text-xs text-red-500">{error}</p>}
            </>
          )}
        </div>

        {/* 確認フェーズの操作バー（常に見える固定フッター） */}
        {items && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
            <button onClick={() => { setItems(null); setError(''); }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium">
              戻る
            </button>
            <button onClick={() => onAdd(items)} disabled={items.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-bold disabled:opacity-40">
              {items.length}件を追加
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
