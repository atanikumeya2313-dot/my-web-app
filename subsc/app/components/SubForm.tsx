'use client';
import { useState } from 'react';
import { Sub, Cycle, CATEGORIES, CYCLE_LABEL, catIcon } from '../types';
import { todayYMD } from '../lib/storage';

interface Props {
  editing?: Sub;
  onSave: (s: Sub) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function SubForm({ editing, onSave, onDelete, onClose }: Props) {
  const [name,     setName]     = useState(editing?.name ?? '');
  const [amount,   setAmount]   = useState(editing ? String(editing.amount) : '');
  const [cycle,    setCycle]    = useState<Cycle>(editing?.cycle ?? 'month');
  const [nextDate, setNextDate] = useState(editing?.nextDate ?? todayYMD());
  const [category, setCategory] = useState(editing?.category ?? CATEGORIES[0]);
  const [trial,    setTrial]    = useState(editing?.trial ?? false);
  const [active,   setActive]   = useState(editing?.active ?? true);
  const [memo,     setMemo]     = useState(editing?.memo ?? '');

  const amountNum = parseInt(amount) || 0;
  const valid = name.trim() && amountNum > 0 && nextDate;

  const submit = () => {
    if (!valid) return;
    onSave({
      id:        editing?.id ?? crypto.randomUUID(),
      name:      name.trim(),
      amount:    amountNum,
      cycle,
      nextDate,
      category,
      trial,
      active,
      ...(memo.trim() ? { memo: memo.trim() } : {}),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-800">{editing ? 'サブスクを編集' : 'サブスクを追加'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* 名前 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">サービス名 *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="例: Netflix、Spotify、ジム"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300" />
          </div>

          {/* 金額・周期 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">金額 *</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
                <input type="number" inputMode="numeric" value={amount} min={0}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300" />
              </div>
              <div className="flex gap-1">
                {(['month', 'year', 'week'] as Cycle[]).map(c => (
                  <button key={c} onClick={() => setCycle(c)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      cycle === c ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                    {CYCLE_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 次回更新日 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              {trial ? '課金開始日 *' : '次回更新日 *'}
            </label>
            <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300" />
            <p className="text-[11px] text-gray-400 mt-1">過ぎた日付は、次回分へ自動で繰り上がります</p>
          </div>

          {/* カテゴリ */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">カテゴリ</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    category === c ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                  {catIcon(c)} {c}
                </button>
              ))}
            </div>
          </div>

          {/* トグル */}
          <label className="flex items-center justify-between">
            <span className="text-xs text-gray-600">🆓 無料トライアル中</span>
            <button onClick={() => setTrial(v => !v)}
              className={`w-11 h-6 rounded-full transition-colors relative ${trial ? 'bg-amber-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${trial ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </label>
          <label className="flex items-center justify-between">
            <span className="text-xs text-gray-600">稼働中（オフで合計から除外）</span>
            <button onClick={() => setActive(v => !v)}
              className={`w-11 h-6 rounded-full transition-colors relative ${active ? 'bg-violet-600' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${active ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </label>

          {/* メモ */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">メモ（任意）</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2}
              placeholder="プラン名・解約方法など"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none" />
          </div>
        </div>

        {/* 操作（固定フッター） */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
          {onDelete && (
            <button onClick={onDelete}
              className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium">
              削除
            </button>
          )}
          <button onClick={submit} disabled={!valid}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-40">
            {editing ? '更新' : '追加'}
          </button>
        </div>
      </div>
    </div>
  );
}
