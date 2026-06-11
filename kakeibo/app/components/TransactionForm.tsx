'use client';
import { useState, useEffect } from 'react';
import { Transaction, Category, TxType, Template, Asset } from '../types';
import { loadTemplates } from '../lib/storage';

interface Prefill {
  type?: TxType;
  amount?: number;
  category?: string;
  memo?: string;
}

interface Props {
  categories: Category[];
  assets?: Asset[];
  onSave: (tx: Transaction) => void;
  onClose: () => void;
  defaultDate: string;
  editing?: Transaction;
  prefill?: Prefill;
  onSaveTemplate?: (t: Template) => void;
}

export default function TransactionForm({ categories, assets = [], onSave, onClose, defaultDate, editing, prefill, onSaveTemplate }: Props) {
  const [type,        setType]   = useState<TxType>(editing?.type ?? prefill?.type ?? 'expense');
  const [date,        setDate]   = useState(editing?.date ?? defaultDate);
  const [amount,      setAmount] = useState(editing ? String(editing.amount) : prefill?.amount ? String(prefill.amount) : '');
  const [category,    setCat]    = useState(editing?.category ?? prefill?.category ?? '');
  const [memo,        setMemo]   = useState(editing?.memo ?? prefill?.memo ?? '');
  const [fromAssetId, setFrom]   = useState(editing?.fromAssetId ?? assets[0]?.id ?? '');
  const [toAssetId,   setTo]     = useState(editing?.toAssetId   ?? assets[1]?.id ?? assets[0]?.id ?? '');
  const [savedMsg, setSavedMsg] = useState(false);
  const [dupMsg,   setDupMsg]   = useState(false);

  const filteredCats = categories.filter(c => c.type === (type === 'transfer' ? 'expense' : type));

  useEffect(() => {
    if (!filteredCats.find(c => c.id === category)) {
      setCat(filteredCats[0]?.id ?? '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    if (type === 'transfer') {
      if (!fromAssetId || !toAssetId || fromAssetId === toAssetId) return;
      const fromName = assets.find(a => a.id === fromAssetId)?.name ?? fromAssetId;
      const toName   = assets.find(a => a.id === toAssetId)?.name   ?? toAssetId;
      const autoMemo = memo.trim() ? `${fromName}→${toName} ${memo.trim()}` : `${fromName}→${toName}`;
      onSave({ id: editing?.id ?? crypto.randomUUID(), date, amount: Number(amount), type: 'transfer', category: '', memo: autoMemo, fromAssetId, toAssetId });
    } else {
      if (!category) return;
      onSave({ id: editing?.id ?? crypto.randomUUID(), date, amount: Number(amount), type, category, memo });
    }
    onClose();
  }

  function handleSaveTemplate() {
    if (!amount || !category || !onSaveTemplate) return;
    const catName = filteredCats.find(c => c.id === category)?.name ?? 'テンプレート';
    const name = memo.trim() || `${catName} ¥${Number(amount).toLocaleString()}`;
    const existing = loadTemplates();
    if (existing.some(t => t.name === name)) {
      setDupMsg(true);
      setTimeout(() => setDupMsg(false), 2000);
      return;
    }
    onSaveTemplate({ id: crypto.randomUUID(), name, amount: Number(amount), type, category, memo });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
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
            {(['expense', 'income', 'transfer'] as TxType[]).map(t => (
              <button type="button" key={t}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  type === t
                    ? t === 'expense' ? 'bg-red-500 text-white'
                    : t === 'income'  ? 'bg-green-500 text-white'
                    : 'bg-purple-500 text-white'
                    : 'bg-white text-gray-500'
                }`}
                onClick={() => setType(t)}>
                {t === 'expense' ? '支出' : t === 'income' ? '収入' : '振替'}
              </button>
            ))}
          </div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" required />
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="金額" min="1"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" required />

          {type === 'transfer' ? (
            assets.length < 2 ? (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                振替を使うには設定画面で資産を2件以上登録してください
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <select value={fromAssetId} onChange={e => setFrom(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <span className="text-gray-400 text-sm shrink-0">→</span>
                <select value={toAssetId} onChange={e => setTo(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {assets.filter(a => a.id !== fromAssetId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )
          ) : (
            <select value={category} onChange={e => setCat(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" required>
              {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          <input type="text" value={memo} onChange={e => setMemo(e.target.value)}
            placeholder={type === 'transfer' ? 'メモ（任意）' : 'メモ（任意）'}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />

          <button type="submit"
            disabled={type === 'transfer' && (assets.length < 2 || fromAssetId === toAssetId)}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-40">
            {editing ? '更新する' : '追加する'}
          </button>

          {onSaveTemplate && !editing && type !== 'transfer' && (
            <button type="button" onClick={handleSaveTemplate}
              className={`w-full py-2 text-xs transition-colors ${dupMsg ? 'text-red-400' : savedMsg ? 'text-green-500' : 'text-gray-400 hover:text-blue-500'}`}>
              {dupMsg ? '⚠ 同名のテンプレートが既に存在します' : savedMsg ? '✓ テンプレートに保存しました' : 'テンプレートに保存'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
