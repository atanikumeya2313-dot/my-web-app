'use client';
import { useState } from 'react';
import { MyEvent, EVENT_CATEGORIES, EHIME_AREAS } from '../types';

interface Props {
  editing?: MyEvent;
  draft?: Partial<MyEvent>;      // AI候補からの事前入力
  onSave: (ev: MyEvent) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export default function EventForm({ editing, draft, onSave, onDelete, onClose }: Props) {
  const src = editing ?? draft;
  const [name,     setName]     = useState(src?.name ?? '');
  const [category, setCategory] = useState(src?.category ?? EVENT_CATEGORIES[0]);
  const [area,     setArea]     = useState(src?.area ?? EHIME_AREAS[0]);
  const [venue,    setVenue]    = useState(src?.venue ?? '');
  const [startDate,setStartDate]= useState(src?.startDate ?? '');
  const [endDate,  setEndDate]  = useState(src?.endDate ?? '');
  const [url,      setUrl]      = useState(src?.url ?? '');
  const [memo,     setMemo]     = useState(src?.memo ?? '');

  function submit() {
    if (!name.trim()) return;
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      category,
      area,
      ...(venue.trim() ? { venue: venue.trim() } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(url.trim() ? { url: url.trim() } : {}),
      ...(memo.trim() ? { memo: memo.trim() } : {}),
      favorite: editing?.favorite ?? false,
      source: editing?.source ?? src?.source,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
          <h2 className="font-bold text-gray-800">{editing ? 'イベントを編集' : 'イベントを追加'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-4 space-y-3 pb-8">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">イベント名 *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="例：◯◯マルシェ"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ジャンル</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
                {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">エリア（市町）</label>
              <select value={area} onChange={e => setArea(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
                {EHIME_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">会場（任意）</label>
            <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="例：◯◯公園"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">開始日（任意）</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">終了日（任意）</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">URL（公式・SNSなど・任意）</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." inputMode="url"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">メモ（任意）</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2} placeholder="内容・料金・時間など"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none" />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">キャンセル</button>
            <button onClick={submit} disabled={!name.trim()}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-40">{editing ? '保存' : '追加'}</button>
          </div>
          {editing && onDelete && (
            <button onClick={() => { if (confirm(`「${editing.name}」を削除しますか？`)) onDelete(editing.id); }}
              className="w-full py-2 text-sm font-medium text-red-500">このイベントを削除</button>
          )}
        </div>
      </div>
    </div>
  );
}
