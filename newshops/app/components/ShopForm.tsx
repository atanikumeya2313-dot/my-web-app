'use client';
import { useState } from 'react';
import { Shop, ShopStatus, CATEGORIES, EHIME_AREAS } from '../types';

interface Props {
  editing?: Shop;
  draft?: Partial<Shop>;        // AI候補からの事前入力
  onSave: (shop: Shop) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export default function ShopForm({ editing, draft, onSave, onDelete, onClose }: Props) {
  const src = editing ?? draft;
  const [name,    setName]    = useState(src?.name ?? '');
  const [category,setCategory]= useState(src?.category ?? CATEGORIES[0]);
  const [area,    setArea]    = useState(src?.area ?? EHIME_AREAS[0]);
  const [status,  setStatus]  = useState<ShopStatus>(src?.status ?? 'planned');
  const [openDate,setOpenDate]= useState(src?.openDate ?? '');
  const [url,     setUrl]     = useState(src?.url ?? '');
  const [memo,    setMemo]    = useState(src?.memo ?? '');

  function submit() {
    if (!name.trim()) return;
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      category,
      area,
      status,
      ...(openDate ? { openDate } : {}),
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
          <h2 className="font-bold text-gray-800">{editing ? 'お店を編集' : 'お店を追加'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-4 space-y-3 pb-8">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">店名 *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="例：◯◯カフェ"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          </div>

          {/* 状態 */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
            <button type="button" onClick={() => setStatus('planned')}
              className={`flex-1 py-2 font-medium ${status === 'planned' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-500'}`}>オープン予定</button>
            <button type="button" onClick={() => setStatus('open')}
              className={`flex-1 py-2 font-medium ${status === 'open' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-500'}`}>オープン済</button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">カテゴリ</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
            <label className="text-xs text-gray-500 mb-1 block">{status === 'planned' ? 'オープン予定日' : 'オープン日'}（任意）</label>
            <input type="date" value={openDate} onChange={e => setOpenDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">URL（公式・SNSなど・任意）</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." inputMode="url"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">メモ（任意）</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2} placeholder="場所・特徴など"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none" />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">キャンセル</button>
            <button onClick={submit} disabled={!name.trim()}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-40">{editing ? '保存' : '追加'}</button>
          </div>
          {editing && onDelete && (
            <button onClick={() => { if (confirm(`「${editing.name}」を削除しますか？`)) onDelete(editing.id); }}
              className="w-full py-2 text-sm font-medium text-red-500">このお店を削除</button>
          )}
        </div>
      </div>
    </div>
  );
}
