'use client';
import { useState } from 'react';
import { StockItem, Category, CATEGORIES, CATEGORY_ICONS, UNITS } from '../types';

interface Props {
  editing?: StockItem;
  onSave: (item: StockItem) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function ItemForm({ editing, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(editing?.name ?? '');
  const [category, setCategory] = useState<Category>(editing?.category ?? '食品・飲料');
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
  const [minQuantity, setMinQuantity] = useState(editing?.minQuantity ?? 1);
  const [unit, setUnit] = useState(editing?.unit ?? '個');
  const [memo, setMemo] = useState(editing?.memo ?? '');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      category,
      quantity,
      minQuantity,
      unit: unit || '個',
      memo: memo.trim() || undefined,
      addedAt: editing?.addedAt ?? new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-800">{editing ? 'アイテムを編集' : 'アイテムを追加'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">アイテム名 *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="例: 洗剤、お米、バンドエイド"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">カテゴリ</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`py-2 px-3 rounded-xl text-sm border transition-colors text-left ${
                    category === cat
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}>
                  {CATEGORY_ICONS[cat]} {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Unit */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">単位</label>
            <input value={unit} onChange={e => setUnit(e.target.value)}
              placeholder="個"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2" />
            <div className="flex gap-1.5 flex-wrap">
              {UNITS.map(u => (
                <button key={u} onClick={() => setUnit(u)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    unit === u ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">現在の在庫数</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuantity(Math.max(0, quantity - 1))}
                className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center">−</button>
              <input type="number" value={quantity} min={0}
                onChange={e => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 text-center text-lg font-bold border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <button onClick={() => setQuantity(quantity + 1)}
                className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 font-bold text-lg flex items-center justify-center">＋</button>
              <span className="text-sm text-gray-400 w-8">{unit}</span>
            </div>
          </div>

          {/* Min Quantity */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">警告ライン（この数以下で要補充に表示）</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setMinQuantity(Math.max(0, minQuantity - 1))}
                className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center">−</button>
              <input type="number" value={minQuantity} min={0}
                onChange={e => setMinQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 text-center text-lg font-bold border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <button onClick={() => setMinQuantity(minQuantity + 1)}
                className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 font-bold text-lg flex items-center justify-center">＋</button>
              <span className="text-sm text-gray-400 w-8">{unit}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">0 に設定すると警告なし</p>
          </div>

          {/* Memo */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">メモ（任意）</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)}
              placeholder="保管場所・購入場所など"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2 pb-2">
            {onDelete && (
              <button onClick={onDelete}
                className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium">
                削除
              </button>
            )}
            <button onClick={handleSubmit} disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-bold disabled:opacity-40">
              {editing ? '更新' : '追加'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
