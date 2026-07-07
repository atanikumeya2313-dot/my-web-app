'use client';
import { useState } from 'react';
import { Suggestion } from '../types';

interface Props {
  meal: Suggestion;
  onSave?: () => void;        // お気に入りに保存
  saved?: boolean;            // 保存済み表示
  onCooked?: () => void;      // 作った（履歴へ・在庫を減らす）
  onDelete?: () => void;      // お気に入りから削除
  onAddMissing?: () => void;  // 買い足しを在庫に追加
}

export default function MealCard({ meal, onSave, saved, onCooked, onDelete, onAddMissing }: Props) {
  const [open, setOpen] = useState(false);

  function copyMissing() {
    const text = meal.missing.map(m => `・${m}`).join('\n');
    navigator.clipboard?.writeText(text).then(() => alert('買い物リストをコピーしました'));
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-800">{meal.title}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {meal.cuisine && <span>{meal.cuisine}</span>}
            {typeof meal.timeMin === 'number' && <span>{meal.cuisine ? '　' : ''}⏱ 約{meal.timeMin}分</span>}
          </p>
        </div>
        {onSave && (
          <button onClick={onSave} disabled={saved}
            className="shrink-0 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-orange-100 text-orange-600 disabled:bg-gray-100 disabled:text-gray-400">
            {saved ? '保存済' : '🔖 保存'}
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="shrink-0 text-gray-300 hover:text-red-400 text-sm px-1">✕</button>
        )}
      </div>

      {meal.description && <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{meal.description}</p>}

      {/* 使う食材 / 買い足し */}
      <div className="mt-2 space-y-1.5">
        {meal.used.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-[10px] text-gray-400 mr-0.5">使う</span>
            {meal.used.map((u, i) => (
              <span key={i} className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full">{u}</span>
            ))}
          </div>
        )}
        {meal.missing.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-[10px] text-gray-400 mr-0.5">買い足し</span>
            {meal.missing.map((m, i) => (
              <span key={i} className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full">{m}</span>
            ))}
            <button onClick={copyMissing} className="text-[10px] text-orange-500 underline ml-1">コピー</button>
            {onAddMissing && (
              <button onClick={onAddMissing} className="text-[10px] text-orange-500 underline">📦在庫に追加</button>
            )}
          </div>
        )}
      </div>

      {/* 手順 */}
      {meal.steps.length > 0 && (
        <div className="mt-2">
          <button onClick={() => setOpen(v => !v)} className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
            <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
            作り方（{meal.steps.length}ステップ）
          </button>
          {open && (
            <ol className="mt-1.5 space-y-1 pl-1">
              {meal.steps.map((s, i) => (
                <li key={i} className="text-xs text-gray-600 flex gap-2">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-orange-100 text-orange-600 text-[10px] flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {onCooked && (
        <button onClick={onCooked}
          className="mt-2.5 w-full py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold">
          🍳 これを作った
        </button>
      )}
    </div>
  );
}
