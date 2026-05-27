'use client';
import { useState, useRef } from 'react';
import { Transaction, TxType } from '../types';
import { loadTransactions, saveTransactions, loadCategories } from '../lib/storage';

type ParsedRow = { date: string; amount: number; type: TxType; memo: string; category: string };

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}

function toDate(s: string): string {
  const clean = s.replace(/[^\d]/g, '');
  if (clean.length === 8) return `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}`;
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
  return s;
}

function toAmount(s: string): number {
  return parseInt(s.replace(/[^0-9]/g, '') || '0');
}

// マネーフォワードの大項目・中項目 → 家計簿カテゴリ名
const MF_CATEGORY_MAP: Record<string, string> = {
  // ── 食費 ──
  '食費': '食費',

  // ── 交通費 ──
  '交通費': '交通費',
  '自動車': '交通費',

  // ── 光熱費 ──
  '光熱費':     '光熱費',
  '水道・光熱費': '光熱費',

  // ── 住居費 ──
  '住宅': '住居費',

  // ── 日用品 ──
  '日用品':     '日用品',
  '衣服・美容': '日用品',

  // ── 娯楽費 ──
  '趣味・娯楽': '娯楽費',
  '教養・教育': '娯楽費',
  '教育':       '娯楽費',

  // ── その他（支出） ──
  '通信費':       'その他',
  '健康・医療':   'その他',
  '交際費':       'その他',
  '税・社会保障': 'その他',
  '保険':         'その他',
  '特別な支出':   'その他',
  'その他':       'その他',

  // ── 収入 ──
  '収入':       '給与',
  '給与・賞与': '給与',
  '事業・副業': '臨時収入',
  '年金・保険': '臨時収入',
  '投資収益':   '臨時収入',
  'その他収入': '臨時収入',
};

// マネーフォワードの中項目 → 家計簿カテゴリ名（大項目でマッチしなかった場合の補完）
const MF_SUB_CATEGORY_MAP: Record<string, string> = {
  // 通信費系
  '携帯電話':   'その他',
  'スマートフォン': 'その他',
  'インターネット': 'その他',
  '固定電話':   'その他',
  // 医療系
  '医療費':     'その他',
  '薬':         'その他',
  'ドラッグストア': 'その他',
  // 衣服
  '衣類':       '日用品',
  '美容':       '日用品',
  '理髪':       '日用品',
  // 交通
  'ガソリン':   '交通費',
  '電車':       '交通費',
  'バス':       '交通費',
  'タクシー':   '交通費',
  // 保険
  '生命保険':   'その他',
  '医療保険':   'その他',
  '損害保険':   'その他',
};

function parseCSV(text: string): ParsedRow[] | { error: string } {
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { error: 'データが少なすぎます' };

  const headerLine = lines[0].replace(/^﻿/, '');
  const headers = parseCSVLine(headerLine).map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(l =>
    parseCSVLine(l).map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))
  );

  const idx = (...names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex(h => h.includes(n));
      if (i >= 0) return i;
    }
    return -1;
  };

  // 家計簿エクスポート形式: 日付, 種別, カテゴリ, 金額, メモ
  if (idx('日付') >= 0 && idx('種別') >= 0 && idx('金額') >= 0) {
    const di = idx('日付'), ti = idx('種別'), ai = idx('金額'), mi = idx('メモ'), ci = idx('カテゴリ');
    return rows
      .filter(r => r.length > Math.max(di, ti, ai))
      .map(r => ({
        date: toDate(r[di]),
        type: (r[ti] === '収入' ? 'income' : 'expense') as TxType,
        amount: toAmount(r[ai]),
        memo: mi >= 0 ? r[mi] : '',
        category: ci >= 0 ? r[ci] : '',
      }))
      .filter(r => r.amount > 0);
  }

  // 楽天銀行: 取引日, 入出金(円), 残高(円), 取引内容
  if (idx('取引日') >= 0 && idx('入出金') >= 0) {
    const di = idx('取引日'), ai = idx('入出金'), mi = idx('取引内容', 'メモ');
    return rows
      .filter(r => r.length > Math.max(di, ai))
      .map(r => {
        const raw = r[ai].replace(/[^0-9\-]/g, '');
        const signed = parseInt(raw || '0');
        return {
          date: toDate(r[di]),
          type: (signed >= 0 ? 'income' : 'expense') as TxType,
          amount: Math.abs(signed),
          memo: mi >= 0 ? r[mi] : '',
          category: '',
        };
      })
      .filter(r => r.amount > 0);
  }

  // 住信SBIネット銀行 / 三菱UFJ / ゆうちょ: 出金列・入金列が別々
  const outIdx = idx('出金金額', 'お支払い金額', '支払い金額', '出金');
  const incIdx = idx('入金金額', 'お預かり金額', '預入金額', '入金');
  if (outIdx >= 0 && incIdx >= 0) {
    const di = idx('年月日', '取引日', '日付');
    const mi = idx('取引内容', 'お取り扱い内容', '摘要', 'メモ');
    return rows
      .filter(r => r.length > Math.max(di, outIdx, incIdx))
      .flatMap(r => {
        const out = toAmount(r[outIdx]);
        const inc = toAmount(r[incIdx]);
        const memo = mi >= 0 ? r[mi] : '';
        const date = toDate(r[di]);
        const result: ParsedRow[] = [];
        if (out > 0) result.push({ date, type: 'expense', amount: out, memo, category: '' });
        if (inc > 0) result.push({ date, type: 'income',  amount: inc, memo, category: '' });
        return result;
      });
  }

  // マネーフォワードME: 計算対象, 日付, 内容, 金額（円）, 保有金融機関, 大項目, 中項目, メモ, 振替, ID
  if (idx('計算対象') >= 0 && idx('金額（円）', '金額') >= 0 && idx('内容') >= 0) {
    const targetIdx = idx('計算対象');
    const di     = idx('日付');
    const ai     = idx('金額（円）', '金額');
    const mi     = idx('内容');
    const cati   = idx('大項目');
    const subCati = idx('中項目');
    const trIdx  = idx('振替');
    return rows
      .filter(r => r.length > Math.max(di, ai))
      .filter(r => r[trIdx] !== '1')       // 振替（口座間移動）を除外
      .filter(r => r[targetIdx] === '1')   // 計算対象外を除外
      .map(r => {
        const signed  = parseInt(r[ai].replace(/[^0-9\-]/g, '') || '0');
        const mfCat   = cati    >= 0 ? r[cati]    : '';
        const mfSub   = subCati >= 0 ? r[subCati] : '';
        // 大項目 → 中項目 の順でマッチング
        const mappedCat = MF_CATEGORY_MAP[mfCat] ?? MF_SUB_CATEGORY_MAP[mfSub] ?? '';
        return {
          date:     toDate(r[di]),
          type:     (signed >= 0 ? 'income' : 'expense') as TxType,
          amount:   Math.abs(signed),
          memo:     r[mi] ?? '',
          category: mappedCat,
        };
      })
      .filter(r => r.amount > 0);
  }

  return { error: '対応していない形式です。マネーフォワード・家計簿エクスポート・楽天銀行・SBI・三菱UFJ・ゆうちょに対応しています。' };
}

