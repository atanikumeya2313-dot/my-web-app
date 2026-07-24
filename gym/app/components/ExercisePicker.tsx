'use client';
import { useState } from 'react';
import { Exercise, Part, PARTS, PART_ICON, ExKind } from '../types';
import ExerciseHowto from './ExerciseHowto';

interface Props {
  exercises: Exercise[];
  onPick: (ex: Exercise) => void;
  onCreate: (ex: Exercise) => void;   // マスターに追加
  onClose: () => void;
}

export default function ExercisePicker({ exercises, onPick, onCreate, onClose }: Props) {
  const [part, setPart] = useState<Part | 'all'>('all');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [howtoFor, setHowtoFor] = useState<Exercise | null>(null);
  const [newName, setNewName] = useState('');
  const [newPart, setNewPart] = useState<Part>('胸');
  const [newKind, setNewKind] = useState<ExKind>('strength');

  const shown = exercises.filter(e =>
    (part === 'all' || e.part === part) &&
    (q.trim() === '' || e.name.includes(q.trim())));

  function create() {
    const name = newName.trim();
    if (!name) return;
    const ex: Exercise = { id: `ex_${Date.now()}`, name, part: newPart, kind: newKind };
    onCreate(ex);
    onPick(ex);
  }

  function pickPart(p: Part) {
    setNewPart(p);
    setNewKind(p === '有酸素' ? 'cardio' : 'strength');
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">種目を選ぶ</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        {creating ? (
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">種目名</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="例: インクラインベンチプレス"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">部位</label>
              <div className="flex flex-wrap gap-1.5">
                {PARTS.map(p => (
                  <button key={p} onClick={() => pickPart(p)}
                    className={`text-xs px-2.5 py-1.5 rounded-full font-medium ${newPart === p ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {PART_ICON[p]} {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">種類</label>
              <div className="flex gap-1.5">
                {([['strength', '筋トレ（重量×回数）'], ['cardio', '有酸素（時間・距離）']] as [ExKind, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => setNewKind(v)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium ${newKind === v ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setCreating(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-bold">戻る</button>
              <button onClick={create} disabled={!newName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold disabled:opacity-40">追加して使う</button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 pt-3 pb-2 space-y-2">
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="種目を検索"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300" />
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button onClick={() => setPart('all')}
                  className={`shrink-0 text-xs px-2.5 py-1.5 rounded-full font-medium ${part === 'all' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`}>すべて</button>
                {PARTS.map(p => (
                  <button key={p} onClick={() => setPart(p)}
                    className={`shrink-0 text-xs px-2.5 py-1.5 rounded-full font-medium ${part === p ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {PART_ICON[p]} {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {shown.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">見つかりません。下の「新しい種目を作る」から追加できます。</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {shown.map(ex => (
                    <div key={ex.id} className="relative bg-gray-50 rounded-xl">
                      <button onClick={() => onPick(ex)} className="w-full text-left px-3 py-2.5 pr-8 active:bg-rose-50 rounded-xl">
                        <p className="text-sm font-semibold text-gray-800 leading-tight">{ex.name}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{PART_ICON[ex.part]} {ex.part}</p>
                      </button>
                      <button onClick={() => setHowtoFor(ex)} title="やり方を見る"
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white text-gray-400 text-[11px] flex items-center justify-center">ⓘ</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setCreating(true)}
                className="w-full mt-3 py-2.5 rounded-xl border border-dashed border-rose-300 text-rose-500 text-sm font-bold">
                ＋ 新しい種目を作る
              </button>
            </div>
          </>
        )}
      </div>

      {howtoFor && (
        <ExerciseHowto name={howtoFor.name} part={howtoFor.part} onClose={() => setHowtoFor(null)} />
      )}
    </div>
  );
}
