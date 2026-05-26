'use client';
import { useState, useMemo } from 'react';
import {
  simulate, fmt, NisaType,
  calcRequiredMonthly, calcRequiredYears,
  simulateWithdrawal, calcSustainableMonthly,
} from './lib/calc';
import TrendChart from './components/TrendChart';
import ScenarioChart from './components/ScenarioChart';
import WithdrawalChart from './components/WithdrawalChart';

const NISA_LABELS: Record<NisaType, string> = {
  none:      '使わない',
  tsumitate: 'つみたて枠（120万/年）',
  growth:    '成長投資枠（240万/年）',
};

type Tab = 'accumulate' | 'scenario' | 'withdrawal';

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
  const [monthly,        setMonthly]        = useState(30_000);
  const [rate,           setRate]           = useState(5.0);
  const [years,          setYears]          = useState(20);
  const [initial,        setInitial]        = useState(0);
  const [nisaType,       setNisaType]       = useState<NisaType>('tsumitate');
  const [inflationRate,  setInflationRate]  = useState(2.0);
  const [showInflation,  setShowInflation]  = useState(false);
  const [goalAmount,     setGoalAmount]     = useState(0);
  const [showGoal,       setShowGoal]       = useState(false);
  const [showTable,      setShowTable]      = useState(false);
  const [activeTab,      setActiveTab]      = useState<Tab>('accumulate');
  const [withdrawMonthly, setWithdrawMonthly] = useState(100_000);
  const [withdrawYears,   setWithdrawYears]   = useState(30);

  const results = useMemo(() =>
    simulate({ monthlyAmount: monthly, annualRate: rate, years, initialAmount: initial, nisaType,
               inflationRate: showInflation ? inflationRate : 0 }),
    [monthly, rate, years, initial, nisaType, inflationRate, showInflation]
  );

  const last      = results[results.length - 1];
  const totalIn   = last.principal;
  const gains     = last.balance - totalIn;
  const nisaGains = Math.max(0, last.nisaBalance - last.nisaPrincipal);
  const taxSaved  = Math.max(0, nisaGains * 0.20315);

  // 目標逆算
  const reqMonthly = useMemo(() =>
    showGoal && goalAmount > 0
      ? calcRequiredMonthly(goalAmount, rate, years, initial, nisaType)
      : null,
    [showGoal, goalAmount, rate, years, initial, nisaType]
  );
  const reqYears = useMemo(() =>
    showGoal && goalAmount > 0
      ? calcRequiredYears(goalAmount, monthly, rate, initial, nisaType)
      : null,
    [showGoal, goalAmount, monthly, rate, initial, nisaType]
  );

  // シナリオ比較
  const bearRate = Math.max(0.1, Math.round((rate - 2) * 10) / 10);
  const bullRate = Math.round((rate + 2) * 10) / 10;
  const bearResults = useMemo(() =>
    simulate({ monthlyAmount: monthly, annualRate: bearRate, years, initialAmount: initial, nisaType }),
    [monthly, bearRate, years, initial, nisaType]
  );
  const bullResults = useMemo(() =>
    simulate({ monthlyAmount: monthly, annualRate: bullRate, years, initialAmount: initial, nisaType }),
    [monthly, bullRate, years, initial, nisaType]
  );

  // 取り崩し
  const withdrawalInitial = Math.round(last.afterTaxBalance);
  const withdrawalResults = useMemo(() =>
    simulateWithdrawal({
      initialBalance: withdrawalInitial,
      annualRate: rate,
      monthlyWithdrawal: withdrawMonthly,
      inflationRate: showInflation ? inflationRate : 0,
      maxYears: withdrawYears,
    }),
    [withdrawalInitial, rate, withdrawMonthly, inflationRate, showInflation, withdrawYears]
  );
  const sustainableMonthly = useMemo(() =>
    calcSustainableMonthly(withdrawalInitial, rate, withdrawYears),
    [withdrawalInitial, rate, withdrawYears]
  );
  const lastW = withdrawalResults[withdrawalResults.length - 1];
  const runsOut = lastW.balance <= 0;
  const runsOutYear = runsOut ? lastW.year : null;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'accumulate', label: '積み立て' },
    { id: 'scenario',   label: 'シナリオ比較' },
    { id: 'withdrawal', label: '取り崩し' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-base font-bold text-gray-800">積み立てシミュレーター</h1>
        </div>
        <div className="max-w-lg mx-auto flex border-t border-gray-100">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors relative
                ${activeTab === t.id ? 'text-blue-500' : 'text-gray-400'}`}>
              {t.label}
              {activeTab === t.id && (
                <span className="absolute bottom-0 inset-x-4 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-8">

        {/* ===== 積み立てタブ ===== */}
        {activeTab === 'accumulate' && (<>

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

          {/* インフレ調整 */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <button onClick={() => setShowInflation(v => !v)}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-600">
              <span>インフレ調整</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${showInflation ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                {showInflation ? `${inflationRate}%` : 'OFF'}
              </span>
            </button>
            {showInflation && (
              <div className="mt-4 space-y-3">
                <Slider label="想定インフレ率" value={inflationRate} min={0.1} max={5} step={0.1} unit="%" onChange={setInflationRate} />
                <p className="text-[11px] text-gray-400">
                  インフレを考慮した「実質価値（今のお金換算）」を合わせて表示します。
                </p>
              </div>
            )}
          </div>

          {/* 目標逆算 */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <button onClick={() => setShowGoal(v => !v)}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-600">
              <span>目標金額から逆算</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${showGoal ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                {showGoal ? 'ON' : 'OFF'}
              </span>
            </button>
            {showGoal && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">目標金額</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
                    <input type="number" value={goalAmount || ''} min={0} step={100000}
                      placeholder="例: 10000000"
                      onChange={e => setGoalAmount(Math.max(0, Number(e.target.value)))}
                      className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>
                </div>
                {goalAmount > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-[10px] text-blue-500 mb-1">現在の期間（{years}年）で達成するには</p>
                      <p className="text-base font-bold text-blue-700">
                        {reqMonthly !== null ? `月¥${fmt(reqMonthly)}` : '50年以上'}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-[10px] text-green-500 mb-1">現在の月額（¥{fmt(monthly)}）で達成するには</p>
                      <p className="text-base font-bold text-green-700">
                        {reqYears !== null ? `${reqYears}年` : '50年以上'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* サマリーカード */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-500 text-white rounded-xl p-4 col-span-2">
              <p className="text-xs opacity-80 mb-1">税引後 最終残高</p>
              <p className="text-2xl font-bold">¥{fmt(Math.round(last.afterTaxBalance))}</p>
              {showInflation && (
                <p className="text-sm font-semibold opacity-90 mt-0.5">
                  実質価値 ¥{fmt(last.realBalance)}
                  <span className="text-xs opacity-70 ml-1">（今のお金換算）</span>
                </p>
              )}
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
                      {['年', '元本累計', '残高（税前）', 'NISA非課税益', '税引後残高',
                        ...(showInflation ? ['実質残高'] : [])].map(h => (
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
                          {showInflation && (
                            <td className="px-3 py-2 text-right text-orange-500">¥{fmt(r.realBalance)}</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>)}

        {/* ===== シナリオ比較タブ ===== */}
        {activeTab === 'scenario' && (<>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '悲観', rate: bearRate, r: bearResults, color: 'red' },
              { label: '標準', rate,           r: results,     color: 'blue' },
              { label: '楽観', rate: bullRate, r: bullResults,  color: 'green' },
            ].map(({ label, rate: r, r: res, color }) => {
              const l = res[res.length - 1];
              const colors: Record<string, string> = {
                red:   'bg-red-50 text-red-600 border-red-100',
                blue:  'bg-blue-50 text-blue-600 border-blue-100',
                green: 'bg-green-50 text-green-600 border-green-100',
              };
              const valColors: Record<string, string> = {
                red: 'text-red-700', blue: 'text-blue-700', green: 'text-green-700',
              };
              return (
                <div key={label} className={`rounded-xl p-3 border ${colors[color]}`}>
                  <p className="text-[10px] font-medium mb-0.5">{label} {r}%</p>
                  <p className={`text-sm font-bold ${valColors[color]}`}>¥{fmt(Math.round(l.afterTaxBalance))}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">元本¥{fmt(l.principal)}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">シナリオ比較グラフ</h2>
            <ScenarioChart
              bear={bearResults} base={results} bull={bullResults}
              bearRate={bearRate} baseRate={rate} bullRate={bullRate}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">差額シミュレーション</h2>
            <div className="space-y-2">
              {[
                { label: `楽観（${bullRate}%）vs 標準（${rate}%）`, diff: Math.round(bullResults[bullResults.length-1].afterTaxBalance - last.afterTaxBalance), color: 'text-green-600' },
                { label: `標準（${rate}%）vs 悲観（${bearRate}%）`, diff: Math.round(last.afterTaxBalance - bearResults[bearResults.length-1].afterTaxBalance), color: 'text-blue-600' },
              ].map(({ label, diff, color }) => (
                <div key={label} className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                  <span className="text-gray-500 text-xs">{label}</span>
                  <span className={`font-semibold ${color}`}>+¥{fmt(diff)}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              ※ 年利の違いで最終残高がどれだけ変わるかを示しています。
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-600">前提条件</p>
            <p>毎月 ¥{fmt(monthly)} · 期間 {years}年 · NISA: {NISA_LABELS[nisaType]}</p>
            <p>初期投資 ¥{fmt(initial)} · 標準年利 {rate}%</p>
          </div>
        </>)}

        {/* ===== 取り崩しタブ ===== */}
        {activeTab === 'withdrawal' && (<>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs text-blue-500 mb-1">積み立て終了後の残高（{years}年後）</p>
            <p className="text-xl font-bold text-blue-700">¥{fmt(withdrawalInitial)}</p>
            <p className="text-xs text-blue-400 mt-0.5">この金額を元手に取り崩しシミュレーション</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 space-y-5">
            <Slider label="毎月の取り崩し額" value={withdrawMonthly} min={10_000} max={500_000} step={10_000} unit="¥" onChange={setWithdrawMonthly} />
            <Slider label="取り崩し期間" value={withdrawYears} min={5} max={50} step={1} unit="年" onChange={setWithdrawYears} />
          </div>

          {/* 持続可能額 */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">持続可能な取り崩し額（{withdrawYears}年間）</p>
                <p className="text-xl font-bold text-green-600">月¥{fmt(sustainableMonthly)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">設定中の取り崩し額</p>
                <p className={`text-xl font-bold ${withdrawMonthly <= sustainableMonthly ? 'text-green-600' : 'text-red-500'}`}>
                  月¥{fmt(withdrawMonthly)}
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${withdrawMonthly <= sustainableMonthly ? 'bg-green-400' : 'bg-red-400'}`}
                style={{ width: `${Math.min((withdrawMonthly / (sustainableMonthly * 1.5)) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* 結果サマリー */}
          {runsOut ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-sm font-bold text-red-600">⚠ {runsOutYear}年後に資産が底をつきます</p>
              <p className="text-xs text-red-400 mt-1">
                取り崩し額を月¥{fmt(sustainableMonthly)}以下に抑えると{withdrawYears}年間持続できます。
              </p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <p className="text-sm font-bold text-green-600">✓ {withdrawYears}年間 取り崩し可能</p>
              <p className="text-xs text-green-500 mt-1">
                {withdrawYears}年後の残高: ¥{fmt(lastW.balance)}
              </p>
            </div>
          )}

          {/* グラフ */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">残高推移グラフ</h2>
            <WithdrawalChart results={withdrawalResults} showReal={showInflation} />
            {showInflation && (
              <p className="text-[10px] text-gray-400 mt-1">点線: 実質残高（インフレ {inflationRate}% 調整後）</p>
            )}
          </div>

          {/* テーブル */}
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
                      {['年', '残高', ...(showInflation ? ['実質残高'] : [])].map(h => (
                        <th key={h} className="px-3 py-2 text-right first:text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalResults.map(r => (
                      <tr key={r.year} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-600 font-medium">{r.year}年</td>
                        <td className={`px-3 py-2 text-right font-semibold ${r.balance > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                          ¥{fmt(r.balance)}
                        </td>
                        {showInflation && (
                          <td className="px-3 py-2 text-right text-orange-500">¥{fmt(r.realBalance)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>)}

      </main>
    </div>
  );
}
