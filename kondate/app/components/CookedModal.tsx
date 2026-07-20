'use client';
import { useState } from 'react';
import { isSeasoning } from '../lib/inventoryWrite';

interface Props {
  title: string;
  items: string[];                     // 在庫にある「使った食材」候補
  onConfirm: (selected: string[]) => void;
  onClose: () => void;                 // 減らさずに閉じる
}

export default function CookedModal({ title, items, onConfirm, onClose }: Props) {
  // 既定：調味料はオフ、それ以外はオン
  const [checked, setChecked] = useState<Record<string, boolean>>(
    () => Object.fromEntries(items.map(n => [n, !isSeasoning(n)])),
  );

  const toggle = (n: string) => setChecked(p => ({ ...p, [n]: !p[n] }));
  const selected = items.filter(n => checked[n]);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-800">🍳 作った：在庫を減らす</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">「{title}」で使った食材のうち、1つ減らすものを選んでください（調味料は既定でオフ）。</p>
        </div>

        <div className="p-4 space-y-1.5">
          {items.map(n => (
            <label key={n} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={!!checked[n]} onChange={() => toggle(n)}
                className="w-4 h-4 accent-orange-500" />
              <span className="text-sm text-gray-700 flex-1">{n}</span>
              {isSeasoning(n) && <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">調味料</span>}
            </label>
          ))}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium">
            減らさない
          </button>
          <button onClick={() => onConfirm(selected)} disabled={selected.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold disabled:opacity-40">
            選んだ{selected.length}個を1つ減らす
          </button>
        </div>
      </div>
    </div>
  );
}
