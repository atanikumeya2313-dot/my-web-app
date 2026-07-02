'use client';
import { useState } from 'react';
import { Entry, fmtDate } from '../lib/storage';

function ymOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number);
  return ymOf(new Date(y, m - 1 + delta, 1));
}

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

export default function CalendarView({ entries, onPick }: { entries: Entry[]; onPick?: (date: string) => void }) {
  const now = new Date();
  const todayFull = `${ymOf(now)}-${String(now.getDate()).padStart(2, '0')}`;
  const [ym, setYm] = useState(ymOf(now));
  const [sel, setSel] = useState<string | null>(null);

  const byDate = new Map(entries.map(e => [e.date, e]));
  const [y, m] = ym.split('-').map(Number);
  const startDow = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(`${ym}-${String(d).padStart(2, '0')}`);

  const selEntry = sel ? byDate.get(sel) : undefined;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-amber-100/70 p-4">
      {/* 月ナビ */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => { setYm(shiftMonth(ym, -1)); setSel(null); }}
          className="w-8 h-8 flex items-center justify-center text-amber-600/70 hover:text-amber-700 text-lg">‹</button>
        <span className="text-sm font-semibold text-amber-800">{y}年{m}月</span>
        <button onClick={() => { setYm(shiftMonth(ym, 1)); setSel(null); }}
          className="w-8 h-8 flex items-center justify-center text-amber-600/70 hover:text-amber-700 text-lg">›</button>
      </div>

      {/* 曜日 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW.map((d, i) => (
          <div key={d} className={`text-center text-[10px] py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-amber-700/50'}`}>{d}</div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, idx) => {
          if (!c) return <div key={`e${idx}`} />;
          const day = Number(c.split('-')[2]);
          const has = byDate.has(c);
          const isToday = c === todayFull;
          const isSel = c === sel;
          const isFuture = c > todayFull;
          // 記録あり→その日を選択表示。記録なし（未来以外）→タップでその日を記録できる画面へ。
          const onClick = has ? () => setSel(isSel ? null : c) : (onPick ? () => onPick(c) : undefined);
          return (
            <button key={c} onClick={onClick} disabled={isFuture || (!has && !onPick)}
              className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-center transition-colors
                ${isSel ? 'bg-amber-600 text-white'
                  : has ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  : isFuture ? 'text-gray-200'
                  : 'text-amber-700/40 hover:bg-amber-50'}
                ${isToday && !isSel ? 'ring-1 ring-amber-400' : ''}`}>
              <span>{day}</span>
              {has && <span className={`mt-0.5 w-1 h-1 rounded-full ${isSel ? 'bg-white' : 'bg-amber-500'}`} />}
            </button>
          );
        })}
      </div>

      {/* 選択した日の記録 */}
      {selEntry ? (
        <div className="mt-4 pt-3 border-t border-amber-100/70">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] text-amber-700/60">{fmtDate(selEntry.date)}</p>
            {onPick && (
              <button onClick={() => onPick(selEntry.date)} className="text-[11px] text-amber-600/80 hover:text-amber-700">編集する</button>
            )}
          </div>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{selEntry.text}</p>
          {selEntry.comment && (
            <div className="mt-2.5 pt-2.5 border-t border-amber-100/60 flex gap-2 items-start">
              <span className="text-base leading-none mt-0.5">🪄</span>
              <p className="text-xs text-amber-900/80 leading-relaxed whitespace-pre-wrap">{selEntry.comment}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 pt-3 border-t border-amber-100/70 text-center text-[11px] text-amber-700/40">
          ●の日はタップで記録を表示。空いた日はタップでその日に記録できます
        </p>
      )}
    </section>
  );
}
