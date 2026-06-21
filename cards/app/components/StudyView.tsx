'use client';
import { useState } from 'react';
import { Card, Grade } from '../types';

interface Props {
  initial: Card[];                              // 今日の復習対象（開始時点）
  onGrade: (card: Card, grade: Grade) => void;  // 採点を保存
  onClose: () => void;
}

const GRADES: { value: Grade; label: string; cls: string }[] = [
  { value: 'again', label: 'もう一度', cls: 'bg-red-100 text-red-600' },
  { value: 'hard',  label: '微妙',     cls: 'bg-amber-100 text-amber-600' },
  { value: 'good',  label: 'できた',   cls: 'bg-green-100 text-green-600' },
];

export default function StudyView({ initial, onGrade, onClose }: Props) {
  const [queue,   setQueue]   = useState<Card[]>(initial);
  const [flipped, setFlipped] = useState(false);
  const [done,    setDone]    = useState(0);

  const current = queue[0];

  function grade(g: Grade) {
    if (!current) return;
    onGrade(current, g);
    setDone(d => d + 1);
    setFlipped(false);
    setQueue(q => {
      const [, ...rest] = q;
      // 「もう一度」はこのセッション内で後ろに回して再出題
      return g === 'again' ? [...rest, current] : rest;
    });
  }

  if (!current) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl mb-4">🎉</p>
        <p className="text-gray-700 font-bold mb-1">今日の復習は完了！</p>
        <p className="text-gray-400 text-sm mb-6">{done}回 採点しました</p>
        <button onClick={onClose}
          className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium">戻る</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
      {/* ヘッダー */}
      <div className="px-4 py-3 flex items-center justify-between">
        <button onClick={onClose} className="text-gray-400 text-sm">✕ やめる</button>
        <span className="text-xs text-gray-400">残り {queue.length}</span>
      </div>

      {/* カード */}
      <div className="flex-1 flex items-center justify-center px-5">
        <button
          onClick={() => setFlipped(f => !f)}
          className="w-full max-w-md min-h-[16rem] bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center active:scale-[.99] transition-transform">
          {!flipped ? (
            <>
              <p className="text-[10px] text-gray-300 mb-3">問題（タップで答え）</p>
              <p className="text-lg font-semibold text-gray-800 whitespace-pre-wrap">{current.front}</p>
            </>
          ) : (
            <div className="w-full space-y-3">
              <div>
                <p className="text-[10px] text-gray-300 mb-1">答え</p>
                <p className="text-lg font-bold text-indigo-600 whitespace-pre-wrap">{current.back}</p>
              </div>
              {current.explanation && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-[10px] text-gray-300 mb-1">解説</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{current.explanation}</p>
                </div>
              )}
            </div>
          )}
        </button>
      </div>

      {/* 操作 */}
      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {!flipped ? (
          <button onClick={() => setFlipped(true)}
            className="w-full py-3 bg-indigo-500 text-white rounded-xl text-sm font-semibold">
            答えを見る
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {GRADES.map(g => (
              <button key={g.value} onClick={() => grade(g.value)}
                className={`py-3 rounded-xl text-sm font-bold ${g.cls}`}>
                {g.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
