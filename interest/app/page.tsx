'use client';
import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

interface Item {
  id: string;
  label: string;
  principal: number;
  rate: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const STORAGE_KEY = 'interest_calc_v1';

function fv(principal: number, rate: number, years: number): number {
  return principal * Math.pow(1 + rate / 100, years);
}

function fmt(n: number): string {
  if (Math.abs(n) >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}億`;
  if (Math.abs(n) >= 10_000)      return `${(n / 10_000).toFixed(1)}万`;
  return Math.round(n).toLocaleString();
}

function fmtFull(n: number): string {
  return `¥${Math.round(n).toLocaleString()}`;
}

function loadData(): { items: Item[]; years: number } {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return { items: [], years: 20 };
}

function saveData(items: Item[], years: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, years }));
}

export default function Home() {
  const [items,     setItems]     = useState<Item[]>([]);
  const [years,     setYears]     = useState(20);
  const [label,     setLabel]     = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate,      setRate]      = useState('');
  const [editId,    setEditId]    = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPrincipal, setEditPrincipal] = useState('');
  const [editRate,  setEditRate]  = useState('');

  useEffect(() => {
    const d = loadData();
    setItems(d.items);
    setYears(d.years);
  }, []);

  function addItem() {
    const p = parseFloat(principal.replace(/,/g, ''));
    const r = parseFloat(rate);
    if (!p || isNaN(p) || p <= 0 || !r || isNaN(r)) return;
    const next = [...items, {
      id: crypto.randomUUID(),
      label: label.trim() || `項目${items.length + 1}`,
      principal: p,
      rate: r,
    }];
    setItems(next);
    saveData(next, years);
    setLabel(''); setPrincipal(''); setRate('');
  }

  function deleteItem(id: string) {
    const next = items.filter(i => i.id !== id);
    setItems(next);
    saveData(next, years);
  }

  function openEdit(item: Item) {
    setEditId(item.id);
    setEditLabel(item.label);
    setEditPrincipal(String(item.principal));
    setEditRate(String(item.rate));
  }

  function saveEdit(id: string) {
    const p = parseFloat(editPrincipal.replace(/,/g, ''));
    const r = parseFloat(editRate);
    if (!p || isNaN(p) || p <= 0 || !r || isNaN(r)) return;
    const next = items.map(i => i.id === id
      ? { ...i, label: editLabel.trim() || i.label, principal: p, rate: r }
      : i
    );
    setItems(next);
    saveData(next, years);
    setEditId(null);
  }

  function changeYears(y: number) {
    setYears(y);
    saveData(items, y);
  }

  const totalPrincipal = items.reduce((s, i) => s + i.principal, 0);
  const totalFv        = items.reduce((s, i) => s + fv(i.principal, i.rate, years), 0);
  const totalGain      = totalFv - totalPrincipal;
  const totalPct       = totalPrincipal > 0 ? (totalFv / totalPrincipal - 1) * 100 : 0;

  const chartData = Array.from({ length: years + 1 }, (_, y) => {
    const point: Record<string, number> = { year: y };
    items.forEach(item => {
      point[item.id] = Math.round(fv(item.principal, item.rate, y));
    });
    if (items.length > 1) {
      point['__total__'] = Math.round(items.reduce((s, i) => s + fv(i.principal, i.rate, y), 0));
    }
    return point;
  });

  const canAdd = principal.trim() !== '' && rate.trim() !== ''
    && !isNaN(parseFloat(principal)) && !isNaN(parseFloat(rate));

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-base font-bold text-gray-800">複利計算機</h1>
          <p className="text-xs text-gray-400">元本と年利を入力すると将来の金額がわかります</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* 運用期間 */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">運用期間</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number" min={1} max={50} value={years}
                onChange={e => changeYears(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-14 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <span className="text-sm text-gray-500 font-medium">年後</span>
            </div>
          </div>
          <input
            type="range" min={1} max={50} value={years}
            onChange={e => changeYears(parseInt(e.target.value))}
            className="w-full accent-blue-500 h-1.5"
          />
          <div className="flex justify-between text-[10px] text-gray-300 mt-1.5 px-0.5">
            <span>1</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50年</span>
          </div>
        </section>

        {/* 項目リスト */}
        {items.map((item, idx) => {
          const isEditing = editId === item.id;
          const future = fv(item.principal, item.rate, years);
          const gain   = future - item.principal;
          const pct    = (future / item.principal - 1) * 100;
          const canSave = editPrincipal.trim() !== '' && editRate.trim() !== ''
            && !isNaN(parseFloat(editPrincipal)) && !isNaN(parseFloat(editRate));
          return (
            <div key={item.id} className="bg-white rounded-xl shadow-sm p-4">
              {/* ヘッダー行 */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  {isEditing ? (
                    <input
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      placeholder={item.label}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-full"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-gray-800 truncate">{item.label}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!isEditing && (
                    <button onClick={() => openEdit(item)}
                      className="p-1.5 text-gray-300 hover:text-blue-400 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  <button onClick={() => deleteItem(item.id)}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors text-sm">
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
                      <input
                        type="number" min={0}
                        value={editPrincipal}
                        onChange={e => setEditPrincipal(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                    <div className="w-28">
                      <p className="text-[10px] text-gray-400 mb-1">年利（%）</p>
                      <input
                        type="number" min={0} step="0.1"
                        value={editRate}
                        onChange={e => setEditRate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
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
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg py-2">
                      <p className="text-[10px] text-gray-400 mb-0.5">元本</p>
                      <p className="text-sm font-semibold text-gray-700">{fmt(item.principal)}</p>
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
                    <span className="text-xs text-gray-400">増加額</span>
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
            <input
              placeholder="ラベル（例：現金・投資信託）省略可"
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canAdd && addItem()}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-gray-300"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 mb-1">元本（円）</p>
                <input
                  type="number" placeholder="1000000" min={0}
                  value={principal}
                  onChange={e => setPrincipal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canAdd && addItem()}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="w-28">
                <p className="text-[10px] text-gray-400 mb-1">年利（%）</p>
                <input
                  type="number" placeholder="5.0" step="0.1" min={0}
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canAdd && addItem()}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <button
              onClick={addItem}
              disabled={!canAdd}
              className="w-full py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
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
                <p className="text-[11px] text-blue-200 mb-0.5">元本合計</p>
                <p className="text-lg font-bold">{fmtFull(totalPrincipal)}</p>
              </div>
              <span className="text-blue-300 text-2xl">→</span>
              <div className="text-right">
                <p className="text-[11px] text-blue-200 mb-0.5">{years}年後</p>
                <p className="text-2xl font-bold">{fmtFull(totalFv)}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-400 flex justify-between text-sm">
              <span className="text-blue-200">増加額</span>
              <span className="font-bold">
                +{fmtFull(totalGain)}（+{totalPct.toFixed(1)}%）
              </span>
            </div>
          </section>
        )}

        {/* 推移グラフ */}
        {items.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">推移グラフ</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="year"
                  tickFormatter={y => `${y}年`}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                />
                <YAxis
                  tickFormatter={v => fmt(v)}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  width={48}
                />
                <Tooltip
                  formatter={(value: unknown, key: unknown) => {
                    const n = typeof value === 'number' ? value : 0;
                    const k = typeof key === 'string' ? key : '';
                    const item = items.find(i => i.id === k);
                    return [fmtFull(n), item ? item.label : '合計'];
                  }}
                  labelFormatter={(y: unknown) => `${y}年後`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                {items.map((item, idx) => (
                  <Line
                    key={item.id}
                    type="monotone"
                    dataKey={item.id}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    name={item.label}
                  />
                ))}
                {items.length > 1 && (
                  <Line
                    type="monotone"
                    dataKey="__total__"
                    stroke="#374151"
                    strokeWidth={2.5}
                    strokeDasharray="5 3"
                    dot={false}
                    name="合計"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
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

        {/* 空状態 */}
        {items.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">📈</p>
            <p className="text-gray-400 text-sm">上のフォームから項目を追加してください</p>
            <p className="text-gray-300 text-xs mt-1">例：元本100万円・年利5%・20年後</p>
          </div>
        )}
      </main>
    </div>
  );
}
