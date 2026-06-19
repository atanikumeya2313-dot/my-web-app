'use client';
import { useEffect, useState } from 'react';
import { CompletedLogEntry } from '../types';
import { loadCompletedLog, toYMD } from '../lib/storage';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

function ymdOffset(offset: number): string {
  return toYMD(new Date(Date.now() + offset * 86_400_000));
}

// 連続達成日数（今日が未完了でも、昨日まで続いていれば継続中とみなす）
function currentStreak(countByDate: Record<string, number>): number {
  const has = (offset: number) => (countByDate[ymdOffset(offset)] ?? 0) > 0;
  const start: number | null = has(0) ? 0 : has(-1) ? -1 : null;
  if (start === null) return 0;
  let streak = 0;
  for (let o = start; has(o); o--) streak++;
  return streak;
}

function longestStreak(countByDate: Record<string, number>): number {
  const days = Object.keys(countByDate).filter(d => countByDate[d] > 0).sort();
  let best = 0, run = 0;
  let prev: string | null = null;
  for (const d of days) {
    if (prev) {
      const gap = Math.round((new Date(d + 'T00:00:00').getTime() - new Date(prev + 'T00:00:00').getTime()) / 86_400_000);
      run = gap === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

function heatColor(n: number): string {
  if (n === 0) return 'bg-gray-100';
  if (n <= 2)  return 'bg-green-200';
  if (n <= 4)  return 'bg-green-400';
  return 'bg-green-600';
}

export default function StatsPage() {
  const [log, setLog] = useState<CompletedLogEntry[]>([]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setLog(loadCompletedLog()); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const countByDate: Record<string, number> = {};
  for (const e of log) countByDate[e.date] = (countByDate[e.date] ?? 0) + 1;

  const today      = ymdOffset(0);
  const todayCount = countByDate[today] ?? 0;
  const weekDates  = Array.from({ length: 7 }, (_, i) => ymdOffset(-i));
  const weekCount  = weekDates.reduce((s, d) => s + (countByDate[d] ?? 0), 0);
  const streak     = currentStreak(countByDate);
  const maxStreak  = longestStreak(countByDate);
  const total      = log.length;

  // 直近28日のヒートマップ（古い→新しい）。曜日列に揃えるため先頭に空セルを入れる
  const heatDays = Array.from({ length: 28 }, (_, i) => ymdOffset(-(27 - i)));
  const leadPad  = new Date(heatDays[0] + 'T00:00:00').getDay();

  // 今週のカテゴリ別内訳
  const weekSet = new Set(weekDates);
  const catCount: Record<string, number> = {};
  for (const e of log) {
    if (!weekSet.has(e.date)) continue;
    const key = e.category || 'その他';
    catCount[key] = (catCount[key] ?? 0) + 1;
  }
  const catRows = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
  const catMax  = Math.max(1, ...catRows.map(([, n]) => n));

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-base font-bold text-gray-800">統計</h1>
          <p className="text-xs text-gray-400">完了の記録と連続達成日数</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* サマリーカード */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gradient-to-br from-orange-400 to-red-400 text-white rounded-xl p-4">
            <p className="text-xs opacity-80 mb-1">🔥 連続達成</p>
            <p className="text-2xl font-bold">{streak}<span className="text-sm font-medium ml-1">日</span></p>
            <p className="text-[10px] opacity-70 mt-0.5">最長 {maxStreak}日</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col justify-center">
            <p className="text-xs text-gray-400 mb-1">今日の完了</p>
            <p className="text-2xl font-bold text-gray-800">{todayCount}<span className="text-sm font-medium text-gray-400 ml-1">件</span></p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">今週（7日）</p>
            <p className="text-xl font-bold text-gray-800">{weekCount}<span className="text-sm font-medium text-gray-400 ml-1">件</span></p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">累計完了</p>
            <p className="text-xl font-bold text-gray-800">{total}<span className="text-sm font-medium text-gray-400 ml-1">件</span></p>
          </div>
        </div>

        {/* ヒートマップ */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">直近4週間</h2>
          <div className="grid grid-cols-7 gap-1.5">
            {DOW.map(d => (
              <div key={d} className="text-center text-[10px] text-gray-400">{d}</div>
            ))}
            {Array.from({ length: leadPad }, (_, i) => <div key={`pad-${i}`} />)}
            {heatDays.map(d => {
              const n = countByDate[d] ?? 0;
              const isToday = d === today;
              const day = new Date(d + 'T00:00:00').getDate();
              return (
                <div key={d}
                  title={`${d}: ${n}件`}
                  className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-medium
                    ${heatColor(n)} ${n >= 3 ? 'text-white' : 'text-gray-400'}
                    ${isToday ? 'ring-2 ring-blue-400' : ''}`}>
                  {day}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-1 mt-3 text-[10px] text-gray-400">
            <span>少</span>
            <span className="w-3 h-3 rounded bg-gray-100" />
            <span className="w-3 h-3 rounded bg-green-200" />
            <span className="w-3 h-3 rounded bg-green-400" />
            <span className="w-3 h-3 rounded bg-green-600" />
            <span>多</span>
          </div>
        </section>

        {/* 今週のカテゴリ別 */}
        {catRows.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">今週のカテゴリ別</h2>
            <div className="space-y-2">
              {catRows.map(([cat, n]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-16 shrink-0 truncate">{cat}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${(n / catMax) * 100}%`, minWidth: '1.5rem' }}>
                      <span className="text-[10px] font-bold text-white">{n}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {total === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-gray-400 text-sm">タスクを完了すると記録が表示されます</p>
          </div>
        )}
      </main>
    </div>
  );
}
