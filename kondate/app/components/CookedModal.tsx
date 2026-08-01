'use client';
import { useState } from 'react';
import { isSeasoning } from '../lib/inventoryWrite';

export interface CookedPick { name: string; amount: number }

interface Props {
  title: string;
  items: string[];                     // 在庫にある「使った食材」候補
  onConfirm: (selected: CookedPick[]) => void;
  onClose: () => void;                 // 減らさずに閉じる
}

// 各食材ごとに選べる消費量（0＝減らさない）
const AMOUNTS: { value: number; label: string }[] = [
  { value: 0,    label: 'なし' },
  { value: 0.25, label: '¼' },
  { value: 0.5,  label: '½' },
  { value: 0.75, label: '¾' },
  { value: 1,    label: '1' },
  { value: 2,    label: '2' },
];

export default function CookedModal({ title, items, onConfirm, onClose }: Props) {
  // 既定：調味料は 0（減らさない）、それ以外は 1
  const [amounts, setAmounts] = useState<Record<string, number>>(
    () => Object.fromEntries(items.map(n => [n, isSeasoning(n) ? 0 : 1])),
  );

  const setAmt = (n: string, v: number) => setAmounts(p => ({ ...p, [n]: v }));
  const selected: CookedPick[] = items
    .filter(n => (amounts[n] ?? 0) > 0)
    .map(n => ({ name: n, amount: amounts[n] }));

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-800">🍳 作った：在庫を減らす</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">「{title}」で使った量を選んでください（調味料は既定でなし）。</p>
        </div>

        <div className="p-4 space-y-2.5">
          {items.map(n => (
            <div key={n} className="border border-gray-100 rounded-xl p-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-medium text-gray-700 flex-1 min-w-0 truncate">{n}</span>
                {isSeasoning(n) && <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5 shrink-0">調味料</span>}
              </div>
              <div className="flex gap-1">
                {AMOUNTS.map(({ value, label }) => {
                  const active = Math.abs((amounts[n] ?? 0) - value) < 0.04;
                  return (
                    <button key={label} onClick={() => setAmt(n, value)}
                      className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                        active ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] flex gap-2">
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium">
            減らさない
          </button>
          <button onClick={() => onConfirm(selected)} disabled={selected.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold disabled:opacity-40">
            選んだ{selected.length}件を減らす
          </button>
        </div>
      </div>
    </div>
  );
}
