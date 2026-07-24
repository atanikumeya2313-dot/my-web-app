'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  endAt: number;          // 終了時刻（ミリ秒）
  total: number;          // この回の設定秒数
  onExtend: (sec: number) => void;
  onStop: () => void;
}

// iOSのSafari/PWAは navigator.vibrate 非対応なので、音でも知らせる。
// AudioContext は「開始」のタップ時に作って解除済みにしておく（後から鳴らせるように）。
let audioCtx: AudioContext | null = null;

export function primeAudio() {
  try {
    if (!audioCtx) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (C) audioCtx = new C();
    }
    void audioCtx?.resume();
  } catch { /* 音が出せない環境では無音で続行 */ }
}

function beep() {
  try {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    [0, 0.28, 0.56].forEach(offset => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
      osc.connect(gain); gain.connect(audioCtx!.destination);
      osc.start(now + offset); osc.stop(now + offset + 0.24);
    });
  } catch { /* 無音で続行 */ }
}

export default function RestTimer({ endAt, total, onExtend, onStop }: Props) {
  // 残りは常に現在時刻から計算する（バックグラウンドで setInterval が間引かれてもズレない）
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    const tick = () => {
      const l = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setLeft(l);
      if (l === 0 && !doneRef.current) {
        doneRef.current = true;
        beep();
        try { navigator.vibrate?.([200, 100, 200]); } catch {}
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endAt]);

  const done = left === 0;
  const pct = total > 0 ? Math.max(0, Math.min(100, (left / total) * 100)) : 0;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div className={`px-4 py-2.5 border-t ${done ? 'bg-green-50 border-green-100' : 'bg-rose-50 border-rose-100'}`}>
      <div className="flex items-center gap-3">
        <span className="text-lg shrink-0">{done ? '✅' : '⏱'}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-bold tabular-nums ${done ? 'text-green-600' : 'text-rose-600'}`}>
              {done ? '休憩おわり' : `${mm}:${ss}`}
            </span>
            {!done && <span className="text-[11px] text-gray-400">次のセットまで</span>}
          </div>
          {!done && (
            <div className="h-1.5 bg-white rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-rose-400 rounded-full transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        {!done && (
          <button onClick={() => onExtend(30)} className="shrink-0 text-xs px-2.5 py-1.5 rounded-full bg-white text-rose-500 font-bold">+30秒</button>
        )}
        <button onClick={onStop} className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-white text-gray-500 font-bold">
          {done ? '閉じる' : 'スキップ'}
        </button>
      </div>
    </div>
  );
}