export default function CSVImport() {
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setDone(false); setPreview(null);

    const reader = new FileReader();
    reader.onload = ev => {
      const buffer = ev.target?.result as ArrayBuffer;
      let text = new TextDecoder('utf-8').decode(buffer);
      // 文字化けしていればShift-JISで再デコード
      if (text.includes('�')) {
        text = new TextDecoder('shift-jis').decode(buffer);
      }
      const result = parseCSV(text);
      if ('error' in result) { setError(result.error); return; }
      if (result.length === 0) { setError('取り込めるデータがありませんでした'); return; }
      setPreview(result);
    };
    reader.readAsArrayBuffer(file);
  }

  function handleImport() {
    if (!preview) return;
    const cats    = loadCategories();
    const existing = loadTransactions();

    const catByName  = Object.fromEntries(cats.map(c => [c.name, c.id]));
    const defExp = cats.find(c => c.type === 'expense' && c.name === 'その他')?.id ?? '';
    const defInc = cats.find(c => c.type === 'income'  && c.name === 'その他')?.id ?? '';

    const newTxs: Transaction[] = preview.map(r => ({
      id:       crypto.randomUUID(),
      date:     r.date,
      amount:   r.amount,
      type:     r.type,
      category: catByName[r.category] ?? (r.type === 'income' ? defInc : defExp),
      memo:     r.memo,
    }));

    const key = (t: { date: string; amount: number; type: string; memo: string }) =>
      `${t.date}|${t.amount}|${t.type}|${t.memo}`;
    const existingKeys = new Set(existing.map(key));
    const toAdd = newTxs.filter(t => !existingKeys.has(key(t)));

    saveTransactions([...toAdd, ...existing]);
    setDone(true);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleCancel() {
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-600 mb-1">CSVインポート</h2>
      <p className="text-xs text-gray-400 mb-3">マネーフォワード・楽天銀行・SBI・三菱UFJ・ゆうちょ・家計簿エクスポートに対応</p>

      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile}
        className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100" />

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      {done  && <p className="mt-2 text-xs text-green-600 font-medium">インポートが完了しました</p>}

      {preview && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">{preview.length}件が見つかりました（プレビュー最大5件）</p>
          <div className="border border-gray-100 rounded-lg overflow-hidden mb-3">
            {preview.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center px-3 py-2 text-xs border-b border-gray-50 last:border-0">
                <span className="text-gray-400 w-24 shrink-0">{r.date}</span>
                <span className={`w-8 shrink-0 font-medium ${r.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                  {r.type === 'income' ? '収入' : '支出'}
                </span>
                <span className="flex-1 text-gray-600 truncate">{r.memo || '—'}</span>
                <span className="text-gray-700 font-medium shrink-0">¥{r.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCancel}
              className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200">
              キャンセル
            </button>
            <button onClick={handleImport}
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600">
              インポート
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
