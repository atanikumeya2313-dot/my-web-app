'use client';
import { useState, useMemo } from 'react';
import { simulate, fmt, NisaType } from './lib/calc';
import TrendChart from './components/TrendChart';

const NISA_LABELS: Record<NisaType, string> = {
  none:      '使わない',
  tsumitate: 'つみたて枠（120万/年）',
  growth:    '成長投資枠（240万/年）',
};

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-semibold text-gray-800">
          {unit === '¥' ? `¥${value.toLocaleString()}` : `${value}${unit}`}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500" />
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>{unit === '¥' ? `¥${min.toLocaleString()}` : `${min}${unit}`}</span>
        <span>{unit === '¥' ? `¥${max.toLocaleString()}` : `${max}${unit}`}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [monthly,   setMonthly]   = useState(30_000);
  const [rate,      setRate]      = useState(5.0);
  const [years,     setYears]     = useState(20);
  const [initial,   setInitial]   = useState(0);
  const [nisaType,  setNisaType]  = useState<NisaType>('tsumitate');
  const [showTable, setShowTable] = useState(false);

  const results = useMemo(() =>
    simulate({ monthlyAmount: monthly, annualRate: rate, years, initialAmount: initial, nisaType }),
    [monthly, rate, years, initial, nisaType]
  );

  const last       = results[results.length - 1];
  const totalIn    = last.principal;
  const gains      = last.balance - totalIn;
  const nisaGains  = Math.max(0, last.nisaBalance - last.nisaPrincipal);
  const taxSaved   = Math.max(0, nisaGains * 0.20315);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-base font-bold text-gray-800">積み立てシミュレーター</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-8">

        {/* 入力パネル */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-5">
          <Slider label="毎月の積み立て額" value={monthly} min={1000} max={100_000} step={1000} unit="¥" onChange={setMonthly} />
          <Slider label="年利（想定リターン）" value={rate} min={0.1} max={15} step={0.1} unit="%" onChange={setRate} />
          <Slider label="積み立て期間" value={years} min={1} max={40} step={1} unit="年" onChange={setYears} />

          <div>
            <label className="text-sm text-gray-600 block mb-1">初期投資額</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
              <input type="number" value={initial} min={0} step={10000}
                onChange={e => setInitial(Math.max(0, Number(e.target.value)))}
                className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">NISA</p>
            <div className="space-y-1.5">
              {(Object.keys(NISA_LABELS) as NisaType[]).map(t => (
                <button key={t} onClick={() => setNisaType(t)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors
                    ${nisaType === t
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {NISA_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-500 text-white rounded-xl p-4 col-span-2">
            <p className="text-xs opacity-80 mb-1">税引後 最終残高</p>
            <p className="text-2xl font-bold">¥{fmt(Math.round(last.afterTaxBalance))}</p>
            <p className="text-xs opacity-70 mt-1">
              元本 ¥{fmt(totalIn)} ＋ 運用益 ¥{fmt(Math.round(gains))}（税引前）
            </p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-xs text-green-600 mb-1">NISA非課税益</p>
            <p className="text-lg font-bold text-green-700">+¥{fmt(Math.round(nisaGains))}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4">
            <p className="text-xs text-yellow-600 mb-1">NISA節税額</p>
            <p className="text-lg font-bold text-yellow-700">¥{fmt(Math.round(taxSaved))}</p>
          </div>
        </div>

        {/* グラフ */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">年次推移グラフ</h2>
          <TrendChart results={results} />
        </div>

        {/* NISA生涯枠 */}
        {nisaType !== 'none' && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="font-medium text-gray-600">NISA生涯枠の消化</span>
              <span>¥{fmt(Math.min(last.nisaUsedTotal, 18_000_000))} / ¥{fmt(18_000_000)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full transition-all"
                style={{ width: `${Math.min((last.nisaUsedTotal / 18_000_000) * 100, 100)}%` }} />
            </div>
            {last.nisaUsedTotal >= 18_000_000 && (
              <p className="text-xs text-orange-500 mt-1.5">
                ※ 生涯非課税上限（1,800万円）に達しています。超過分は課税口座扱いになります。
              </p>
            )}
          </div>
        )}

        {/* 年次テーブル */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button onClick={() => setShowTable(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600">
            <span>年次詳細テーブル</span>
            <span className="text-gray-400 text-xs">{showTable ? '▲ 閉じる' : '▼ 開く'}</span>
          </button>
          {showTable && (
            <div className="overflow-x-auto border-t border-gray-100">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    {['年', '元本累計', '残高（税前）', 'NISA非課税益', '税引後残高'].map(h => (
                      <th key={h} className="px-3 py-2 text-right first:text-left font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => {
                    const ng = Math.max(0, r.nisaBalance - r.nisaPrincipal);
                    return (
                      <tr key={r.year} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-600 font-medium">{r.year}年</td>
                        <td className="px-3 py-2 text-right text-gray-500">¥{fmt(r.principal)}</td>
                        <td className="px-3 py-2 text-right text-gray-700">¥{fmt(Math.round(r.balance))}</td>
                        <td className="px-3 py-2 text-right text-green-600">+¥{fmt(Math.round(ng))}</td>
                        <td className="px-3 py-2 text-right text-blue-600 font-semibold">¥{fmt(Math.round(r.afterTaxBalance))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
