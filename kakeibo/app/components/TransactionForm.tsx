'use client';
import { useState, useEffect } from 'react';
import { Transaction, Category, TxType } from '../types';

interface Props {
  categories: Category[];
  onSave: (tx: Transaction) => void;
  onClose: () => void;
  defaultDate: string;
  editing?: Transaction;
}

export default function TransactionForm({ categories, onSave, onClose, defaultDate, editing }: Props) {
  const [type, setType]     = useState<TxType>(editing?.type ?? 'expense');
  const [date, setDate]     = useState(editing?.date ?? defaultDate);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [category, setCat]  = useState(editing?.category ?? '');
  const [memo, setMemo]     = useState(editing?.memo ?? '');

  const filteredCats = categories.filter(c => c.type === type);

  useEffect(() => {
    if (!filteredCats.find(c => c.id === category)) {
      setCat(filteredCats[0]?.id ?? '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !category) return;
    onSave({ id: editing?.id ?? crypto.randomUUID(), date, amount: Number(amount), type, category, memo });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-[200]" onClick={onClose}>
      <div className="bg-white w-full rounded-t-2xl p-5 max-w-lg mx-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-800">{editing ? '取引を編集' : '取引を追加'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {(['expense', 'income'] as TxType[]).map(t => (
              <button type="button" key={t}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${type === t ? (t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white') : 'bg-white text-gray-500'}`}
                onClick={() => setType(t)}>
                {t === 'expense' ? '支出' : '収入'}
              </button>
            ))}
          </div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" required />
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="金額" min="1"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" required />
          <select value={category} onChange={e => setCat(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" required>
            {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="text" value={memo} onChange={e => setMemo(e.target.value)}
            placeholder="メモ（任意）"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button type="submit"
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium">
            {editing ? '更新する' : '追加する'}
          </button>
        </form>
      </div>
    </div>
  );
}
