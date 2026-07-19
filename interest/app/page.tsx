'use client';
import { useEffect, useRef, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import SavingsSimulator from './components/SavingsSimulator';
import AiExplain from './components/AiExplain';
import { SavingsSeed } from './lib/calc';
import { kakeiboAssetTotal } from './lib/kakeibo';
import CloudSync from './components/CloudSync';

type Mode = 'compound' | 'savings';

interface Item {
  id:              string;
  label:           string;
  principal:       number;
  rate:            number;
  monthly:         number;
  savingsEndYear?: number; // 積立終了年（未設定=全期間）
  taxable?:        boolean; // true=特定口座(運用益に課税) / 未設定・false=NISA(非課税)
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const STORAGE_KEY = 'interest_calc_v1';
const SETTINGS_KEY = 'interest_settings_v1';
// バックアップ対象（複利比較・設定・積み立てシミュレーターの全状態）
const BACKUP_KEYS = ['interest_calc_v1', 'interest_settings_v1', 'interest_savings_v1'];

// クラウド同期用（BACKUP_KEYS をまとめて文字列化 / 復元）
function cloudSerialize(): string {
  const data: Record<string, unknown> = { app: 'shisan-sim', version: 1, exportedAt: new Date().toISOString() };
  for (const k of BACKUP_KEYS) {
    const v = localStorage.getItem(k);
    if (v != null) { try { data[k] = JSON.parse(v); } catch {} }
  }
  return JSON.stringify(data);
}
function cloudApply(json: string): boolean {
  try {
    const d = JSON.parse(json) as Record<string, unknown>;
    if (!BACKUP_KEYS.some(k => d[k] !== undefined)) return false;
    for (const k of BACKUP_KEYS) if (d[k] !== undefined) localStorage.setItem(k, JSON.stringify(d[k]));
    return true;
  } catch { return false; }
}
const TAX_RATE = 0.20315; // 特定口座の譲渡益課税（所得税・復興特別所得税・住民税の合計）
const NISA_LIFETIME = 18_000_000; // NISA生涯非課税枠（簡易反映：超過拠出分の利益は課税扱い）

// ── 計算ロジック ─────────────────────────────────────────────────
function fvCalc(
  principal: number, rate: number, monthly: number, years: number,
  savingsEndYear?: number,
): number {
  const mr   = rate / 100 / 12;
  const endY = (savingsEndYear && savingsEndYear > 0 && savingsEndYear < years)
    ? savingsEndYear : years;
  const n1   = endY * 12;
  const fv1  = mr === 0
    ? principal + monthly * n1
    : principal * Math.pow(1 + mr, n1) + monthly * (Math.pow(1 + mr, n1) - 1) / mr;
  if (endY === years) return fv1;
  // 積立終了後は複利のみ
  return mr === 0 ? fv1 : fv1 * Math.pow(1 + mr, (years - endY) * 12);
}

function calcInvested(principal: number, monthly: number, years: number, savingsEndYear?: number): number {
  const endY = (savingsEndYear && savingsEndYear > 0 && savingsEndYear < years)
    ? savingsEndYear : years;
  return principal + monthly * 12 * endY;
}

function calcRequiredPrincipal(target: number, rate: number, monthly: number, years: number): number {
  const mr = rate / 100 / 12;
  const n  = years * 12;
  if (mr === 0) return target - monthly * n;
  return (target - monthly * (Math.pow(1 + mr, n) - 1) / mr) / Math.pow(1 + mr, n);
}

function calcRequiredMonthly(target: number, principal: number, rate: number, years: number): number {
  const mr = rate / 100 / 12;
  const n  = years * 12;
  if (mr === 0) return Math.max(0, (target - principal) / n);
  return Math.max(0, (target - principal * Math.pow(1 + mr, n)) * mr / (Math.pow(1 + mr, n) - 1));
}

// -1 = 100年以内に到達不可、0 = すでに達成、正 = 必要年数
function calcRequiredYears(target: number, principal: number, rate: number, monthly: number): number {
  if (principal >= target) return 0;
  for (let y = 1; y <= 100; y++) {
    if (fvCalc(principal, rate, monthly, y) >= target) return y;
  }
  return -1;
}

// ── フォーマット ─────────────────────────────────────────────────
function fmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}億`;
  if (abs >= 10_000) {
    // trunc で万の桁を切り捨て → 1億境界での繰り上がりバグを防ぎつつ、負数でも対称に扱う
    const man = Math.trunc(n / 10_000 * 10) / 10;
    return `${man.toFixed(1)}万`;
  }
  return Math.round(n).toLocaleString();
}
function fmtFull(n: number): string {
  return `¥${Math.round(n).toLocaleString()}`;
}

// ── ストレージ ───────────────────────────────────────────────────
function loadData(): { items: Item[]; years: number } {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const data = JSON.parse(s);
      data.items = data.items.map((i: Item) => ({ ...i, monthly: i.monthly ?? 0 }));
      return data;
    }
  } catch {}
  return { items: [], years: 20 };
}
function saveData(items: Item[], years: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, years }));
}

function loadSettings(): { inflation: number; mode: Mode } {
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    if (s) {
      const d = JSON.parse(s);
      return {
        inflation: typeof d.inflation === 'number' ? d.inflation : 2,
        mode: d.mode === 'savings' ? 'savings' : 'compound',
      };
    }
  } catch {}
  return { inflation: 2, mode: 'compound' };
}
function saveSettings(inflation: number, mode: Mode) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ inflation, mode }));
}

// ── コンポーネント ───────────────────────────────────────────────
export default function Home() {
  const [mode,             setMode]             = useState<Mode>('compound');
  const [savingsSeed,      setSavingsSeed]      = useState<SavingsSeed | null>(null);
  const [seedKey,          setSeedKey]          = useState(0);
  const [items,            setItems]            = useState<Item[]>([]);
  const [years,            setYears]            = useState(20);
  // 追加フォーム
  const [label,            setLabel]            = useState('');
  const [principal,        setPrincipal]        = useState('');
  const [rate,             setRate]             = useState('');
  const [monthly,          setMonthly]          = useState('');
  const [savingsEnd,       setSavingsEnd]       = useState('');
  const [taxableNew,       setTaxableNew]        = useState(false); // 追加時の税区分（true=特定口座）
  // 編集
  const [editId,           setEditId]           = useState<string | null>(null);
  const [editLabel,        setEditLabel]        = useState('');
  const [editPrincipal,    setEditPrincipal]    = useState('');
  const [editRate,         setEditRate]         = useState('');
  const [editMonthly,      setEditMonthly]      = useState('');
  const [editSavingsEnd,   setEditSavingsEnd]   = useState('');
  const [editTaxable,      setEditTaxable]      = useState(false);
  // 表示切り替え
  const [showTable,        setShowTable]        = useState(false);
  // 詳細分析の設定（インフレ率）
  const [inflation,        setInflation]        = useState('2');
  // 逆算（モード別に入力を分離）
  const [revTarget,        setRevTarget]        = useState('');
  const [revRate,          setRevRate]          = useState('');
  const [revMonthly,       setRevMonthly]       = useState('');       // principal/years モード用
  const [revInitPrincipal, setRevInitPrincipal] = useState('');       // monthly/years モード用
  const [revMode,          setRevMode]          = useState<'principal' | 'monthly' | 'years'>('principal');
  // 家計簿の総資産（連携用）
  const [kakeiboAsset,     setKakeiboAsset]     = useState<number | null>(null);
  const [showCloud,        setShowCloud]        = useState(false);

  // localStorage はマウント後にのみ読めるため、ここでの同期的な setState は意図的。
  // lazy初期化に変えると SSR とハイドレーションが食い違うため effect で初期化する。
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const d = loadData();
    setItems(d.items);
    setYears(d.years);
    const s = loadSettings();
    setInflation(String(s.inflation));
    setMode(s.mode);
    setKakeiboAsset(kakeiboAssetTotal());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function changeInflation(v: string)  { setInflation(v); saveSettings(parseFloat(v) || 0, mode); }
  function changeMode(m: Mode)         { setMode(m);      saveSettings(parseFloat(inflation) || 0, m); }

  // ── バックアップ（JSONエクスポート/インポート） ───────────────
  const fileRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const data: Record<string, unknown> = {
      app: 'shisan-sim', version: 1, exportedAt: new Date().toISOString(),
    };
    for (const k of BACKUP_KEYS) {
      const v = localStorage.getItem(k);
      if (v != null) { try { data[k] = JSON.parse(v); } catch { /* skip 不正値 */ } }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const ymd  = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `資産形成_backup_${ymd}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const d = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
        if (!BACKUP_KEYS.some(k => d[k] !== undefined)) {
          alert('このファイルは取り込めませんでした。');
        } else if (confirm('現在のデータをバックアップ内容で上書きします。よろしいですか？')) {
          for (const k of BACKUP_KEYS) {
            if (d[k] !== undefined) localStorage.setItem(k, JSON.stringify(d[k]));
          }
          location.reload();
        }
      } catch {
        alert('JSONの読み込みに失敗しました。');
      }
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsText(file);
  }

  // ── モード間連携 ─────────────────────────────────────────────
  // 複利比較の項目 → 積み立てシミュレーターで詳細試算
  function detailInSavings(item: Item) {
    setSavingsSeed({
      monthly:  Math.max(0, Math.round(item.monthly)),
      rate:     Math.min(15, Math.max(0.1, item.rate)),
      initial:  Math.max(0, Math.round(item.principal)),
      nisaType: item.taxable ? 'none' : 'tsumitate', // 口座区分を引き継ぐ
    });
    setSeedKey(k => k + 1); // 種が変わるたび SavingsSimulator を作り直す
    changeMode('savings');
  }

  // 積み立ての条件 → 複利比較に項目として追加（NISA可否も引き継ぐ）
  function addPlanToCompare(plan: { label: string; principal: number; rate: number; monthly: number; taxable: boolean }) {
    const newItem: Item = {
      id:        crypto.randomUUID(),
      label:     plan.label || `積み立てプラン${items.length + 1}`,
      principal: Math.max(0, Math.round(plan.principal)),
      rate:      plan.rate,
      monthly:   Math.max(0, Math.round(plan.monthly)),
      taxable:   plan.taxable || undefined,
    };
    const next = [...items, newItem];
    setItems(next); saveData(next, years);
    changeMode('compound');
  }

  // ── 項目操作 ─────────────────────────────────────────────────
  function addItem() {
    const p  = parseFloat(principal.replace(/,/g, ''));
    const r  = parseFloat(rate);
    const m  = parseFloat(monthly || '0');
    const se = parseInt(savingsEnd || '0');
    const pv = isNaN(p) ? 0 : Math.max(0, p);
    const mv = isNaN(m) ? 0 : Math.max(0, m);
    // 元本か月積立のどちらかが1以上あればOK（積立のみの項目も許可）
    if ((pv < 1 && mv < 1) || isNaN(r) || r < 0) return;
    const newItem: Item = {
      id:        crypto.randomUUID(),
      label:     label.trim() || `項目${items.length + 1}`,
      principal: pv, rate: r,
      monthly:   mv,
      savingsEndYear: (se > 0 && !isNaN(se) && se < years) ? se : undefined,
      taxable:   taxableNew || undefined,
    };
    const next = [...items, newItem];
    setItems(next); saveData(next, years);
    setLabel(''); setPrincipal(''); setRate(''); setMonthly(''); setSavingsEnd(''); setTaxableNew(false);
  }

  function deleteItem(id: string) {
    const next = items.filter(i => i.id !== id);
    setItems(next); saveData(next, years);
  }

  function duplicateItem(item: Item) {
    const idx  = items.findIndex(i => i.id === item.id);
    const copy = { ...item, id: crypto.randomUUID(), label: `${item.label}（コピー）` };
    const next = [...items];
    next.splice(idx + 1, 0, copy);
    setItems(next); saveData(next, years);
  }

  function openEdit(item: Item) {
    setEditId(item.id);
    setEditLabel(item.label);
    setEditPrincipal(String(item.principal));
    setEditRate(String(item.rate));
    setEditMonthly(item.monthly > 0 ? String(item.monthly) : '');
    setEditSavingsEnd(item.savingsEndYear ? String(item.savingsEndYear) : '');
    setEditTaxable(!!item.taxable);
  }

  function saveEdit(id: string) {
    const p  = parseFloat(editPrincipal.replace(/,/g, ''));
    const r  = parseFloat(editRate);
    const m  = parseFloat(editMonthly || '0');
    const se = parseInt(editSavingsEnd || '0');
    const pv = isNaN(p) ? 0 : Math.max(0, p);
    const mv = isNaN(m) ? 0 : Math.max(0, m);
    if ((pv < 1 && mv < 1) || isNaN(r) || r < 0) return;
    const next = items.map(i => i.id !== id ? i : {
      ...i,
      label:         editLabel.trim() || i.label,
      principal:     pv, rate: r,
      monthly:       mv,
      savingsEndYear: (se > 0 && !isNaN(se) && se < years) ? se : undefined,
      taxable:       editTaxable || undefined,
    });
    setItems(next); saveData(next, years); setEditId(null);
  }

  function moveItem(id: string, dir: -1 | 1) {
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return;
    const next   = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next); saveData(next, years);
  }

  function changeYears(y: number) {
    setYears(y); saveData(items, y);
  }

  // ── CSV エクスポート ──────────────────────────────────────────
  function exportCSV() {
    const headers = ['年', ...items.map(i => i.label), ...(items.length > 1 ? ['合計'] : []), '投資総額'];
    const rows = chartData
      .filter(row => row.year > 0)
      .map(row => [
        `${row.year}年後`,
        ...items.map(item => row[item.id] ?? 0),
        ...(items.length > 1 ? [row['__total__'] ?? 0] : []),
        row['__invested__'] ?? 0,
      ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = '複利計算.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ── 集計 ──────────────────────────────────────────────────────
  const totalPrincipal = items.reduce((s, i) => s + i.principal, 0);
  const totalFv        = items.reduce((s, i) => s + fvCalc(i.principal, i.rate, i.monthly, years, i.savingsEndYear), 0);
  const totalInvested  = items.reduce((s, i) => s + calcInvested(i.principal, i.monthly, years, i.savingsEndYear), 0);
  const totalGain      = totalFv - totalInvested;
  const totalPct       = totalInvested > 0 ? (totalFv / totalInvested - 1) * 100 : 0;

  // ── 詳細分析（税引き後・インフレ調整・内訳） ─────────────────
  const inflNum     = Math.max(0, parseFloat(inflation) || 0);
  // 項目ごとに税区分（特定口座=課税 / NISA=非課税）で運用益の税額を算出。
  // NISA項目は生涯枠1,800万円を超える拠出分の利益のみ課税（簡易：拠出額の比で按分）。
  const taxAmount   = items.reduce((s, i) => {
    const invested = calcInvested(i.principal, i.monthly, years, i.savingsEndYear);
    const gain = fvCalc(i.principal, i.rate, i.monthly, years, i.savingsEndYear) - invested;
    if (gain <= 0) return s;
    if (i.taxable) return s + gain * TAX_RATE;
    const overflow = Math.max(0, invested - NISA_LIFETIME);
    const ratio = invested > 0 ? overflow / invested : 0;
    return s + gain * ratio * TAX_RATE;
  }, 0);
  const taxableCount = items.filter(i => i.taxable).length;
  const nisaOverflow = items.some(i => !i.taxable &&
    calcInvested(i.principal, i.monthly, years, i.savingsEndYear) > NISA_LIFETIME);
  const afterTaxFv  = totalFv - taxAmount;
  const realFv      = afterTaxFv / Math.pow(1 + inflNum / 100, years);
  // 内訳：元本 / 積立元本 / 運用益（税引き後）
  const principalPart = totalPrincipal;
  const contribPart   = totalInvested - totalPrincipal;
  const gainPart      = afterTaxFv - totalInvested;
  const breakdownBase = afterTaxFv > 0 ? afterTaxFv : 1;
  const pPct = (principalPart / breakdownBase) * 100;
  const cPct = (contribPart   / breakdownBase) * 100;
  const gPct = Math.max(0, (gainPart / breakdownBase) * 100);

  // ── グラフデータ ───────────────────────────────────────────────
  const chartData = Array.from({ length: years + 1 }, (_, y) => {
    const point: Record<string, number> = { year: y };
    items.forEach(item => {
      point[item.id] = Math.round(fvCalc(item.principal, item.rate, item.monthly, y, item.savingsEndYear));
    });
    if (items.length > 1) {
      point['__total__'] = Math.round(
        items.reduce((s, i) => s + fvCalc(i.principal, i.rate, i.monthly, y, i.savingsEndYear), 0)
      );
    }
    point['__invested__'] = Math.round(
      items.reduce((s, i) => s + calcInvested(i.principal, i.monthly, y, i.savingsEndYear), 0)
    );
    return point;
  });

  // ── 逆算 ──────────────────────────────────────────────────────
  const revTargetNum  = parseFloat(revTarget.replace(/,/g, ''));
  const revRateNum    = parseFloat(revRate);
  const revMonthlyNum = parseFloat(revMonthly.replace(/,/g, '')) || 0;
  const revInitNum    = parseFloat(revInitPrincipal.replace(/,/g, '')) || 0;

  const revResult = (() => {
    if (isNaN(revTargetNum) || revTargetNum <= 0 || isNaN(revRateNum) || revRateNum < 0) return null;
    if (revMode === 'principal') {
      return calcRequiredPrincipal(revTargetNum, revRateNum, revMonthlyNum, years);
    } else if (revMode === 'monthly') {
      if (revInitNum < 0) return null;
      return calcRequiredMonthly(revTargetNum, revInitNum, revRateNum, years);
    } else {
      if (revInitNum < 0) return null;
      return calcRequiredYears(revTargetNum, revInitNum, revRateNum, revMonthlyNum);
    }
  })();

  const addPNum = parseFloat(principal.replace(/,/g, ''));
  const addMNum = parseFloat(monthly.replace(/,/g, ''));
  const canAdd = rate.trim() !== '' && !isNaN(parseFloat(rate)) && parseFloat(rate) >= 0
    && ((!isNaN(addPNum) && addPNum >= 1) || (!isNaN(addMNum) && addMNum >= 1));

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-base font-bold text-gray-800">資産形成シミュレーター</h1>
          <p className="text-xs text-gray-400">
            {mode === 'compound' ? '複利計算・複数シナリオの比較' : '積み立て・NISA・取り崩しシミュレーション'}
          </p>
        </div>
        <div className="max-w-lg mx-auto flex border-t border-gray-100">
          {([['compound', '複利計算・比較'], ['savings', '積み立て・NISA・取り崩し']] as [Mode, string][]).map(([m, lbl]) => (
            <button key={m} onClick={() => { setSavingsSeed(null); changeMode(m); }}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${mode === m ? 'text-blue-500' : 'text-gray-400'}`}>
              {lbl}
              {mode === m && <span className="absolute bottom-0 inset-x-4 h-0.5 bg-blue-500 rounded-full" />}
            </button>
          ))}
        </div>
      </header>

      {mode === 'savings' && (
        <SavingsSimulator
          key={seedKey}
          seed={savingsSeed ?? undefined}
          years={years}
          onYearsChange={changeYears}
          onAddToCompare={addPlanToCompare}
        />
      )}

      {mode === 'compound' && (
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* 運用期間 */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">運用期間</span>
            <div className="flex items-center gap-1.5">
              <input type="number" min={1} max={50} value={years}
                onChange={e => changeYears(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-14 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <span className="text-sm text-gray-500 font-medium">年後</span>
            </div>
          </div>
          <input type="range" min={1} max={50} value={years}
            onChange={e => changeYears(parseInt(e.target.value))}
            className="w-full accent-blue-500 h-1.5"
          />
          <div className="flex justify-between text-[10px] text-gray-300 mt-1.5 px-0.5">
            <span>1</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50年</span>
          </div>
        </section>

        {/* 項目リスト */}
        {items.map((item, idx) => {
          const isEditing    = editId === item.id;
          const future       = fvCalc(item.principal, item.rate, item.monthly, years, item.savingsEndYear);
          const invested     = calcInvested(item.principal, item.monthly, years, item.savingsEndYear);
          const gain         = future - invested;
          const pct          = invested > 0 ? (future / invested - 1) * 100 : 0;
          const editMonthlyN = parseFloat(editMonthly || '0');
          const editPNum     = parseFloat(editPrincipal.replace(/,/g, ''));
          const editMNum     = parseFloat(editMonthly.replace(/,/g, ''));
          const canSave      = editRate.trim() !== '' && !isNaN(parseFloat(editRate)) && parseFloat(editRate) >= 0
            && ((!isNaN(editPNum) && editPNum >= 1) || (!isNaN(editMNum) && editMNum >= 1));

          return (
            <div key={item.id} className="bg-white rounded-xl shadow-sm p-4">
              {/* ヘッダー行 */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  {isEditing ? (
                    <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                      placeholder={item.label}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-full" />
                  ) : (
                    <span className="text-sm font-semibold text-gray-800 truncate">{item.label}</span>
                  )}
                  {!isEditing && item.savingsEndYear && item.savingsEndYear < years && item.monthly > 0 && (
                    <span className="text-[10px] bg-amber-50 text-amber-600 rounded px-1.5 py-0.5 shrink-0 whitespace-nowrap">
                      積立{item.savingsEndYear}年まで
                    </span>
                  )}
                  {!isEditing && item.taxable && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 shrink-0 whitespace-nowrap">
                      特定口座
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {!isEditing && (
                    <>
                      <button onClick={() => moveItem(item.id, -1)} disabled={idx === 0}
                        className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-20 transition-colors text-xs leading-none">▲</button>
                      <button onClick={() => moveItem(item.id, 1)} disabled={idx === items.length - 1}
                        className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-20 transition-colors text-xs leading-none">▼</button>
                      {/* 複製ボタン */}
                      <button onClick={() => duplicateItem(item)} title="複製"
                        className="p-1.5 text-gray-300 hover:text-green-400 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button onClick={() => openEdit(item)}
                        className="p-1.5 text-gray-300 hover:text-blue-400 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {/* 積み立て（NISA・取り崩し）で詳細試算 */}
                      <button onClick={() => detailInSavings(item)} title="積み立て・NISA で詳細試算"
                        className="p-1.5 text-gray-300 hover:text-purple-500 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8m0 0h-5m5 0v5" />
                        </svg>
                      </button>
                    </>
                  )}
                  <button onClick={() => deleteItem(item.id)} disabled={editId !== null}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed">
                    ✕
                  </button>
                </div>
              </div>

              {/* 数値行 */}
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 mb-1">元本（円）</p>
                      <input type="number" min={0} value={editPrincipal}
                        onChange={e => setEditPrincipal(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div className="w-28">
                      <p className="text-[10px] text-gray-400 mb-1">年利（%）</p>
                      <input type="number" min={0} step="0.1" value={editRate}
                        onChange={e => setEditRate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1">月積立額（円）省略可</p>
                    <input type="number" min={0} placeholder="0" value={editMonthly}
                      onChange={e => setEditMonthly(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                  {editMonthlyN > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">積立終了年（省略=全期間）</p>
                      <input type="number" min={1} max={years - 1} placeholder={`${years}`} value={editSavingsEnd}
                        onChange={e => setEditSavingsEnd(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                      {editSavingsEnd !== '' && parseInt(editSavingsEnd) >= years && (
                        <p className="text-[10px] text-orange-500 mt-1">
                          運用期間（{years}年）以上の値は無効です。{years - 1}年以下で入力してください。
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1">口座区分（税引き後の計算に使用）</p>
                    <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
                      <button type="button" onClick={() => setEditTaxable(false)}
                        className={`flex-1 py-2 font-medium transition-colors ${!editTaxable ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}>
                        NISA（非課税）
                      </button>
                      <button type="button" onClick={() => setEditTaxable(true)}
                        className={`flex-1 py-2 font-medium transition-colors ${editTaxable ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}>
                        特定口座（課税）
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditId(null)}
                      className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200">
                      キャンセル
                    </button>
                    <button onClick={() => saveEdit(item.id)} disabled={!canSave}
                      className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-40">
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg py-2">
                      <p className="text-[10px] text-gray-400 mb-0.5">元本</p>
                      <p className="text-sm font-semibold text-gray-700">{fmt(item.principal)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-2">
                      <p className="text-[10px] text-gray-400 mb-0.5">月積立</p>
                      <p className="text-sm font-semibold text-gray-700">
                        {item.monthly > 0 ? fmt(item.monthly) : '—'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-2">
                      <p className="text-[10px] text-gray-400 mb-0.5">年利</p>
                      <p className="text-sm font-semibold text-gray-700">{item.rate}%</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg py-2">
                      <p className="text-[10px] text-blue-400 mb-0.5">{years}年後</p>
                      <p className="text-sm font-bold text-blue-600">{fmt(future)}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2.5 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-xs text-gray-400">増加額（投資総額比）</span>
                    <span className="text-xs font-semibold text-green-500">
                      +{fmt(gain)}（+{pct.toFixed(1)}%）
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* 追加フォーム */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">項目を追加</h2>
          <div className="space-y-2">
            <input placeholder="ラベル（例：現金・投資信託）省略可"
              value={label} onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canAdd && addItem()}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-gray-300" />
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 mb-1">元本（円）</p>
                <input type="number" placeholder="1000000" min={0} value={principal}
                  onChange={e => setPrincipal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canAdd && addItem()}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                {kakeiboAsset !== null && kakeiboAsset > 0 && (
                  <button type="button" onClick={() => setPrincipal(String(kakeiboAsset))}
                    className="mt-1 text-[11px] text-blue-500 hover:underline">
                    🏦 家計簿の総資産（{fmtFull(kakeiboAsset)}）を使う
                  </button>
                )}
              </div>
              <div className="w-28">
                <p className="text-[10px] text-gray-400 mb-1">年利（%）</p>
                <input type="number" placeholder="5.0" step="0.1" min={0} value={rate}
                  onChange={e => setRate(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canAdd && addItem()}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">月積立額（円）省略可</p>
              <input type="number" placeholder="30000" min={0} value={monthly}
                onChange={e => setMonthly(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            {parseFloat(monthly) > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 mb-1">積立終了年（省略=全期間）</p>
                <input type="number" placeholder={`${years}`} min={1} max={years - 1} value={savingsEnd}
                  onChange={e => setSavingsEnd(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                {savingsEnd !== '' && parseInt(savingsEnd) >= years && (
                  <p className="text-[10px] text-orange-500 mt-1">
                    運用期間（{years}年）以上の値は無効です。{years - 1}年以下で入力してください。
                  </p>
                )}
              </div>
            )}
            <div>
              <p className="text-[10px] text-gray-400 mb-1">口座区分（税引き後の計算に使用）</p>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
                <button type="button" onClick={() => setTaxableNew(false)}
                  className={`flex-1 py-2 font-medium transition-colors ${!taxableNew ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}>
                  NISA（非課税）
                </button>
                <button type="button" onClick={() => setTaxableNew(true)}
                  className={`flex-1 py-2 font-medium transition-colors ${taxableNew ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}>
                  特定口座（課税）
                </button>
              </div>
            </div>
            <button onClick={addItem} disabled={!canAdd}
              className="w-full py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors">
              追加
            </button>
          </div>
        </section>

        {/* 合計サマリー */}
        {items.length > 0 && (
          <section className="bg-blue-500 rounded-xl shadow-sm p-4 text-white">
            <p className="text-xs text-blue-200 font-medium mb-3">合計（{years}年後）</p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-blue-200 mb-0.5">投資総額</p>
                <p className="text-lg font-bold">{fmtFull(totalInvested)}</p>
                {totalInvested > totalPrincipal && (
                  <p className="text-[10px] text-blue-300">
                    元本 {fmtFull(totalPrincipal)} + 積立 {fmtFull(totalInvested - totalPrincipal)}
                  </p>
                )}
              </div>
              <span className="text-blue-300 text-2xl">→</span>
              <div className="text-right">
                <p className="text-[11px] text-blue-200 mb-0.5">{years}年後</p>
                <p className="text-2xl font-bold">{fmtFull(totalFv)}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-400 flex justify-between text-sm">
              <span className="text-blue-200">増加額</span>
              <span className="font-bold">+{fmtFull(totalGain)}（+{totalPct.toFixed(1)}%）</span>
            </div>
          </section>
        )}

        {/* 詳細分析 */}
        {items.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">詳細分析</h2>

            {/* 内訳の積み上げ */}
            <div>
              <p className="text-xs text-gray-400 mb-2">
                {years}年後の内訳{taxAmount > 0 ? '（税引き後）' : ''}
              </p>
              <div className="flex h-5 rounded-full overflow-hidden bg-gray-100">
                <div style={{ width: `${pPct}%`, backgroundColor: '#9ca3af' }} />
                <div style={{ width: `${cPct}%`, backgroundColor: '#93c5fd' }} />
                <div style={{ width: `${gPct}%`, backgroundColor: '#4ade80' }} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                  <span className="text-gray-500">元本</span>
                  <span className="font-semibold text-gray-700">{fmtFull(principalPart)}</span>
                </span>
                {contribPart > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-300" />
                    <span className="text-gray-500">積立</span>
                    <span className="font-semibold text-gray-700">{fmtFull(contribPart)}</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="text-gray-500">運用益{taxAmount > 0 ? '(税引後)' : ''}</span>
                  <span className="font-semibold text-green-600">{fmtFull(gainPart)}</span>
                </span>
              </div>
            </div>

            {/* 税引き後リターン（項目ごとの口座区分で計算） */}
            <div className="border-t border-gray-50 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600">税引き後リターン</p>
                <span className="text-[11px] text-gray-400">
                  特定口座 {taxableCount}件 / NISA {items.length - taxableCount}件
                </span>
              </div>
              {taxAmount > 0 ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">税額（特定口座の運用益 × 20.315%）</span>
                    <span className="font-semibold text-red-400">−{fmtFull(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">手取り（{years}年後）</span>
                    <span className="font-bold text-gray-800">{fmtFull(afterTaxFv)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  全項目が NISA（非課税）として計算しています。各項目の編集で「特定口座（課税）」に切り替えられます。
                </p>
              )}
              {nisaOverflow && (
                <p className="text-[10px] text-orange-500 mt-1.5">
                  ※ NISA生涯枠（1,800万円）を超える拠出分の利益は課税として簡易計算しています（年間枠は未考慮）。
                </p>
              )}
            </div>

            {/* インフレ調整 */}
            <div className="border-t border-gray-50 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600">インフレ調整後の実質価値</p>
                <div className="flex items-center gap-1">
                  <input type="number" min={0} step="0.1" value={inflation}
                    onChange={e => changeInflation(e.target.value)}
                    className="w-14 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  <span className="text-xs text-gray-500">%/年</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{taxAmount > 0 ? '手取りの' : ''}実質価値（現在価値）</span>
                <span className="font-bold text-gray-800">{fmtFull(realFv)}</span>
              </div>
              <p className="text-[10px] text-gray-300 mt-1">
                年{inflNum}%のインフレで{years}年後の購買力を現在価値に換算
              </p>
            </div>
          </section>
        )}

        {/* AIによる結果の解説 */}
        {items.length > 0 && (
          <AiExplain payload={{
            years,
            inflation: inflNum,
            items: items.map(i => ({
              label: i.label, principal: i.principal, monthly: i.monthly,
              rate: i.rate, taxable: !!i.taxable, savingsEndYear: i.savingsEndYear,
            })),
            totalPrincipal, totalInvested, totalFv, totalGain, totalPct,
            taxAmount, afterTaxFv, realFv,
          }} />
        )}

        {/* 推移グラフ */}
        {items.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">推移グラフ</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="year" tickFormatter={y => `${y}年`}
                  tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10, fill: '#9ca3af' }}
                  width={48} domain={['auto', 'auto']} />
                <Tooltip
                  formatter={(value: unknown, key: unknown) => {
                    const n = typeof value === 'number' ? value : 0;
                    const k = typeof key === 'string' ? key : '';
                    if (k === '__invested__') return [fmtFull(n), '投資総額'];
                    if (k === '__total__')    return [fmtFull(n), '合計'];
                    const item = items.find(i => i.id === k);
                    return [fmtFull(n), item ? item.label : k];
                  }}
                  labelFormatter={(y: unknown) => `${y}年後`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                {/* 投資総額ライン（最背面） */}
                <Line type="monotone" dataKey="__invested__" stroke="#d1d5db"
                  strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="投資総額" />
                {items.map((item, idx) => (
                  <Line key={item.id} type="monotone" dataKey={item.id}
                    stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={false} name={item.label} />
                ))}
                {items.length > 1 && (
                  <Line type="monotone" dataKey="__total__" stroke="#374151"
                    strokeWidth={2.5} strokeDasharray="5 3" dot={false} name="合計" />
                )}
              </LineChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-4 shrink-0" style={{ height: 0, borderTop: '1.5px dashed #d1d5db' }} />
                <span className="text-[11px] text-gray-400">投資総額</span>
              </div>
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-[11px] text-gray-500">{item.label}</span>
                </div>
              ))}
              {items.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded bg-gray-700" />
                  <span className="text-[11px] text-gray-500">合計</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 年ごとの表 */}
        {items.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">年ごとの表</h2>
              <div className="flex items-center gap-3">
                {showTable && (
                  <button onClick={exportCSV}
                    className="text-xs text-green-500 hover:underline font-medium">
                    CSVダウンロード
                  </button>
                )}
                <button onClick={() => setShowTable(v => !v)}
                  className="text-xs text-blue-500 hover:underline">
                  {showTable ? '閉じる ▲' : '表示する ▼'}
                </button>
              </div>
            </div>
            {showTable && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-2 pr-3 text-left text-gray-400 font-medium whitespace-nowrap">年</th>
                      {items.map((item, idx) => (
                        <th key={item.id} className="py-2 px-2 text-right font-medium whitespace-nowrap"
                          style={{ color: COLORS[idx % COLORS.length] }}>
                          {item.label}
                        </th>
                      ))}
                      {items.length > 1 && (
                        <th className="py-2 px-2 text-right text-gray-700 font-bold whitespace-nowrap">合計</th>
                      )}
                      <th className="py-2 pl-2 text-right text-gray-400 font-medium whitespace-nowrap">投資総額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.filter(row => row.year > 0).map(row => (
                      <tr key={row.year} className={`border-b border-gray-50 ${row.year === years ? 'bg-blue-50 font-bold' : ''}`}>
                        <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">{row.year}年後</td>
                        {items.map(item => (
                          <td key={item.id} className="py-1.5 px-2 text-right text-gray-700 whitespace-nowrap">
                            {fmtFull(row[item.id] as number)}
                          </td>
                        ))}
                        {items.length > 1 && (
                          <td className="py-1.5 px-2 text-right text-gray-800 font-bold whitespace-nowrap">
                            {fmtFull(row['__total__'] as number)}
                          </td>
                        )}
                        <td className="py-1.5 pl-2 text-right text-gray-400 whitespace-nowrap">
                          {fmtFull(row['__invested__'] as number)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* 目標金額から逆算 */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">目標金額から逆算</h2>
          <p className="text-xs text-gray-400 mb-3">
            {revMode !== 'years' && <>運用期間 <span className="text-blue-500 font-medium">{years}年</span> を使用</>}
            {revMode === 'years' && '元本・積立・年利から達成年数を計算'}
          </p>

          {/* モード切り替え */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-3 text-xs">
            <button onClick={() => setRevMode('principal')}
              className={`flex-1 py-2 font-medium transition-colors ${revMode === 'principal' ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}>
              必要な元本
            </button>
            <button onClick={() => setRevMode('monthly')}
              className={`flex-1 py-2 font-medium transition-colors ${revMode === 'monthly' ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}>
              必要な月積立
            </button>
            <button onClick={() => setRevMode('years')}
              className={`flex-1 py-2 font-medium transition-colors ${revMode === 'years' ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'}`}>
              達成年数
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-gray-400 mb-1">目標金額（円）</p>
              <input type="number" placeholder="10000000" min={0} value={revTarget}
                onChange={e => setRevTarget(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 mb-1">想定年利（%）</p>
                <input type="number" placeholder="5.0" step="0.1" min={0} value={revRate}
                  onChange={e => setRevRate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              {revMode === 'principal' && (
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 mb-1">月積立額（円）省略可</p>
                  <input type="number" placeholder="0" min={0} value={revMonthly}
                    onChange={e => setRevMonthly(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              )}
              {revMode === 'monthly' && (
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 mb-1">初期元本（円）省略可</p>
                  <input type="number" placeholder="0" min={0} value={revInitPrincipal}
                    onChange={e => setRevInitPrincipal(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              )}
            </div>
            {revMode === 'years' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 mb-1">初期元本（円）省略可</p>
                  <input type="number" placeholder="0" min={0} value={revInitPrincipal}
                    onChange={e => setRevInitPrincipal(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 mb-1">月積立額（円）省略可</p>
                  <input type="number" placeholder="0" min={0} value={revMonthly}
                    onChange={e => setRevMonthly(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
            )}
          </div>

          {/* 逆算結果 */}
          {revMode !== 'years' && revResult !== null && revResult >= 0 && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-green-600 mb-1">
                {revMode === 'principal' ? '必要な初期元本' : '必要な月積立額'}
              </p>
              <p className="text-2xl font-bold text-green-700">{fmtFull(revResult)}</p>
              {revMode === 'monthly' && revResult > 0 && (
                <p className="text-xs text-green-500 mt-1">年間 {fmtFull(revResult * 12)}</p>
              )}
              {revMode === 'monthly' && revResult === 0 && (
                <p className="text-xs text-green-500 mt-1">初期元本だけで目標を達成できます（月積立不要）</p>
              )}
            </div>
          )}
          {revMode === 'principal' && revResult !== null && revResult < 0 && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-xs text-green-700">
                月積立だけで目標を達成できます（初期元本は不要です）
              </p>
            </div>
          )}
          {revMode === 'years' && revResult !== null && revResult === 0 && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-green-600">初期元本がすでに目標を達成しています。</p>
            </div>
          )}
          {revMode === 'years' && revResult !== null && revResult > 0 && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-green-600 mb-1">目標達成までの期間</p>
              <p className="text-2xl font-bold text-green-700">{revResult}年後</p>
            </div>
          )}
          {revMode === 'years' && revResult !== null && revResult === -1 && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <p className="text-xs text-yellow-700">
                現在の設定では100年以内に目標に到達しません。元本・積立額を増やすか、目標金額を見直してください。
              </p>
            </div>
          )}
        </section>

        {/* バックアップ */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">バックアップ</h2>
          <p className="text-xs text-gray-400 mb-3">
            全データ（複利比較・積み立て・設定）をJSONで保存・復元できます。ドメイン移行や機種変更時の引き継ぎに。
          </p>
          <div className="flex gap-2">
            <button onClick={handleExport}
              className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
              エクスポート
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
              インポート
            </button>
          </div>
          <button onClick={() => setShowCloud(true)}
            className="w-full mt-2 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
            ☁️ クラウド同期
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
        </section>

        {/* 空状態 */}
        {items.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">📈</p>
            <p className="text-gray-400 text-sm">上のフォームから項目を追加してください</p>
            <p className="text-gray-300 text-xs mt-1">例：元本100万円・月積立3万円・年利5%・20年後</p>
          </div>
        )}
      </main>
      )}

      {showCloud && <CloudSync bucket="interest" serialize={cloudSerialize} apply={cloudApply} onClose={() => setShowCloud(false)} />}
    </div>
  );
}
