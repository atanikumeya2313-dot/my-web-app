'use client';
import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

// 実際の利率（損益率など、日々変わる%）を記録して推移をグラフ化する。
// 将来予測の複利計算とは別。localStorage キー: interest_returns_v1

interface Ret { date: string; pct: number; memo?: string }
const KEY = 'interest_returns_v1';

function load(): Ret[] {
  try { const s = localStorage.getItem(KEY); const a = s ? JSON.parse(s) : []; return Array.isArray(a) ? a : []; }
  catch { return []; }
}
function save(list: Ret[]) { localStorage.setItem(KEY, JSON.stringify(list)); }
function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const mdLabel = (d: string) => d.slice(5).replace('-', '/');
const pctStr = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;

export default function ReturnsTracker() {
  const [list, setList] = useState<Ret[]>([]);
  const [date, setDate] = useState(todayYMD());
  const [pct,  setPct]  = useState('');
  const [memo, setMemo] = useState('');

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setList(load()); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function persist(next: Ret[]) {
    const sorted = [...next].sort((a, b) => a.date.localeCompare(b.date));
    setList(sorted); save(sorted);
  }
  function add() {
    const p = parseFloat(pct);
    if (isNaN(p) || !date) return;
    // 同じ日付は上書き（1日1件）
    persist([...list.filter(r => r.date !== date), { date, pct: p, memo: memo.trim() || undefined }]);
    setPct(''); setMemo('');
  }
  function del(d: string) {
    if (!confirm('この記録を削除しますか？')) return;
    persist(list.filter(r => r.date !== d));
  }

  const vals    = list.map(r => r.pct);
  const latest  = list[list.length - 1];
  const prev    = list[list.length - 2];
  const diff    = latest && prev ? latest.pct - prev.pct : 0;
  const avg     = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const max     = vals.length ? Math.max(...vals) : 0;
  const min     = vals.length ? Math.min(...vals) : 0;
  const chart   = list.map(r => ({ ...r, label: mdLabel(r.date) }));

  return (
    <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
      {/* 入力 */}
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">利率を記録</h2>
        <p className="text-xs text-gray-400 mb-3">
          証券アプリなどに出る「損益率」や「利回り」を、その日の値としてメモしましょう。プラスもマイナスも入力できます。
        </p>
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-[10px] text-gray-400 mb-1">日付</p>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="w-32">
              <p className="text-[10px] text-gray-400 mb-1">利率（%）</p>
              <input type="number" step="0.01" inputMode="decimal" placeholder="+5.20" value={pct}
                onChange={e => setPct(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && add()}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
          <input placeholder="メモ（銘柄・出来事など）省略可" value={memo}
            onChange={e => setMemo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-gray-300" />
          <button onClick={add} disabled={pct.trim() === '' || isNaN(parseFloat(pct))}
            className="w-full py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors">
            記録する
          </button>
        </div>
      </section>

      {list.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📉</p>
          <p className="text-gray-400 text-sm">上のフォームから、その日の利率を記録しましょう</p>
          <p className="text-gray-300 text-xs mt-1">毎日つけると、変化がグラフで見えます</p>
        </div>
      ) : (
        <>
          {/* サマリー */}
          <section className="bg-blue-500 rounded-xl shadow-sm p-4 text-white">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] text-blue-200 mb-0.5">最新（{mdLabel(latest.date)}）</p>
                <p className="text-3xl font-bold">{pctStr(latest.pct)}</p>
              </div>
              {prev && (
                <div className="text-right">
                  <p className="text-[11px] text-blue-200 mb-0.5">前回比</p>
                  <p className={`text-lg font-bold ${diff >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                    {diff > 0 ? '+' : ''}{diff.toFixed(2)}pt
                  </p>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-blue-400 grid grid-cols-3 text-center">
              <div><p className="text-[10px] text-blue-200">平均</p><p className="text-sm font-bold">{pctStr(avg)}</p></div>
              <div><p className="text-[10px] text-blue-200">最高</p><p className="text-sm font-bold">{pctStr(max)}</p></div>
              <div><p className="text-[10px] text-blue-200">最低</p><p className="text-sm font-bold">{pctStr(min)}</p></div>
            </div>
          </section>

          {/* 推移グラフ */}
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">利率の推移（{list.length}件）</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} minTickGap={20} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#9ca3af' }}
                  width={44} domain={['auto', 'auto']} />
                <Tooltip
                  formatter={(value: unknown) => [pctStr(typeof value === 'number' ? value : 0), '利率']}
                  labelFormatter={(l: unknown) => String(l)}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1} />
                <Line type="monotone" dataKey="pct" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} name="利率" />
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* 一覧 */}
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">記録一覧</h2>
            <div className="divide-y divide-gray-50">
              {[...list].reverse().map(r => (
                <div key={r.date} className="flex items-center gap-3 py-2">
                  <span className="text-xs text-gray-500 w-16 shrink-0">{mdLabel(r.date)}</span>
                  <span className={`text-sm font-bold w-20 text-right shrink-0 ${r.pct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {pctStr(r.pct)}
                  </span>
                  <span className="text-xs text-gray-400 flex-1 min-w-0 truncate">{r.memo ?? ''}</span>
                  <button onClick={() => del(r.date)}
                    className="text-gray-300 hover:text-red-400 text-sm shrink-0 w-6 h-6 flex items-center justify-center">✕</button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
