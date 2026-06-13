'use client';
import { useState } from 'react';
import { Transaction, Category, TxType, SavedSearch } from '../types';
import { loadSavedSearches, saveSavedSearches } from '../lib/storage';
import { useStored } from '../lib/useStored';

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
  const [showAdv,    setShowAdv]    = useState(false);
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [amountMin,  setAmountMin]  = useState('');
  const [amountMax,  setAmountMax]  = useState('');
  const [saved,      setSaved]      = useStored<SavedSearch[]>(loadSavedSearches, []);

  const catName = (id: string) => categories.find(c => c.id === id)?.name ?? id;
  const activeCats = [...new Set(transactions.map(t => t.category))];

  const advActiveCount = [dateFrom, dateTo, amountMin, amountMax].filter(Boolean).length;
  const anyFilterActive = !!(query || catFilter || typeFilter !== 'all' || advActiveCount > 0);

  const clearAdv = () => { setDateFrom(''); setDateTo(''); setAmountMin(''); setAmountMax(''); };

  function applySearch(s: SavedSearch) {
    setQuery(s.query);
    setTypeFilter(s.typeFilter);
    setCatFilter(s.catFilter);
    setDateFrom(s.dateFrom);
    setDateTo(s.dateTo);
    setAmountMin(s.amountMin);
    setAmountMax(s.amountMax);
    if (s.dateFrom || s.dateTo || s.amountMin || s.amountMax) setShowAdv(true);
  }

  function saveCurrentSearch() {
    const name = prompt('この検索条件の名前を入力してください')?.trim();
    if (!name) return;
    const next = [
      ...saved.filter(s => s.name !== name),
      { id: crypto.randomUUID(), name, query, typeFilter, catFilter, dateFrom, dateTo, amountMin, amountMax },
    ];
    saveSavedSearches(next);
    setSaved(next);
  }

  function deleteSearch(id: string) {
    const next = saved.filter(s => s.id !== id);
    saveSavedSearches(next);
    setSaved(next);
  }

  const filtered = [...transactions]
    .filter(t => typeFilter === 'all' || t.type === typeFilter)
    .filter(t => catFilter === '' || t.category === catFilter)
    .filter(t => query === '' || catName(t.category).includes(query) || t.memo.includes(query))
    .filter(t => !dateFrom   || t.date >= dateFrom)
    .filter(t => !dateTo     || t.date <= dateTo)
    .filter(t => !amountMin  || t.amount >= Number(amountMin))
    .filter(t => !amountMax  || t.amount <= Number(amountMax))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      {/* 保存した検索条件 */}
      {saved.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-2 mb-2">
          {saved.map(s => (
            <span key={s.id}
              className="shrink-0 flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
              <button onClick={() => applySearch(s)} className="whitespace-nowrap">⭐ {s.name}</button>
              <button onClick={() => deleteSearch(s.id)} className="text-amber-300 hover:text-red-400 leading-none">✕</button>
            </span>
          ))}
        </div>
      )}

      {/* キーワード検索 */}
      <div className="relative mb-2">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="メモ・カテゴリで検索"
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50" />
      </div>

      {/* 収支タイプフィルター */}
      <div className="flex items-center gap-1.5 mb-2">
        {(['all', 'expense', 'income', 'transfer'] as const).map(v => (
          <button key={v} onClick={() => setTypeFilter(v)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              typeFilter === v ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
            {v === 'all' ? '全て' : v === 'expense' ? '支出' : v === 'income' ? '収入' : '振替'}
          </button>
        ))}

        {/* 詳細フィルタートグル */}
        <button
          onClick={() => setShowAdv(v => !v)}
          className={`ml-auto flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            advActiveCount > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
          }`}>
          🔧 詳細
          {advActiveCount > 0 && (
            <span className="bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
              {advActiveCount}
            </span>
          )}
        </button>
      </div>

      {/* 詳細フィルター（展開時） */}
      {showAdv && (
        <div className="bg-gray-50 rounded-xl p-3 mb-2 space-y-2 border border-gray-100">
          {/* 日付範囲 */}
          <div>
            <p className="text-xs text-gray-400 mb-1">期間</p>
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />
              <span className="text-xs text-gray-400">〜</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />
            </div>
          </div>

          {/* 金額範囲 */}
          <div>
            <p className="text-xs text-gray-400 mb-1">金額</p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">¥</span>
                <input type="number" value={amountMin} onChange={e => setAmountMin(e.target.value)}
                  placeholder="下限" min="0"
                  className="w-full pl-5 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white" />
              </div>
              <span className="text-xs text-gray-400">〜</span>
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">¥</span>
                <input type="number" value={amountMax} onChange={e => setAmountMax(e.target.value)}
                  placeholder="上限" min="0"
                  className="w-full pl-5 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white" />
              </div>
            </div>
          </div>

          {advActiveCount > 0 && (
            <button onClick={clearAdv}
              className="w-full py-1 text-xs text-gray-400 hover:text-red-400 transition-colors">
              フィルターをクリア
            </button>
          )}
        </div>
      )}

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

      {/* 件数表示・条件保存 */}
      {anyFilterActive && (
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-400">{filtered.length} 件</p>
          <button onClick={saveCurrentSearch}
            className="text-xs text-amber-500 hover:text-amber-600 font-medium">
            ⭐ この条件を保存
          </button>
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
                  {t.type === 'transfer'
                    ? <span className="text-xs bg-purple-50 text-purple-600 rounded px-1.5 py-0.5 shrink-0">振替</span>
                    : <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 shrink-0">{catName(t.category)}</span>
                  }
                  {t.memo && <span className="text-xs text-gray-500 truncate">{t.memo}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{t.date}</p>
              </div>
              <span className={`font-semibold text-sm shrink-0 ${
                t.type === 'income' ? 'text-green-600' : t.type === 'transfer' ? 'text-purple-500' : 'text-red-500'
              }`}>
                {t.type === 'income' ? '+' : t.type === 'transfer' ? '↔' : '-'}¥{fmt(t.amount)}
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
