'use client';
import { useState } from 'react';
import { Transaction, Category, TxType } from '../types';

interface Props {
  transactions: Transaction[];
  categories: Category[];
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
}

const fmt = (n: number) => n.toLocaleString('ja-JP');

export default function TransactionList({ transactions, categories, onDelete, onEdit }: Props) {
  const [query,      setQuery]      = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TxType>('all');
  const [catFilter,  setCatFilter]  = useState('');

  const catName = (id: string) => categories.find(c => c.id === id)?.name ?? id;

  const activeCats = [...new Set(transactions.map(t => t.category))];

  const filtered = [...transactions]
    .filter(t => typeFilter === 'all' || t.type === typeFilter)
    .filter(t => catFilter === '' || t.category === catFilter)
    .filter(t => query === '' || catName(t.category).includes(query) || t.memo.includes(query))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      {/* キーワード検索 */}
      <div className="relative mb-2">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="メモ・カテゴリで検索"
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50" />
      </div>

      {/* 収支タイプフィルター */}
      <div className="flex gap-1.5 mb-2">
        {(['all', 'expense', 'income'] as const).map(v => (
          <button key={v} onClick={() => setTypeFilter(v)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              typeFilter === v ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
            {v === 'all' ? '全て' : v === 'expense' ? '支出' : '収入'}
          </button>
        ))}
      </div>

      {/* カテゴリフィルター */}
      {activeCats.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-2 mb-1">
          <button onClick={() => setCatFilter('')}
            className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              catFilter === '' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
            すべて
          </button>
          {activeCats.map(id => (
            <button key={id} onClick={() => setCatFilter(id === catFilter ? '' : id)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                catFilter === id ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
              {catName(id)}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-6">取引がありません</p>
      ) : (
        <ul className="space-y-1">
          {filtered.map(t => (
            <li key={t.id} className="flex items-center gap-2 py-2 border-b border-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 shrink-0">{catName(t.category)}</span>
                  {t.memo && <span className="text-xs text-gray-500 truncate">{t.memo}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{t.date}</p>
              </div>
              <span className={`font-semibold text-sm shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                {t.type === 'income' ? '+' : '-'}¥{fmt(t.amount)}
              </span>
              <button onClick={() => onEdit(t)} className="text-blue-400 text-xs shrink-0 px-1">編集</button>
              <button onClick={() => onDelete(t.id)} className="text-gray-300 text-xs shrink-0 px-1">✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
