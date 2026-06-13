'use client';
import { useState } from 'react';
import { Goal } from '../types';

interface Props {
  goal: Goal | null;
  onChange: (goal: Goal) => void;
}

export default function GoalManager({ goal, onChange }: Props) {
  const [value, setValue] = useState(goal && goal.monthlyTarget > 0 ? String(goal.monthlyTarget) : '');
  const [savedMsg, setSavedMsg] = useState(false);

  function save() {
    onChange({ monthlyTarget: Number(value) || 0 });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-600 mb-1">貯金目標</h2>
      <p className="text-xs text-gray-400 mb-3">毎月の貯金目標額（収入 − 支出）を設定するとホームに進捗が表示されます</p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
          <input type="number" value={value} onChange={e => setValue(e.target.value)}
            placeholder="例：50000" min="0"
            className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg" />
        </div>
        <button onClick={save}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600">
          {savedMsg ? '✓ 保存' : '保存'}
        </button>
      </div>
    </div>
  );
}
