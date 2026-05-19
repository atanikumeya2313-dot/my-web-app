'use client';
import { loadTransactions, loadCategories } from '../lib/storage';

export default function CSVExport() {
  function doExport(all: boolean) {
    const txs  = loadTransactions();
    const cats = loadCategories();
    const catName = (id: string) => cats.find(c => c.id === id)?.name ?? id;

    const now = new Date();
    const ym  = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`;
    const ymKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const data = all ? txs : txs.filter(t => t.date.startsWith(ymKey));

    const rows = [
      ['日付','種別','カテゴリ','金額','メモ'],
      ...data.sort((a,b) => a.date.localeCompare(b.date)).map(t => [
        t.date, t.type === 'income' ? '収入' : '支出', catName(t.category), String(t.amount), t.memo
      ])
    ];

    const csv  = '﻿' + rows.map(r => r.map(v => `"${v.replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `kakeibo_${all ? 'all' : ym}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-600 mb-3">CSVエクスポート</h2>
      <div className="flex gap-2">
        <button onClick={() => doExport(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">今月分</button>
        <button onClick={() => doExport(true)}  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">全期間</button>
      </div>
    </div>
  );
}
