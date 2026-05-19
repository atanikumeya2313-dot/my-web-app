'use client';
import { useState } from 'react';
import { Category, TxType } from '../types';

interface Props { categories: Category[]; onChange: (cats: Category[]) => void; }

export default function CategoryManager({ categories, onChange }: Props) {
  const [tab, setTab]       = useState<TxType>('expense');
  const [newName, setNew]   = useState('');

  const filtered = categories.filter(c => c.type === tab);

  function addCat() {
    if (!newName.trim()) return;
    onChange([...categories, { id: `custom_${Date.now()}`, name: newName.trim(), type: tab, isDefault: false }]);
    setNew('');
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-600 mb-3">カテゴリ管理</h2>
      <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-3">
        {(['expense','income'] as TxType[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-sm font-medium transition-colors ${tab===t ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}>
            {t === 'expense' ? '支出' : '収入'}
          </button>
        ))}
      </div>
      <ul className="space-y-2 mb-3">
        {filtered.map(c => (
          <li key={c.id} className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-700">{c.name}</span>
            {!c.isDefault && (
              <button onClick={() => onChange(categories.filter(x => x.id !== c.id))}
                className="text-xs text-red-400 hover:text-red-600">削除</button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input value={newName} onChange={e => setNew(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCat()}
          placeholder="新しいカテゴリ名"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <button onClick={addCat}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium">追加</button>
      </div>
    </div>
  );
}
