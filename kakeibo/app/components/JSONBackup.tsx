'use client';
import { useRef, useState } from 'react';

const KEYS = [
  'kakeibo_transactions',
  'kakeibo_categories',
  'kakeibo_budgets',
  'kakeibo_fixed',
  'kakeibo_applied_months',
  'kakeibo_assets',
];

export default function JSONBackup() {
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [msg, setMsg]       = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function doExport() {
    const data: Record<string, unknown> = {};
    for (const key of KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) data[key] = JSON.parse(raw);
    }
    const json = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.href = url; a.download = `kakeibo_backup_${date}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('idle');

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed?.data || typeof parsed.data !== 'object') throw new Error('形式が不正です');

        for (const key of KEYS) {
          if (parsed.data[key] !== undefined) {
            localStorage.setItem(key, JSON.stringify(parsed.data[key]));
          }
        }
        setStatus('ok');
        setMsg('復元しました。ページを再読み込みします…');
        setTimeout(() => window.location.reload(), 1200);
      } catch {
        setStatus('error');
        setMsg('読み込みに失敗しました。正しいバックアップファイルか確認してください。');
      }
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsText(file);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-600 mb-1">JSONバックアップ</h2>
      <p className="text-xs text-gray-400 mb-3">全データ（取引・カテゴリ・予算・固定費・資産）をまとめて保存・復元できます</p>

      <div className="flex gap-2 mb-3">
        <button onClick={doExport}
          className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600">
          バックアップ
        </button>
        <button onClick={() => fileRef.current?.click()}
          className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
          復元
        </button>
      </div>

      <input ref={fileRef} type="file" accept=".json" onChange={doImport} className="hidden" />

      {status === 'ok'    && <p className="text-xs text-green-600 font-medium">{msg}</p>}
      {status === 'error' && <p className="text-xs text-red-500">{msg}</p>}
    </div>
  );
}
