'use client';
import { useState } from 'react';
import { Task } from '../types';

interface Props {
  categories: string[];
  onParsed: (draft: Partial<Task>) => void;  // 解析結果を受け取り、確認フォームを開く
  onClose: () => void;
}

const EXAMPLES = [
  '毎週月曜の朝に資源ごみを出す',
  '金曜までに請求書を送る（重要）',
  '3日ごとに水やり',
  '毎月25日に家賃の振込',
];

export default function AiAddModal({ categories, onParsed, onClose }: Props) {
  const [text,    setText]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleParse() {
    const t = text.trim();
    if (!t || loading) return;
    setLoading(true);
    setError('');
    try {
      // basePath '/todo' 配下のため、fetch先にも明示的に付与する
      // 通信失敗やサーバー一時エラー(5xx/429)は自動で最大3回リトライ
      let res!: Response;
      for (let attempt = 0; ; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 65000);
        try {
          res = await fetch('/todo/api/parse-task', {
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
        if (attempt < 2 && [500, 502, 504, 429].includes(res.status)) {
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        break;
      }
      const data = await res.json();
      if (!res.ok || !data?.draft) {
        setError(
          res.status === 503
            ? 'AI機能はまだ準備中です（APIキー未設定）'
            : (data?.error ?? '解析に失敗しました')
        );
        return;
      }
      onParsed(data.draft as Partial<Task>);
    } catch {
      setError('通信に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-slide-up pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
        <div className="flex items-center gap-1.5">
          <span className="text-base">✨</span>
          <h2 className="text-sm font-bold text-gray-700">AIでタスクを追加</h2>
        </div>
        <p className="text-xs text-gray-400 -mt-1">
          ふだんの言葉で書くと、繰り返し・時間帯・カテゴリを自動で読み取ります。内容は確認画面で直せます。
        </p>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) handleParse();
          }}
          placeholder="例）毎週月曜の朝に資源ごみを出す"
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
        />

        {/* 例文チップ */}
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map(ex => (
            <button key={ex} type="button" onClick={() => setText(ex)}
              className="px-2.5 py-1 rounded-full text-[11px] bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
              {ex}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">
            キャンセル
          </button>
          <button onClick={handleParse} disabled={!text.trim() || loading}
            className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2">
            {loading && (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {loading ? '読み取り中…' : '解析する'}
          </button>
        </div>
      </div>
    </div>
  );
}
