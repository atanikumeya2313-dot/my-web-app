'use client';
import { useState } from 'react';
import { Asset, AssetType } from '../types';

interface Props {
  assets: Asset[];
  onChange: (assets: Asset[]) => void;
}

const TYPE_LABEL: Record<AssetType, string> = {
  bank:       '銀行口座',
  investment: '投資・証券口座',
};

export default function AssetManager({ assets, onChange }: Props) {
  const [type,    setType]    = useState<AssetType>('bank');
  const [name,    setName]    = useState('');
  const [balance, setBalance] = useState('');
  const [date,    setDate]    = useState(() => new Date().toISOString().slice(0, 10));

  function add() {
    if (!name.trim() || balance === '') return;
    const asset: Asset = {
      id:             `asset_${Date.now()}`,
      name:           name.trim(),
      type,
      initialBalance: Number(balance),
      initialDate:    date,
    };
    onChange([...assets, asset]);
    setName(''); setBalance('');
  }

  function update(id: string, newBalance: string) {
    onChange(assets.map(a =>
      a.id === id ? { ...a, initialBalance: Number(newBalance) } : a
    ));
  }

  function remove(id: string) {
    if (confirm('削除しますか？')) onChange(assets.filter(a => a.id !== id));
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-600 mb-1">資産口座</h2>
      <p className="text-xs text-gray-400 mb-3">銀行口座は収支から残高を自動計算します</p>

      {/* 口座一覧 */}
      {assets.length > 0 && (
        <ul className="space-y-3 mb-4">
          {assets.map(a => (
            <li key={a.id} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${a.type === 'bank' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                    {TYPE_LABEL[a.type]}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{a.name}</span>
                </div>
                <button onClick={() => remove(a.id)} className="text-xs text-red-400 hover:text-red-600">削除</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {a.type === 'bank' ? `${a.initialDate} 時点の残高` : '現在の残高'}
                </span>
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">¥</span>
                  <input type="number" defaultValue={a.initialBalance}
                    onBlur={e => update(a.id, e.target.value)}
                    className="w-full pl-5 pr-2 py-1 border border-gray-200 rounded text-sm text-right" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 追加フォーム */}
      <div className="space-y-2 border-t border-gray-100 pt-3">
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          {(['bank', 'investment'] as AssetType[]).map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${type === t ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}>
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="口座名（例：伊予銀行、SBI証券）"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
            <input type="number" value={balance} onChange={e => setBalance(e.target.value)}
              placeholder="初期残高" min="0"
              className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg" />
          </div>
          {type === 'bank' && (
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-2 text-sm text-gray-600" />
          )}
        </div>

        {type === 'bank' && (
          <p className="text-xs text-gray-400">基準日以降の家計簿の収支を使って残高を自動計算します</p>
        )}

        <button onClick={add}
          className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600">
          追加
        </button>
      </div>
    </div>
  );
}
