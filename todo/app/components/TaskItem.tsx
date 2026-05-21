'use client';
import { useState } from 'react';
import { Task } from '../types';
import { toYMD } from '../lib/storage';

const REPEAT_LABEL: Record<string, string> = {
  none: '', daily: '毎日', weekly: '毎週', monthly: '毎月',
};
const DOW = ['日','月','火','水','木','金','土'];

interface Props {
  task: Task;
  onComplete: (id: string) => void;
  onReschedule?: (id: string, newDate?: string) => void;
}

export default function TaskItem({ task, onComplete, onReschedule }: Props) {
  const [fading, setFading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const tomorrow = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return toYMD(d);
  })();
  const [newDate, setNewDate] = useState(tomorrow);

  function handleTap() {
    setFading(true);
    setTimeout(() => onComplete(task.id), 350);
  }

  function confirmReschedule() {
    if (!newDate) return;
    onReschedule?.(task.id, newDate);
    setShowPanel(false);
  }

  function confirmSkip() {
    onReschedule?.(task.id);
    setShowPanel(false);
  }

  function repeatDetail() {
    if (task.repeat === 'weekly' && task.weekdays?.length) {
      return `毎週${task.weekdays.map(d => DOW[d]).join('・')}`;
    }
    if (task.repeat === 'monthly' && task.monthDay) {
      return `毎月${task.monthDay}日`;
    }
    if (task.repeat === 'interval' && task.intervalDays) {
      return `${task.intervalDays}日ごと`;
    }
    return REPEAT_LABEL[task.repeat] || '';
  }

  const detail = repeatDetail();
  const isRepeat = task.repeat !== 'none';

  return (
    <div className={`transition-all duration-300 ${fading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center">
          <button
            onClick={handleTap}
            className="flex-1 flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50 transition-colors"
          >
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0 flex items-center justify-center">
              {fading && (
                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
              <div className="flex items-center flex-wrap gap-1.5 mt-1">
                {task.category && (
                  <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-medium">
                    {task.category}
                  </span>
                )}
                {detail && <span className="text-[10px] text-gray-400">{detail}</span>}
                {task.date && task.repeat === 'none' && (
                  <span className="text-[10px] text-gray-400">{task.date}</span>
                )}
              </div>
            </div>
          </button>

          {onReschedule && (
            <button
              onClick={e => { e.stopPropagation(); setShowPanel(v => !v); }}
              className={`px-3 py-3.5 transition-colors ${showPanel ? 'text-blue-500' : 'text-gray-300 hover:text-blue-400'}`}
              aria-label="日付変更"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          )}
        </div>

        {showPanel && onReschedule && (
          <div className="border-t border-gray-100 bg-blue-50 px-4 py-3">
            {isRepeat ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500">今日をスキップ（次回予定日に表示）</span>
                <div className="flex gap-2 shrink-0">
                  <button onClick={confirmSkip}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium">
                    スキップ
                  </button>
                  <button onClick={() => setShowPanel(false)}
                    className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs font-medium">
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input type="date" value={newDate} min={tomorrow}
                  onChange={e => setNewDate(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                />
                <button onClick={confirmReschedule} disabled={!newDate}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium disabled:opacity-40 shrink-0">
                  変更
                </button>
                <button onClick={() => setShowPanel(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs font-medium shrink-0">
                  ×
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
