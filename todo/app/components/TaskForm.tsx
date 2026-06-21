'use client';
import { useState } from 'react';
import { Task, RepeatType, TimeSlot, Priority } from '../types';

const PRIORITIES: { value: Priority | ''; label: string; cls: string }[] = [
  { value: '',       label: 'なし', cls: 'bg-gray-100 text-gray-500' },
  { value: 'high',   label: '高',   cls: 'bg-red-100 text-red-600' },
  { value: 'medium', label: '中',   cls: 'bg-orange-100 text-orange-600' },
  { value: 'low',    label: '低',   cls: 'bg-blue-100 text-blue-500' },
];
import { toYMD } from '../lib/storage';

const DOW_LABELS = ['日','月','火','水','木','金','土'];

const TIME_SLOTS: { value: TimeSlot; label: string; icon: string }[] = [
  { value: 'morning',   label: '朝',    icon: '🌅' },
  { value: 'afternoon', label: '昼',    icon: '☀️' },
  { value: 'evening',   label: '夜',    icon: '🌙' },
  { value: 'anytime',   label: 'その日', icon: '📋' },
];

const REPEATS: { value: RepeatType; label: string }[] = [
  { value: 'none',             label: 'なし' },
  { value: 'daily',            label: '毎日' },
  { value: 'weekly',           label: '毎週' },
  { value: 'monthly',          label: '毎月' },
  { value: 'interval',         label: 'N日ごと' },
  { value: 'monthly-interval', label: 'N月ごと' },
  { value: 'monthly-weekday',  label: '第N曜日' },
];

interface Props {
  onSave: (task: Task) => void;
  onClose: () => void;
  editing?: Task;
  categories: string[];
  defaultDate?: string;
  onDelete?: (id: string) => void;
  draft?: Partial<Task>;   // AIが解析した下書き（新規追加時の事前入力）
}

