'use client';
import { useState } from 'react';
import { Session, PART_ICON, Part, estimate1RM } from '../types';

interface Props {
  exerciseId: string;
  name: string;
  sessions: Session[];
  onClose: () => void;
}

type Metric = 'rm' | 'weight' | 'volume';

const METRIC_LABEL: Record<Metric, string> = { rm: '推定1RM', weight: '最大重量', volume: 'ボリューム' };

interface Point { date: string; rm: number; weight: number; volume: number; duration: number; distance: number }

export default function ExerciseChart({ exerciseId, name, sessions, onClose }: Props) {
  const [metric, setMetric] = useState<Metric>('rm');

  // 古い順に並べて、直近12回ぶんを見る
  const points: Point[] = sessions
    .filter(s => s.entries.some(e => e.exerciseId === exerciseId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => {
      const e = s.entries.find(x => x.exerciseId === exerciseId)!;
      const sets = e.sets ?? [];
      return {
        date: s.date,
        rm: sets.reduce((m, st) => Math.max(m, estimate1RM(st.weight, st.reps)), 0),
        weight: sets.reduce((m, st) => Math.max(m, st.weight), 0),
        volume: sets.reduce((v, st) => v + st.weight * st.reps, 0),
        duration: e.durationMin ?? 0,
        distance: e.distanceKm ?? 0,
      };
    })
    .slice(-12);

  const isCardio = points.length > 0 && points.every(p => p.rm === 0) && points.some(p => p.duration > 0);
  const part = sessions.flatMap(s => s.entries).find(e => e.exerciseId === exerciseId)?.part;

  const values = points.map(p => isCardio ? p.duration : p[metric]);
  const max = Math.max(...values, 1);
  const first = values[0] ?? 0;
  const latest = values[values.length - 1] ?? 0;
  const best = Math.max(...values, 0);
  const diff = latest - first;
  const unit = isCardio ? '分' : metric === 'volume' ? 'kg' : 'kg';

  return (
    <div className="fixed inset-0 z-[75] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 min-w-0 truncate">
            {part ? `${PART_ICON[part as Part] ?? '🏋️'} ` : ''}{name}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center shrink-0">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {points.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">まだ記録がありません</p>
          ) : (
            <>
              {!isCardio && (
                <div className="flex gap-1.5">
                  {(['rm', 'weight', 'volume'] as Metric[]).map(m => (
                    <button key={m} onClick={() => setMetric(m)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium ${metric === m ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {METRIC_LABEL[m]}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end justify-around text-center bg-gray-50 rounded-xl py-2.5">
                <div>
                  <p className="text-[11px] text-gray-400">最新</p>
                  <p className="text-lg font-bold text-gray-800">{Math.round(latest).toLocaleString()}<span className="text-xs font-medium text-gray-500">{unit}</span></p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div>
                  <p className="text-[11px] text-gray-400">ベスト</p>
                  <p className="text-lg font-bold text-gray-800">{Math.round(best).toLocaleString()}<span className="text-xs font-medium text-gray-500">{unit}</span></p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div>
                  <p className="text-[11px] text-gray-400">初回から</p>
                  <p className={`text-lg font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-gray-400' : 'text-gray-500'}`}>
                    {diff > 0 ? '+' : ''}{Math.round(diff).toLocaleString()}<span className="text-xs font-medium">{unit}</span>
                  </p>
                </div>
              </div>

              {/* 推移 */}
              <div>
                <div className="flex items-end gap-1 h-32">
                  {points.map((p, i) => {
                    const v = isCardio ? p.duration : p[metric];
                    const h = max > 0 ? Math.max(6, (v / max) * 100) : 6;
                    const isBest = v === best && v > 0;
                    return (
                      <div key={`${p.date}_${i}`} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                        <span className="text-[9px] text-gray-400 tabular-nums">{v > 0 ? Math.round(v) : ''}</span>
                        <div className={`w-full rounded-t ${isBest ? 'bg-rose-500' : 'bg-rose-200'}`} style={{ height: `${h}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>{points[0].date.slice(5).replace('-', '/')}</span>
                  <span>直近{points.length}回</span>
                  <span>{points[points.length - 1].date.slice(5).replace('-', '/')}</span>
                </div>
              </div>

              {/* 記録の明細 */}
              <div className="space-y-1 pt-1">
                {[...points].reverse().map((p, i) => (
                  <div key={`${p.date}_r${i}`} className="flex items-center justify-between text-xs border-b border-gray-50 pb-1">
                    <span className="text-gray-500">{p.date.slice(5).replace('-', '/')}</span>
                    <span className="text-gray-700">
                      {isCardio
                        ? `${p.duration}分${p.distance ? ` / ${p.distance}km` : ''}`
                        : `${p.weight}kg・1RM ${p.rm}kg・${Math.round(p.volume).toLocaleString()}kg`}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
