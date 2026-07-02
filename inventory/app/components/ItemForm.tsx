'use client';
import { useState } from 'react';
import { StockItem, DEFAULT_CATEGORIES, getCategoryIcon, UNITS } from '../types';

interface Props {
  editing?: StockItem;
  categories?: string[];
  customIcons?: Record<string, string>;
  onSave: (item: StockItem) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onCategoryAdd?: (cat: string, icon?: string) => void;
  onCategoryDelete?: (cat: string) => void;
  onClose: () => void;
}

export default function ItemForm({
  editing, categories, customIcons, onSave, onDelete, onDuplicate,
  onCategoryAdd, onCategoryDelete, onClose,
}: Props) {
  const cats = categories ?? DEFAULT_CATEGORIES;
  const [name,             setName]             = useState(editing?.name ?? '');
  const [category,         setCategory]         = useState<string>(editing?.category ?? cats[0] ?? '食品・飲料');
  const [quantity,         setQuantity]         = useState(editing?.quantity ?? 1);
  const [minQuantity,      setMinQuantity]      = useState(editing?.minQuantity ?? 1);
  const [targetQtyStr,     setTargetQtyStr]     = useState(
    editing?.targetQuantity !== undefined ? String(editing.targetQuantity) : ''
  );
  const [unit,             setUnit]             = useState(editing?.unit ?? '個');
  const [memo,             setMemo]             = useState(editing?.memo ?? '');
  const [expiryDate,       setExpiryDate]       = useState(editing?.expiryDate ?? '');
  const [newCat,           setNewCat]           = useState('');
  const [newCatIcon,       setNewCatIcon]       = useState('');
  const [showNewCat,       setShowNewCat]       = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const targetQuantity = targetQtyStr !== '' ? (parseInt(targetQtyStr) || undefined) : undefined;
    onSave({
      id:             editing?.id ?? crypto.randomUUID(),
      name:           name.trim(),
      category,
      quantity,
      minQuantity,
      targetQuantity,
      unit:           unit || '個',
      memo:           memo.trim() || undefined,
      expiryDate:     expiryDate || undefined,
      addedAt:        editing?.addedAt ?? new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-800">{editing ? 'アイテムを編集' : 'アイテムを追加'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="p-4 space-y-4 pb-8">
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
              {cats.map(cat => {
                const isCustom = !DEFAULT_CATEGORIES.includes(cat);
                return (
                  <div key={cat} className="relative">
                    <button onClick={() => setCategory(cat)}
                      className={`w-full py-2 pl-3 pr-7 rounded-xl text-sm border transition-colors text-left ${
                        category === cat
                          ? 'bg-blue-50 border-blue-400 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}>
                      {getCategoryIcon(cat, customIcons)} {cat}
                    </button>
                    {isCustom && (
                      <button
                        onClick={() => {
                          onCategoryDelete?.(cat);
                          if (category === cat) setCategory(cats[0] ?? DEFAULT_CATEGORIES[0]);
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400 text-xs rounded-full">
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {showNewCat ? (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-2">
                  <input value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)}
                    placeholder="🏷️" maxLength={2}
                    className="w-14 text-center px-2 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  <input value={newCat} onChange={e => setNewCat(e.target.value)}
                    placeholder="新しいカテゴリ名"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {
                    const t = newCat.trim();
                    if (t) { onCategoryAdd?.(t, newCatIcon.trim() || undefined); setCategory(t); }
                    setNewCat(''); setNewCatIcon(''); setShowNewCat(false);
                  }} className="flex-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded-xl font-medium">追加</button>
                  <button onClick={() => { setNewCat(''); setNewCatIcon(''); setShowNewCat(false); }}
                    className="px-3 py-1.5 text-xs border border-gray-200 text-gray-500 rounded-xl">✕</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowNewCat(true)}
                className="mt-2 text-xs text-blue-500 underline">＋ 新規カテゴリ</button>
            )}
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

          {/* Target Quantity */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">目標在庫数（省略可）</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setTargetQtyStr(String(Math.max(0, (parseInt(targetQtyStr) || 0) - 1)))}
                className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center">−</button>
              <input type="number" value={targetQtyStr} min={0}
                placeholder={String(minQuantity * 2)}
                onChange={e => setTargetQtyStr(e.target.value)}
                className="flex-1 text-center text-lg font-bold border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <button onClick={() => setTargetQtyStr(String((parseInt(targetQtyStr) || minQuantity * 2) + 1))}
                className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 font-bold text-lg flex items-center justify-center">＋</button>
              <span className="text-sm text-gray-400 w-8">{unit}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">補充済ボタンの設定先・在庫バーの基準になります</p>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">消費期限（任意）</label>
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300" />
            {expiryDate && (
              <button onClick={() => setExpiryDate('')}
                className="mt-1 text-xs text-gray-400 underline">クリア</button>
            )}
          </div>

          {/* Memo */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">メモ（任意）</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)}
              placeholder="保管場所・購入場所など"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
          </div>
        </div>

        {/* Buttons（常に見える固定フッター） */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
          {onDelete && (
            <button onClick={onDelete}
              className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium">
              削除
            </button>
          )}
          {onDuplicate && (
            <button onClick={onDuplicate}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium">
              複製
            </button>
          )}
          <button onClick={handleSubmit} disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-bold disabled:opacity-40">
            {editing ? '更新' : '追加'}
          </button>
        </div>
      </div>
    </div>
  );
}
