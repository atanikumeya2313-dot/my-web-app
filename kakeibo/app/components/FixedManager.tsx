'use client';
import { useState } from 'react';
import { FixedItem, Category, TxType } from '../types';

interface Props {
  items: FixedItem[];
  categories: Category[];
  onChange: (items: FixedItem[]) => void;
}

export default function FixedManager({ items, categories, onChange }: Props) {
  const [type, setType]     = useState<TxType>('expense');
  const [name, setName]     = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCat]  = useState('');
  const [day, setDay]       = useState('1');

  const filteredCats = categories.filter(c => c.type === type);

  function add() {
    if (!name.trim() || !amount || !category) return;
    const item: FixedItem = {
      id: `fixed_${Date.now()}`,
      name: name.trim(),
      amount: Number(amount),
      type,
      category,
      day: Math.min(Math.max(Number(day), 1), 31),
    };
    onChange([...items, item]);
    setName(''); setAmount(''); setDay('1');
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-600 mb-1">固定費・固定収入</h2>
      <p className="text-xs text-gray-400 mb-3">毎月アプリ起動時に自動で追加されます</p>

      {items.length > 0 && (
        <ul className="space-y-2 mb-4">
          {items.map(item => {
            const cat = categories.find(c => c.id === item.category);
            return (
              <li key={item.id} className="flex items-center justify-between py-1 border-b border-gray-50">
                <div>
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {cat?.name} / 毎月{item.day}日 / ¥{item.amount.toLocaleString()}
                  </span>
                </div>
                <button onClick={() => onChange(items.filter(i => i.id !== item.id))}
                  className="text-xs text-red-400 hover:text-red-600 shrink-0">削除</button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2 border-t border-gray-100 pt-3">
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          {(['expense', 'income'] as TxType[]).map(t => (
            <button key={t} type="button" onClick={() => { setType(t); setCat(''); }}
              className={`flex-1 py-1.5 text-sm font-medium transition-colors ${type === t ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}>
              {t === 'expense' ? '支出' : '収入'}
            </button>
          ))}
        </div>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="名前（例：家賃、Netflixなど）"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="金額" min="1"
              className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg" />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-gray-500">毎月</span>
            <input type="number" value={day} onChange={e => setDay(e.target.value)}
              min="1" max="31"
              className="w-14 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center" />
            <span className="text-xs text-gray-500">日</span>
          </div>
        </div>
        <select value={category} onChange={e => setCat(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">カテゴリを選択</option>
          {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={add}
          className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium">追加</button>
      </div>
    </div>
  );
}