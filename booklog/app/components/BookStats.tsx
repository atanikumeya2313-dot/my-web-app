'use client';
import { useState } from 'react';
import { Book, ReadingGoal } from '../types';
import { saveGoal } from '../lib/storage';

interface Props {
  books: Book[];
  goal: ReadingGoal | null;
  onGoalChange: (goal: ReadingGoal | null) => void;
}

export default function BookStats({ books, goal, onGoalChange }: Props) {
  const thisYear = new Date().getFullYear();
  const [viewYear,     setViewYear]     = useState(thisYear);
  const [editingGoal,  setEditingGoal]  = useState(false);
  const [goalInput,    setGoalInput]    = useState(String(goal?.target ?? 12));

  const done = books.filter(b => b.status === 'done');

  // 選択年の月別読了数（12ヶ月）
  const monthData = Array.from({ length: 12 }, (_, i) => {
    const m   = String(i + 1).padStart(2, '0');
    const ym  = `${viewYear}-${m}`;
    const cnt = done.filter(b => b.endDate?.startsWith(ym)).length;
    return { label: `${i + 1}月`, cnt };
  });
  const maxMonth  = Math.max(...monthData.map(m => m.cnt), 1);
  const yearTotal = monthData.reduce((s, m) => s + m.cnt, 0);

  // 年間目標
  const isThisYear    = viewYear === thisYear;
  const goalTarget    = (isThisYear && goal?.year === thisYear) ? goal.target : null;
  const goalPct       = goalTarget ? Math.min(100, Math.round((yearTotal / goalTarget) * 100)) : 0;

  // ジャンル分布（選択年）
  const yearDone = done.filter(b => b.endDate?.startsWith(String(viewYear)));
  const genreMap = new Map<string, number>();
  for (const b of yearDone) {
    const g = b.genre || 'その他';
    genreMap.set(g, (genreMap.get(g) ?? 0) + 1);
  }
  const genreData = [...genreMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxGenre  = Math.max(...genreData.map(g => g[1]), 1);

  // ステータス集計
  const wantCnt    = books.filter(b => b.status === 'want').length;
  const readingCnt = books.filter(b => b.status === 'reading').length;
  const doneCnt    = done.length;

  // 利用可能な年一覧
  const years = [...new Set(done.map(b => b.endDate?.slice(0, 4)).filter(Boolean))]
    .map(Number).sort((a, b) => b - a);
  if (!years.includes(thisYear)) years.unshift(thisYear);

  const handleSaveGoal = () => {
    const n = parseInt(goalInput);
    if (!n || n <= 0) return;
    const g = { year: thisYear, target: n };
    saveGoal(g);
    onGoalChange(g);
    setEditingGoal(false);
  };

  if (books.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-10">まだ本が登録されていません</p>;
  }

  return (
    <div className="space-y-6">
      {/* ステータス集計 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xl font-bold text-gray-700">{wantCnt}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">読みたい</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-xl font-bold text-blue-600">{readingCnt}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">読んでいる</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3">
          <p className="text-xl font-bold text-green-600">{doneCnt}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">読み終わった</p>
        </div>
      </div>

      {/* 年選択 */}
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-gray-500 flex-1">年別データ</p>
        <div className="flex gap-1">
          {years.slice(0, 4).map(y => (
            <button key={y} onClick={() => setViewYear(y)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${viewYear === y ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* 年間目標（今年のみ） */}
      {isThisYear && (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600">今年の読書目標</p>
            <button onClick={() => { setGoalInput(String(goalTarget ?? 12)); setEditingGoal(v => !v); }}
              className="text-xs text-blue-500">
              {editingGoal ? 'キャンセル' : goalTarget ? '変更' : '設定する'}
            </button>
          </div>
          {editingGoal ? (
            <div className="flex gap-2 items-center">
              <input type="number" value={goalInput} min={1} max={365}
                onChange={e => setGoalInput(e.target.value)}
                className="w-20 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <span className="text-sm text-gray-500">冊</span>
              <button onClick={handleSaveGoal}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium">保存</button>
            </div>
          ) : goalTarget ? (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>{yearTotal} / {goalTarget}冊</span>
                <span className={goalPct >= 100 ? 'text-green-600 font-bold' : 'text-gray-500'}>{goalPct}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${goalPct >= 100 ? 'bg-green-400' : 'bg-blue-400'}`}
                  style={{ width: `${goalPct}%` }} />
              </div>
              {goalPct >= 100 && (
                <p className="text-xs text-green-600 mt-1.5 font-medium">🎉 目標達成！</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">目標を設定すると進捗が確認できます</p>
          )}
        </div>
      )}

      {/* 月別読了数 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500">{viewYear}年 月別読了数</p>
          <span className="text-xs text-gray-400">計{yearTotal}冊</span>
        </div>
        <div className="flex items-end gap-1 h-24">
          {monthData.map(({ label, cnt }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-gray-500 font-medium">{cnt > 0 ? cnt : ''}</span>
              <div className="w-full bg-gray-100 rounded-t-sm overflow-hidden" style={{ height: '64px' }}>
                <div className="w-full bg-blue-400 rounded-t-sm transition-all"
                  style={{ height: `${cnt > 0 ? (cnt / maxMonth) * 64 : 0}px` }} />
              </div>
              <span className="text-[9px] text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ジャンル分布 */}
      {genreData.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-3">{viewYear}年 ジャンル分布</p>
          <div className="space-y-2">
            {genreData.map(([genre, cnt]) => (
              <div key={genre} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 shrink-0 w-20 truncate">{genre}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div className="h-full bg-green-400 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${(cnt / maxGenre) * 100}%`, minWidth: '1.5rem' }}>
                    <span className="text-[10px] font-bold text-white">{cnt}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
