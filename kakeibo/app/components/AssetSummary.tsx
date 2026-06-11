'use client';
import { useState } from 'react';
import { Asset, Transaction } from '../types';

interface Props {
  assets: Asset[];
  transactions: Transaction[];
}

const fmt = (n: number) => n.toLocaleString('ja-JP');

function calcBalance(asset: Asset, transactions: Transaction[]): number {
  if (asset.type === 'investment') return asset.initialBalance;
  const today = new Date().toISOString().slice(0, 10);
  const since = asset.initialDate <= today ? asset.initialDate : today;
  const afterInit = transactions.filter(t => t.date >= since && t.date <= today);
  const income      = afterInit.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense     = afterInit.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const transferOut = afterInit.filter(t => t.type === 'transfer' && t.fromAssetId === asset.id).reduce((s, t) => s + t.amount, 0);
  const transferIn  = afterInit.filter(t => t.type === 'transfer' && t.toAssetId   === asset.id).reduce((s, t) => s + t.amount, 0);
  return asset.initialBalance + income - expense - transferOut + transferIn;
}

export default function AssetSummary({ assets, transactions }: Props) {
  const [open, setOpen] = useState(false);

  if (assets.length === 0) return null;

  const balances = assets.map(a => ({ ...a, balance: calcBalance(a, transactions) }));
  const total    = balances.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3 flex items-center justify-between">
        <div className="text-left">
          <p className="text-xs text-gray-400">総資産</p>
          <p className="text-xl font-bold text-gray-800">¥{fmt(total)}</p>
        </div>
        <span className="text-gray-300 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {balances.map(a => (
            <div key={a.id} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${a.type === 'bank' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                  {a.type === 'bank' ? '銀行' : '投資'}
                </span>
                <span className="text-sm text-gray-700">{a.name}</span>
              </div>
              <span className="text-sm font-semibold text-gray-800">¥{fmt(a.balance)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
