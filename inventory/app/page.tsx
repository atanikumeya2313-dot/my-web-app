'use client';
import { useEffect, useState } from 'react';
import { StockItem, Category, CATEGORIES, CATEGORY_ICONS } from './types';
import { loadItems, addItem, updateItem, deleteItem } from './lib/storage';
import ItemCard from './components/ItemCard';
import ItemForm from './components/ItemForm';

type Tab = 'inventory' | 'shopping';

const CAT_ALL = '全て';

export default function Home() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [tab, setTab] = useState<Tab>('inventory');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StockItem | undefined>();
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>(CAT_ALL);

  useEffect(() => { setItems(loadItems()); }, []);

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
    setItems(updateItem({ ...item, quantity: Math.max(0, item.quantity + delta) }));
  };

  const openEdit = (item: StockItem) => { setEditing(item); setShowForm(true); };
  const openAdd  = () => { setEditing(undefined); setShowForm(true); };

  const inventoryItems = items
    .filter(i => catFilter === CAT_ALL || i.category === catFilter)
    .filter(i => !query || i.name.toLowerCase().includes(query.toLowerCase()));

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
          <span className="text-xs text-gray-400">{items.length}件登録</span>
        </div>

        <div className="flex border-t border-gray-100">
          {([
            { key: 'inventory', icon: '📦', label: '在庫一覧' },
            { key: 'shopping',  icon: '🛒', label: '要補充' },
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
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="アイテム名で検索"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300" />
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

      <main className="px-4 py-3">
        {tab === 'inventory' ? (
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
        ) : (
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
                      <p className="text-[10px] text-gray-400">目標 {item.minQuantity}{item.unit}</p>
                    </div>
                    <button onClick={() => handleQuantityChange(item.id, 1)}
                      className="w-9 h-9 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center shrink-0 text-lg leading-none">
                      ＋
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      <button onClick={openAdd}
        className="fixed bottom-6 right-4 w-14 h-14 bg-blue-500 text-white rounded-full text-2xl shadow-lg hover:bg-blue-600 flex items-center justify-center z-40">
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
