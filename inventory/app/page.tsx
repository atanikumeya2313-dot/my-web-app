'use client';
import { useEffect, useRef, useState } from 'react';
import { StockItem, HistoryEntry, Category, CATEGORIES, CATEGORY_ICONS, SortKey } from './types';
import {
  loadItems, addItem, updateItem, deleteItem,
  loadHistory, addHistoryEntry,
  exportData, importData,
} from './lib/storage';
import ItemCard from './components/ItemCard';
import ItemForm from './components/ItemForm';

type Tab = 'inventory' | 'shopping' | 'history';

const CAT_ALL = '全て';

const SORT_LABELS: Record<SortKey, string> = {
  'name':      '名前順',
  'low-stock': '残量少ない順',
  'category':  'カテゴリ順',
  'expiry':    '期限が近い順',
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

export default function Home() {
  const [items,    setItems]    = useState<StockItem[]>([]);
  const [history,  setHistory]  = useState<HistoryEntry[]>([]);
  const [tab,      setTab]      = useState<Tab>('inventory');
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<StockItem | undefined>();
  const [query,    setQuery]    = useState('');
  const [catFilter, setCatFilter] = useState<string>(CAT_ALL);
  const [sortKey,  setSortKey]  = useState<SortKey>('name');
  const [showSort, setShowSort] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(loadItems());
    setHistory(loadHistory());
  }, []);

  const recordHistory = (item: StockItem, delta: number, quantityAfter: number) => {
    const next = addHistoryEntry({
      itemId: item.id,
      itemName: item.name,
      delta,
      quantityAfter,
      date: new Date().toISOString(),
    });
    setHistory(next);
  };

  const handleSave = (item: StockItem) => {
    setItems(editing ? updateItem(item) : addItem(item));
    setEditing(undefined);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setItems(deleteItem(id));
    setEditing(undefined);
    setShowForm(false);
  };

  const handleQuantityChange = (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(0, item.quantity + delta);
    const updated = { ...item, quantity: newQty };
    setItems(updateItem(updated));
    recordHistory(item, delta, newQty);
  };

  const handleRestock = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newQty = item.minQuantity + 1;
    const delta  = newQty - item.quantity;
    setItems(updateItem({ ...item, quantity: newQty }));
    recordHistory(item, delta, newQty);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = importData(ev.target?.result as string);
      if (result) {
        setItems(result.items);
        setHistory(result.history);
        alert('インポート完了しました');
      } else {
        alert('インポートに失敗しました。ファイル形式を確認してください。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const openEdit = (item: StockItem) => { setEditing(item); setShowForm(true); };
  const openAdd  = () => { setEditing(undefined); setShowForm(true); };

  function sortItems(list: StockItem[]): StockItem[] {
    return [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'ja');
      if (sortKey === 'low-stock') {
        const ra = a.minQuantity > 0 ? a.quantity / a.minQuantity : Infinity;
        const rb = b.minQuantity > 0 ? b.quantity / b.minQuantity : Infinity;
        return ra - rb;
      }
      if (sortKey === 'category') return a.category.localeCompare(b.category, 'ja');
      if (sortKey === 'expiry') {
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return a.expiryDate.localeCompare(b.expiryDate);
      }
      return 0;
    });
  }

  const inventoryItems = sortItems(
    items
      .filter(i => catFilter === CAT_ALL || i.category === catFilter)
      .filter(i => !query || i.name.toLowerCase().includes(query.toLowerCase()))
  );

  const shoppingItems = items
    .filter(i => i.quantity <= i.minQuantity)
    .sort((a, b) =>
      (a.quantity / Math.max(a.minQuantity, 1)) - (b.quantity / Math.max(b.minQuantity, 1))
    );

  const lowCount = shoppingItems.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">🏠 在庫管理</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{items.length}件</span>
            <button onClick={() => exportData()}
              className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
              書き出し
            </button>
            <button onClick={() => importRef.current?.click()}
              className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
              読み込み
            </button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </div>

        <div className="flex border-t border-gray-100">
          {([
            { key: 'inventory', icon: '📦', label: '在庫一覧' },
            { key: 'shopping',  icon: '🛒', label: '要補充' },
            { key: 'history',   icon: '📋', label: '履歴' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`relative flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${tab === t.key ? 'text-blue-500' : 'text-gray-400'}`}>
              <span className="text-sm leading-none">{t.icon}</span>
              <span className="font-medium">{t.label}</span>
              {t.key === 'shopping' && lowCount > 0 && (
                <span className={`text-[10px] ${tab === t.key ? 'text-blue-400' : 'text-orange-400'}`}>{lowCount}</span>
              )}
              {tab === t.key && <span className="absolute bottom-0 inset-x-3 h-0.5 bg-blue-500 rounded-full" />}
            </button>
          ))}
        </div>

        {tab === 'inventory' && (
          <div className="px-4 pt-2 pb-1 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="アイテム名で検索"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="relative">
                <button onClick={() => setShowSort(v => !v)}
                  className={`px-3 py-2 text-xs rounded-xl border transition-colors ${showSort ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  ↕ {SORT_LABELS[sortKey]}
                </button>
                {showSort && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[130px]">
                    {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
                      <button key={k} onClick={() => { setSortKey(k); setShowSort(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs ${sortKey === k ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                        {SORT_LABELS[k]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {[CAT_ALL, ...CATEGORIES].map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    catFilter === cat
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}>
                  {cat === CAT_ALL ? '全て' : `${CATEGORY_ICONS[cat as Category]} ${cat}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="px-4 py-3 pb-24">
        {/* 在庫一覧 */}
        {tab === 'inventory' && (
          inventoryItems.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-gray-400 text-sm">
                {query || catFilter !== CAT_ALL ? '該当するアイテムがありません' : 'アイテムを追加してください'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {inventoryItems.map(item => (
                <ItemCard key={item.id} item={item}
                  onEdit={() => openEdit(item)}
                  onQuantityChange={delta => handleQuantityChange(item.id, delta)} />
              ))}
            </div>
          )
        )}

        {/* 要補充 */}
        {tab === 'shopping' && (
          shoppingItems.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-gray-400 text-sm">在庫は十分です</p>
            </div>
          ) : (
            <div className="space-y-2">
              {shoppingItems.map(item => (
                <div key={item.id} className={`bg-white rounded-xl p-3 shadow-sm border ${item.quantity === 0 ? 'border-red-200' : 'border-orange-200'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{CATEGORY_ICONS[item.category]}</span>
                    <button onClick={() => openEdit(item)} className="flex-1 text-left min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.category}</p>
                    </button>
                    <div className="text-right shrink-0 mr-1">
                      <p className={`text-sm font-bold ${item.quantity === 0 ? 'text-red-500' : 'text-orange-500'}`}>
                        {item.quantity}
                        <span className="text-xs font-normal text-gray-400 ml-0.5">{item.unit}</span>
                      </p>
                      <p className="text-[10px] text-gray-400">最低 {item.minQuantity}{item.unit}</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => handleQuantityChange(item.id, 1)}
                        className="w-9 h-9 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-lg leading-none">
                        ＋
                      </button>
                      <button onClick={() => handleRestock(item.id)}
                        className="text-[10px] px-2 py-1 rounded-lg bg-green-100 text-green-700 font-medium whitespace-nowrap">
                        補充済
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* 履歴 */}
        {tab === 'history' && (
          history.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-gray-400 text-sm">履歴はまだありません</p>
            </div>
          ) : (
            <div className="space-y-1">
              {history.map(h => (
                <div key={h.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
                  <span className={`text-lg font-bold shrink-0 w-8 text-center ${h.delta > 0 ? 'text-green-500' : 'text-red-400'}`}>
                    {h.delta > 0 ? '＋' : '－'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{h.itemName}</p>
                    <p className="text-xs text-gray-400">{fmtDate(h.date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${h.delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {h.delta > 0 ? `+${h.delta}` : h.delta}
                    </p>
                    <p className="text-[10px] text-gray-400">→ {h.quantityAfter}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      <button onClick={openAdd}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-500 text-white rounded-full text-2xl shadow-lg hover:bg-blue-600 flex items-center justify-center z-40">
        +
      </button>

      {showForm && (
        <ItemForm
          editing={editing}
          onSave={handleSave}
          onDelete={editing ? () => handleDelete(editing.id) : undefined}
          onClose={() => { setShowForm(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}