export default function TaskForm({ onSave, onClose, editing, categories, defaultDate, onDelete, draft }: Props) {
  const today = toYMD(new Date());
  const src = editing ?? draft;   // 編集対象 or AI下書き。どちらも無ければ空フォーム

  const [title,               setTitle]               = useState(src?.title               ?? '');
  const [repeat,              setRepeat]              = useState<RepeatType>(src?.repeat   ?? 'none');
  const [timeSlot,            setTimeSlot]            = useState<TimeSlot>(src?.timeSlot   ?? 'anytime');
  const [priority,            setPriority]            = useState<Priority | ''>(src?.priority ?? '');
  const [memo,                setMemo]                = useState(src?.memo                 ?? '');
  const [date,                setDate]                = useState(src?.date                 ?? defaultDate ?? '');
  const [category,            setCategory]            = useState(src?.category             ?? '');
  const [weekdays,            setWeekdays]            = useState<number[]>(src?.weekdays   ?? []);
  const [monthDay,            setMonthDay]            = useState<number>(src?.monthDay     ?? 1);
  const [intervalDays,        setIntervalDays]        = useState<number>(src?.intervalDays        ?? 3);
  const [monthIntervalMonths, setMonthIntervalMonths] = useState<number>(src?.monthIntervalMonths ?? 2);
  const [startDate,           setStartDate]           = useState(src?.startDate            ?? today);
  const [monthlyWeekdayNth,   setMonthlyWeekdayNth]   = useState<number>(src?.monthlyWeekdayNth ?? 1);
  const [monthlyWeekdayDow,   setMonthlyWeekdayDow]   = useState<number>(src?.monthlyWeekdayDow ?? 0);

  function toggleDow(d: number) {
    setWeekdays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  }

  function handleSave() {
    const t = title.trim();
    if (!t) return;
    const task: Task = {
      id:       editing?.id ?? crypto.randomUUID(),
      title:    t,
      repeat,
      timeSlot,
      ...(priority ? { priority } : {}),
      ...(memo.trim() ? { memo: memo.trim() } : {}),
      ...(category ? { category } : {}),
      ...(repeat === 'none'            && date    ? { date }                                                    : {}),
      ...(repeat === 'weekly'                     ? { weekdays }                                                : {}),
      ...(repeat === 'monthly'                    ? { monthDay }                                                : {}),
      ...(repeat === 'interval'                   ? { intervalDays,        startDate: startDate || today }      : {}),
      ...(repeat === 'monthly-interval'           ? { monthIntervalMonths, startDate: startDate || today }      : {}),
      ...(repeat === 'monthly-weekday'            ? { monthlyWeekdayNth, monthlyWeekdayDow }                    : {}),
    };
    onSave(task);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-slide-up pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
        <h2 className="text-sm font-bold text-gray-700">{editing ? 'タスクを編集' : 'タスクを追加'}</h2>

        {/* タイトル */}
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSave()}
          placeholder="タスク名"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />

        {/* 優先度 */}
        <div>
          <p className="text-xs text-gray-500 mb-2">優先度</p>
          <div className="flex gap-1.5">
            {PRIORITIES.map(p => (
              <button key={p.value} onClick={() => setPriority(p.value)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${
                  priority === p.value
                    ? `${p.cls} border-transparent`
                    : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* カテゴリ */}
        {categories.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">カテゴリ</p>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setCategory('')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!category ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                なし
              </button>
              {categories.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${category === cat ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 時間帯 */}
        <div>
          <p className="text-xs text-gray-500 mb-2">時間帯</p>
          <div className="grid grid-cols-4 gap-1.5">
            {TIME_SLOTS.map(({ value, label, icon }) => (
              <button key={value} onClick={() => setTimeSlot(value)}
                className={`py-2 rounded-lg text-xs font-medium transition-colors flex flex-col items-center gap-0.5 ${timeSlot === value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <span>{icon}</span><span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 繰り返し */}
        <div>
          <p className="text-xs text-gray-500 mb-2">繰り返し</p>
          <div className="grid grid-cols-4 gap-1.5">
            {REPEATS.map(r => (
              <button key={r.value} onClick={() => setRepeat(r.value)}
                className={`py-2 rounded-lg text-xs font-medium transition-colors ${repeat === r.value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 日付指定（none） */}
        {repeat === 'none' && (
          <div>
            <p className="text-xs text-gray-500 mb-2">日付指定（省略すると今日）</p>
            <input type="date" value={date} min={editing ? undefined : today}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        )}

        {/* 曜日選択（weekly） */}
        {repeat === 'weekly' && (
          <div>
            <p className="text-xs text-gray-500 mb-2">曜日を選択</p>
            <div className="flex gap-1.5">
              {DOW_LABELS.map((label, i) => (
                <button key={i} onClick={() => toggleDow(i)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${weekdays.includes(i) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 日付選択（monthly） */}
        {repeat === 'monthly' && (
          <div>
            <p className="text-xs text-gray-500 mb-2">毎月何日？</p>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <button key={d} type="button" onClick={() => setMonthDay(d)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${monthDay === d ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 第N曜日（monthly-weekday） */}
        {repeat === 'monthly-weekday' && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-2">第何週？</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(n => (
                  <button key={n} type="button" onClick={() => setMonthlyWeekdayNth(n)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${monthlyWeekdayNth === n ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    第{n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">何曜日？</p>
              <div className="flex gap-1.5">
                {DOW_LABELS.map((label, i) => (
                  <button key={i} type="button" onClick={() => setMonthlyWeekdayDow(i)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${monthlyWeekdayDow === i ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* N日ごと（interval） */}
        {repeat === 'interval' && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-2">何日ごと？</p>
              <div className="flex items-center gap-3">
                <input type="number" min={2} max={365} value={intervalDays}
                  onChange={e => setIntervalDays(Math.min(365, Math.max(2, Number(e.target.value))))}
                  className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <span className="text-sm text-gray-500">日ごと</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">開始日</p>
              <input type="date" value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
        )}

        {/* N月ごと（monthly-interval） */}
        {repeat === 'monthly-interval' && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-2">何か月ごと？</p>
              <div className="flex items-center gap-3">
                <input type="number" min={2} max={24} value={monthIntervalMonths}
                  onChange={e => setMonthIntervalMonths(Math.min(24, Math.max(2, Number(e.target.value))))}
                  className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <span className="text-sm text-gray-500">か月ごと</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">開始日</p>
              <input type="date" value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
        )}

        {/* メモ */}
        <div>
          <p className="text-xs text-gray-500 mb-2">メモ（任意）</p>
          <textarea value={memo} onChange={e => setMemo(e.target.value)}
            placeholder="補足・詳細など"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
        </div>

        {/* ボタン */}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">
            キャンセル
          </button>
          <button onClick={handleSave} disabled={!title.trim()}
            className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium disabled:opacity-40">
            {editing ? '保存' : '追加'}
          </button>
        </div>

        {/* 削除（編集時のみ） */}
        {editing && onDelete && (
          <button
            onClick={() => {
              if (confirm(`「${editing.title}」を削除しますか？`)) {
                onDelete(editing.id);
                onClose();
              }
            }}
            className="w-full py-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors">
            このタスクを削除
          </button>
        )}
      </div>
    </div>
  );
}
