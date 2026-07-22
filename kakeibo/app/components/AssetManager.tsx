'use client';
import { useState } from 'react';
import { Asset, AssetType, Transaction } from '../types';

interface Props {
  assets: Asset[];
  transactions: Transaction[];
  onChange: (assets: Asset[]) => void;
}

const TYPE_LABEL: Record<AssetType, string> = {
  bank:       '銀行口座',
  investment: '投資・証券口座',
};

const fmt = (n: number) => `¥${Math.round(n).toLocaleString('ja-JP')}`;

// 現在残高（AssetSummary と同じ計算式）
function calcBalance(asset: Asset, txs: Transaction[]): number {
  const today = new Date().toISOString().slice(0, 10);
  if (asset.type === 'investment') {
    const up = txs.filter(t => t.type === 'transfer' && t.date <= today);
    const out = up.filter(t => t.fromAssetId === asset.id).reduce((s, t) => s + t.amount, 0);
    const inn = up.filter(t => t.toAssetId === asset.id).reduce((s, t) => s + t.amount, 0);
    return asset.initialBalance + inn - out;
  }
  const since = asset.initialDate <= today ? asset.initialDate : today;
  const after = txs.filter(t => t.date >= since && t.date <= today);
  const income = after.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = after.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const out = after.filter(t => t.type === 'transfer' && t.fromAssetId === asset.id).reduce((s, t) => s + t.amount, 0);
  const inn = after.filter(t => t.type === 'transfer' && t.toAssetId === asset.id).reduce((s, t) => s + t.amount, 0);
  return asset.initialBalance + income - expense - out + inn;
}

export default function AssetManager({ assets, transactions, onChange }: Props) {
  const [type,    setType]    = useState<AssetType>('bank');
  const [name,    setName]    = useState('');
  const [balance, setBalance] = useState('');
  const [date,    setDate]    = useState(() => new Date().toISOString().slice(0, 10));

  // 残高調整（実際の残高に合わせる）
  const [reconId,  setReconId]  = useState<string | null>(null);
  const [reconVal, setReconVal] = useState('');

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

  function updateInitial(id: string, newBalance: string) {
    onChange(assets.map(a => a.id === id ? { ...a, initialBalance: Number(newBalance) } : a));
  }

  function remove(id: string) {
    if (confirm('削除しますか？')) onChange(assets.filter(a => a.id !== id));
  }

  function openRecon(a: Asset) {
    setReconId(a.id);
    setReconVal(String(Math.round(calcBalance(a, transactions))));
  }

  // 実際の残高に合わせる：差額を初期残高に反映（収支・グラフには影響しない）
  function applyRecon(a: Asset) {
    const actual = Number(reconVal);
    if (!Number.isFinite(actual) || reconVal === '') return;
    const computed = calcBalance(a, transactions);
    const diff = actual - computed;
    onChange(assets.map(x => x.id === a.id ? { ...x, initialBalance: x.initialBalance + diff } : x));
    setReconId(null); setReconVal('');
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-600 mb-1">資産口座</h2>
      <p className="text-xs text-gray-400 mb-3">銀行口座は収支から残高を自動計算します。ズレたら「実際の残高に合わせる」で調整できます。</p>

      {/* 口座一覧 */}
      {assets.length > 0 && (
        <ul className="space-y-3 mb-4">
          {assets.map(a => {
            const bal = calcBalance(a, transactions);
            const diff = reconId === a.id && reconVal !== '' && Number.isFinite(Number(reconVal))
              ? Number(reconVal) - bal : 0;
            return (
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

                {/* 現在残高 */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">現在の残高（自動計算）</span>
                  <span className="text-base font-bold text-gray-800">{fmt(bal)}</span>
                </div>

                {/* 残高調整 */}
                {reconId === a.id ? (
                  <div className="mt-2 bg-blue-50/60 rounded-lg p-2.5 space-y-2">
                    <p className="text-[11px] text-gray-500">通帳・アプリの実際の残高を入れて「合わせる」を押すと、差額を初期残高に反映して一致させます（収支・グラフには影響しません）。</p>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">¥</span>
                        <input type="number" inputMode="numeric" value={reconVal}
                          onChange={e => setReconVal(e.target.value)}
                          className="w-full pl-5 pr-2 py-1.5 border border-gray-200 rounded text-sm text-right" />
                      </div>
                      <button onClick={() => applyRecon(a)}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold">合わせる</button>
                      <button onClick={() => { setReconId(null); setReconVal(''); }}
                        className="px-2 py-1.5 text-gray-400 text-xs">やめる</button>
                    </div>
                    {reconVal !== '' && diff !== 0 && (
                      <p className="text-[11px] text-gray-500">
                        ずれ：<b className={diff > 0 ? 'text-green-600' : 'text-red-500'}>{diff > 0 ? '+' : '−'}{fmt(Math.abs(diff))}</b>
                        （{diff > 0 ? '実際の方が多い' : '実際の方が少ない'}）
                      </p>
                    )}
                  </div>
                ) : (
                  <button onClick={() => openRecon(a)}
                    className="mt-1.5 text-xs text-blue-500 hover:text-blue-700 font-medium">
                    実際の残高に合わせる
                  </button>
                )}

                {/* 初期残高（詳細） */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50">
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">
                    {a.type === 'bank' ? `初期残高（${a.initialDate}時点）` : '登録残高'}
                  </span>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">¥</span>
                    <input key={`${a.id}-${a.initialBalance}`} type="number" defaultValue={a.initialBalance}
                      onBlur={e => updateInitial(a.id, e.target.value)}
                      className="w-full pl-5 pr-2 py-1 border border-gray-200 rounded text-sm text-right text-gray-500" />
                  </div>
                </div>
              </li>
            );
          })}
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
              placeholder={type === 'bank' ? '基準日時点の残高' : '現在の残高'} min="0"
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
