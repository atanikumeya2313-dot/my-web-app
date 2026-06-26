'use client';
import { useState } from 'react';

export interface ExplainPayload {
  years: number;
  inflation: number;
  items: { label: string; principal: number; monthly: number; rate: number; taxable: boolean; savingsEndYear?: number }[];
  totalPrincipal: number;
  totalInvested: number;
  totalFv: number;
  totalGain: number;
  totalPct: number;
  taxAmount: number;
  afterTaxFv: number;
  realFv: number;
}

export default function AiExplain({ payload }: { payload: ExplainPayload }) {
  const [text,    setText]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      // 通信断は最大3回再試行。混雑/一時エラーの再試行はサーバー側で行う。
      let res!: Response;
      for (let attempt = 0; ; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 65000);
        try {
          res = await fetch('/interest/api/explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
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
      let data: { explanation?: string; error?: string } | null = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok || !data?.explanation) {
        setError(res.status === 503 ? 'AI機能はまだ準備中です（APIキー未設定）' : (data?.error ?? '生成に失敗しました'));
        return;
      }
      setText(data.explanation);
    } catch (e) {
      setError((e as Error)?.name === 'AbortError'
        ? 'AIの応答に時間がかかっています。少し待ってからお試しください。'
        : '通信に失敗しました。少し待ってから再試行してください。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🤖</span>
          <h2 className="text-sm font-semibold text-gray-700">AIによる結果の解説</h2>
        </div>
        {text && (
          <button onClick={generate} disabled={loading}
            className="text-xs text-violet-500 font-medium disabled:opacity-40 flex items-center gap-1">
            {loading && <span className="w-3 h-3 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />}
            再生成
          </button>
        )}
      </div>

      {!text && (
        <>
          <p className="text-xs text-gray-400 mb-3">
            いまの試算結果（複利・税・インフレ）を、AIがやさしい言葉で読み解きます。送信するのは計算結果の数値だけです。
          </p>
          <button onClick={generate} disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-blue-500 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? '解説を作成中…' : 'AIにこの結果を解説してもらう'}
          </button>
        </>
      )}

      {text && (
        <>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p>
          <p className="text-[10px] text-gray-300 mt-2">
            ※ 投資助言ではありません。想定利回りに基づく試算で、将来を保証するものではありません。
          </p>
        </>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </section>
  );
}
