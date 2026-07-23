'use client';
import { useState } from 'react';

export interface MenuItem { name: string; part: string; sets?: number; reps: string; tip: string }

interface Props {
  onUse: (items: MenuItem[]) => void;   // 選んだ種目で記録を作る
  onClose: () => void;
}

const GOALS = ['筋肉をつけたい', 'ダイエット・減量', '健康維持', '体力アップ'];
const FREQS = ['週1回', '週2回', '週3回', '週4回以上'];
const LEVELS = ['はじめて', '数ヶ月', '1年以上'];
const EQUIPS = ['ジムのマシン中心', 'フリーウェイトも使う', '自宅・自重のみ'];
const PARTS_OPT = ['おまかせ', '胸', '背中', '脚', '肩', '腕', '腹', '有酸素'];

function Chips({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button key={o} onClick={() => onChange(o)}
            className={`text-xs px-2.5 py-1.5 rounded-full font-medium ${value === o ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MenuAI({ onUse, onClose }: Props) {
  const [goal, setGoal]   = useState(GOALS[0]);
  const [freq, setFreq]   = useState(FREQS[1]);
  const [level, setLevel] = useState(LEVELS[0]);
  const [equip, setEquip] = useState(EQUIPS[0]);
  const [part, setPart]   = useState(PARTS_OPT[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [advice, setAdvice] = useState('');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  async function suggest() {
    setLoading(true); setError(''); setAdvice(''); setItems([]); setPicked(new Set());
    try {
      let res!: Response;
      for (let attempt = 0; attempt < 3; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 60000);
        try {
          res = await fetch('/gym/api/menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal, freq, level, equip, part: part === 'おまかせ' ? '' : part }),
            signal: ctrl.signal,
          });
        } catch (e) {
          if (attempt < 2) { await new Promise(r => setTimeout(r, 800 * (attempt + 1))); continue; }
          throw e;
        } finally { clearTimeout(timer); }
        break;
      }
      let data: { advice?: string; items?: MenuItem[]; error?: string } | null = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok || !Array.isArray(data?.items)) {
        setError(res.status === 503 ? 'AI機能はまだ準備中です（APIキー未設定）' : (data?.error ?? 'メニューの提案に失敗しました'));
        return;
      }
      setAdvice(data.advice ?? '');
      setItems(data.items);
      setPicked(new Set(data.items.map((_, i) => i)));
      if (data.items.length === 0) setError('提案を作れませんでした。条件を変えてお試しください。');
    } catch (e) {
      setError((e as Error)?.name === 'AbortError'
        ? 'AIの応答に時間がかかっています。少し待ってからお試しください。'
        : '通信に失敗しました。少し待ってから再試行してください。');
    } finally {
      setLoading(false);
    }
  }

  function toggle(i: number) {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">✨ AIメニュー提案</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <Chips label="目的" options={GOALS} value={goal} onChange={setGoal} />
          <Chips label="通う頻度" options={FREQS} value={freq} onChange={setFreq} />
          <Chips label="トレーニング歴" options={LEVELS} value={level} onChange={setLevel} />
          <Chips label="使える器具" options={EQUIPS} value={equip} onChange={setEquip} />
          <Chips label="特に鍛えたい部位" options={PARTS_OPT} value={part} onChange={setPart} />

          <button onClick={suggest} disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? '考えています…' : 'メニューを提案してもらう'}
          </button>

          {error && <p className="text-xs bg-red-50 text-red-500 rounded-lg px-3 py-2">{error}</p>}

          {advice && (
            <div className="bg-purple-50/70 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-600 leading-relaxed">{advice}</p>
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((it, i) => (
                <button key={i} onClick={() => toggle(i)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 border ${picked.has(i) ? 'border-rose-300 bg-rose-50/50' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded shrink-0 flex items-center justify-center text-[10px] ${picked.has(i) ? 'bg-rose-500 text-white' : 'border border-gray-300'}`}>
                      {picked.has(i) ? '✓' : ''}
                    </span>
                    <p className="text-sm font-semibold text-gray-800 flex-1 min-w-0 truncate">{it.name}</p>
                    <span className="text-[11px] text-gray-400 shrink-0">
                      {it.sets ? `${it.sets}セット × ` : ''}{it.reps}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 pl-6">{it.part}{it.tip ? `　${it.tip}` : ''}</p>
                </button>
              ))}
              <p className="text-[11px] text-gray-400 leading-relaxed">
                ※ 提案は一般的な目安です。痛みがあるときは無理をせず、必要ならジムのスタッフに相談してください。
              </p>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <button onClick={() => onUse(items.filter((_, i) => picked.has(i)))} disabled={picked.size === 0}
              className="w-full py-3 rounded-xl bg-rose-500 text-white text-sm font-bold disabled:opacity-40">
              選んだ{picked.size}種目で記録を作る
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
