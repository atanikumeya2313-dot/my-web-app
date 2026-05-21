'use client';
import { useState } from 'react';
import { Task } from '../types';

const REPEAT_LABEL: Record<string, string> = {
  none: '', daily: '毎日', weekly: '毎週', monthly: '毎月',
};
const DOW = ['日','月','火','水','木','金','土'];

interface Props {
  task: Task;
  onComplete: (id: string) => void;
}

export default function TaskItem({ task, onComplete }: Props) {
  const [fading, setFading] = useState(false);

  function handleTap() {
    setFading(true);
    setTimeout(() => onComplete(task.id), 350);
  }

  function repeatDetail() {
    if (task.repeat === 'weekly' && task.weekdays?.length) {
      return `毎週${task.weekdays.map(d => DOW[d]).join('・')}`;
    }
    if (task.repeat === 'monthly' && task.monthDay) {
      return `毎月${task.monthDay}日`;
    }
    return REPEAT_LABEL[task.repeat] || '';
  }

  const detail = repeatDetail();

  return (
    <div className={`transition-all duration-300 ${fading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      <button
        onClick={handleTap}
        className="w-full bg-white rounded-xl shadow-sm px-4 py-3.5 flex items-center gap-3 text-left active:bg-gray-50 transition-colors"
      >
        {/* チェックサークル */}
        <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0 flex items-center justify-center">
          {fading && (
            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        {/* テキスト */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
          <div className="flex items-center flex-wrap gap-1.5 mt-1">
            {task.category && (
              <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-medium">
                {task.category}
              </span>
            )}
            {detail && (
              <span className="text-[10px] text-gray-400">{detail}</span>
            )}
            {task.date && task.repeat === 'none' && (
              <span className="text-[10px] text-gray-400">{task.date}</span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
