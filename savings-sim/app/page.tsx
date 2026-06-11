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
import CombinedChart from './components/CombinedChart';

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

function ToggleSection({ label, badge, active, onToggle, children }: {
  label: string; badge?: string; active: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <button onClick={onToggle} className="w-full flex items-center justify-between text-sm font-semibold text-gray-600">
        <span>{label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
          {badge ?? (active ? 'ON' : 'OFF')}
        </span>
      </button>
      {active && <div className="mt-4 space-y-3">{children}</div>}
    </div>
  );
}

export default function Home() {
  // 基本パラメータ
  const [monthly,       setMonthly]       = useState(30_000);
  const [rate,          setRate]          = useState(5.0);
  const [years,         setYears]         = useState(20);
  const [initial,       setInitial]       = useState(0);
  const [nisaType,      setNisaType]      = useState<NisaType>('tsumitate');
  // インフレ
  const [showInflation, setShowInflation] = useState(false);
  const [inflationRate, setInflationRate] = useState(2.0);
  // 目標逆算
  const [showGoal,      setShowGoal]      = useState(false);
  const [goalAmount,    setGoalAmount]    = useState(0);
  // ボーナス加算
  const [showBonus,     setShowBonus]     = useState(false);
  const [bonusAmount,   setBonusAmount]   = useState(300_000);
  const [bonusTimes,    setBonusTimes]    = useState<1 | 2>(2);
  // 途中増額
  const [showStepUp,    setShowStepUp]    = useState(false);
  const [stepUpYear,    setStepUpYear]    = useState(10);
  const [stepUpAmount,  setStepUpAmount]  = useState(50_000);
  // UI
  const [showAccumTable,    setShowAccumTable]    = useState(false);
  const [showWithdrawTable, setShowWithdrawTable] = useState(false);
  const [activeTab,     setActiveTab]     = useState<Tab>('accumulate');
  // 取り崩し
  const [withdrawMonthly, setWithdrawMonthly] = useState(100_000);
  const [withdrawYears,   setWithdrawYears]   = useState(30);
  const [showCombined,    setShowCombined]    = useState(false);

  const simParams = useMemo(() => ({
    monthlyAmount: monthly,
    annualRate: rate,
    years,
    initialAmount: initial,
    nisaType,
    inflationRate: showInflation ? inflationRate : 0,
    bonusAmount:   showBonus ? bonusAmount : 0,
    bonusTimes:    bonusTimes,
    stepUpYear:    showStepUp ? stepUpYear : undefined,
    stepUpAmount:  showStepUp ? stepUpAmount : undefined,
  }), [monthly, rate, years, initial, nisaType, inflationRate, showInflation,
       bonusAmount, bonusTimes, showBonus, stepUpYear, stepUpAmount, showStepUp]);

  const results = useMemo(() => simulate(simParams), [simParams]);

  // ボーナス・増額なしの結果（増加額表示用）
  const baseResults = useMemo(() =>
    simulate({ monthlyAmount: monthly, annualRate: rate, years, initialAmount: initial, nisaType }),
    [monthly, rate, years, initial, nisaType]
  );

  const last     = results[results.length - 1];
  const totalIn  = last.principal;
  const gains    = last.balance - totalIn;
  const nisaGains = Math.max(0, last.nisaBalance - last.nisaPrincipal);
  const taxSaved  = Math.max(0, nisaGains * 0.20315);

  // ボーナス単独・増額単独の最終残高（効果を個別表示するため）
  const bonusOnlyFinal = useMemo(() =>
    simulate({ monthlyAmount: monthly, annualRate: rate, years, initialAmount: initial, nisaType,
      bonusAmount: showBonus ? bonusAmount : 0, bonusTimes }).at(-1)!.afterTaxBalance,
    [monthly, rate, years, initial, nisaType, bonusAmount, bonusTimes, showBonus]
  );
  const stepUpOnlyFinal = useMemo(() =>
    simulate({ monthlyAmount: monthly, annualRate: rate, years, initialAmount: initial, nisaType,
      stepUpYear: showStepUp ? stepUpYear : undefined, stepUpAmount: showStepUp ? stepUpAmount : undefined }).at(-1)!.afterTaxBalance,
    [monthly, rate, years, initial, nisaType, stepUpYear, stepUpAmount, showStepUp]
  );
  const baseFinal    = baseResults[baseResults.length - 1].afterTaxBalance;
  const bonusEffect  = Math.round(bonusOnlyFinal  - baseFinal);
  const stepUpEffect = Math.round(stepUpOnlyFinal - baseFinal);

  // 目標逆算
  const reqMonthly = useMemo(() =>
    showGoal && goalAmount > 0
      ? calcRequiredMonthly(goalAmount, rate, years, initial, nisaType) : null,
    [showGoal, goalAmount, rate, years, initial, nisaType]
  );
  const reqYears = useMemo(() =>
    showGoal && goalAmount > 0
      ? calcRequiredYears(goalAmount, monthly, rate, initial, nisaType) : null,
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
  const runsOut     = lastW.balance <= 0;
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

          {/* 基本入力 */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-5">
            <Slider label="毎月の積み立て額" value={monthly} min={1000} max={100_000} step={1000} unit="¥" onChange={setMonthly} />
            <Slider label="年利（想定リターン）" value={rate} min={0.1} max={15} step={0.1} unit="%" onChange={setRate} />
            <Slider label="積み立て期間" value={years} min={1} max={40} step={1} unit="年" onChange={v => { setYears(v); setStepUpYear(prev => Math.min(prev, Math.max(1, v - 1))); }} />
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

          {/* ボーナス加算 */}
          <ToggleSection
            label="ボーナス加算"
            badge={showBonus ? `年${bonusTimes}回 ¥${fmt(bonusAmount)}` : 'OFF'}
            active={showBonus}
            onToggle={() => setShowBonus(v => !v)}
          >
            <Slider label="1回あたりのボーナス投資額" value={bonusAmount} min={10_000} max={1_000_000} step={10_000} unit="¥" onChange={setBonusAmount} />
            <div>
              <p className="text-sm text-gray-600 mb-2">年何回</p>
              <div className="flex gap-2">
                {([1, 2] as const).map(n => (
                  <button key={n} onClick={() => setBonusTimes(n)}
                    className={`flex-1 py-2 rounded-lg text-sm border font-medium transition-colors
                      ${bonusTimes === n ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                    {n === 1 ? '年1回（12月）' : '年2回（6・12月）'}
                  </button>
                ))}
              </div>
            </div>
            {bonusEffect !== 0 && (
              <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                基本設定との差: +¥{fmt(bonusEffect)}
              </p>
            )}
          </ToggleSection>

          {/* 途中増額 */}
          <ToggleSection
            label="途中増額"
            badge={showStepUp ? `${stepUpYear}年後 ¥${fmt(stepUpAmount)}/月` : 'OFF'}
            active={showStepUp}
            onToggle={() => setShowStepUp(v => !v)}
          >
            <Slider label="増額開始タイミング" value={stepUpYear} min={1} max={years - 1 > 0 ? years - 1 : 1} step={1} unit="年後" onChange={setStepUpYear} />
            <Slider label="増額後の月額" value={stepUpAmount} min={1000} max={200_000} step={1000} unit="¥" onChange={setStepUpAmount} />
            <div className="grid grid-cols-2 gap-2 text-xs text-center">
              <div className="bg-gray-50 rounded-lg py-2">
                <p className="text-gray-400">〜{stepUpYear}年目</p>
                <p className="font-semibold text-gray-700">月¥{fmt(monthly)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg py-2">
                <p className="text-blue-400">{stepUpYear + 1}年目〜</p>
                <p className="font-semibold text-blue-700">月¥{fmt(stepUpAmount)}</p>
              </div>
            </div>
            <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
              基本設定との差: {stepUpEffect >= 0 ? '+' : ''}¥{fmt(stepUpEffect)}
            </p>
          </ToggleSection>

          {/* インフレ調整 */}
          <ToggleSection
            label="インフレ調整"
            badge={showInflation ? `${inflationRate}%` : 'OFF'}
            active={showInflation}
            onToggle={() => setShowInflation(v => !v)}
          >
            <Slider label="想定インフレ率" value={inflationRate} min={0.1} max={5} step={0.1} unit="%" onChange={setInflationRate} />
            <p className="text-[11px] text-gray-400">
              インフレを考慮した「実質価値（今のお金換算）」を合わせて表示します。
            </p>
          </ToggleSection>

          {/* 目標逆算 */}
          <ToggleSection label="目標金額から逆算" active={showGoal} onToggle={() => setShowGoal(v => !v)}>
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
                  <p className="text-[10px] text-blue-500 mb-1">{years}年間で達成するには</p>
                  <p className="text-base font-bold text-blue-700">
                    {reqMonthly !== null ? `月¥${fmt(reqMonthly)}` : '50年以上'}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-[10px] text-green-500 mb-1">現在の月額で達成するには</p>
                  <p className="text-base font-bold text-green-700">
                    {reqYears !== null ? `${reqYears}年` : '50年以上'}
                  </p>
                </div>
              </div>
            )}
          </ToggleSection>

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
            <button onClick={() => setShowAccumTable(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600">
              <span>年次詳細テーブル</span>
              <span className="text-gray-400 text-xs">{showAccumTable ? '▲ 閉じる' : '▼ 開く'}</span>
            </button>
            {showAccumTable && (
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
              { label: '悲観', r: bearRate, res: bearResults, col: 'red' },
              { label: '標準', r: rate,     res: results,     col: 'blue' },
              { label: '楽観', r: bullRate, res: bullResults,  col: 'green' },
            ].map(({ label, r, res, col }) => {
              const l = res[res.length - 1];
              const bg:  Record<string,string> = { red: 'bg-red-50 border-red-100',   blue: 'bg-blue-50 border-blue-100',   green: 'bg-green-50 border-green-100' };
              const txt: Record<string,string> = { red: 'text-red-600',               blue: 'text-blue-600',               green: 'text-green-600' };
              const val: Record<string,string> = { red: 'text-red-700',               blue: 'text-blue-700',               green: 'text-green-700' };
              return (
                <div key={label} className={`rounded-xl p-3 border ${bg[col]}`}>
                  <p className={`text-[10px] font-medium mb-0.5 ${txt[col]}`}>{label} {r}%</p>
                  <p className={`text-sm font-bold ${val[col]}`}>¥{fmt(Math.round(l.afterTaxBalance))}</p>
                  <p className="text-[10px] mt-0.5 text-gray-400">元本¥{fmt(l.principal)}</p>
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
            {showBonus && <p>ボーナス ¥{fmt(bonusAmount)} × 年{bonusTimes}回</p>}
            {showStepUp && <p>途中増額: {stepUpYear}年後〜 月¥{fmt(stepUpAmount)}</p>}
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

          {/* 取り崩しグラフ */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">残高推移グラフ</h2>
            <WithdrawalChart results={withdrawalResults} showReal={showInflation} />
            {showInflation && (
              <p className="text-[10px] text-gray-400 mt-1">点線: 実質残高（インフレ {inflationRate}% 調整後）</p>
            )}
          </div>

          {/* 積み立て+取り崩し 一体グラフ */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <button onClick={() => setShowCombined(v => !v)}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-600">
              <span>積み立て〜取り崩し 一体グラフ</span>
              <span className="text-gray-400 text-xs">{showCombined ? '▲ 閉じる' : '▼ 開く'}</span>
            </button>
            {showCombined && (
              <div className="mt-3">
                <CombinedChart
                  accumResults={results}
                  withdrawResults={withdrawalResults}
                  accumYears={years}
                />
                <p className="text-[10px] text-gray-400 mt-2">
                  青: 積み立て期間（{years}年） · 橙: 取り崩し期間（{withdrawYears}年）
                </p>
              </div>
            )}
          </div>

          {/* 年次テーブル */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button onClick={() => setShowWithdrawTable(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600">
              <span>年次詳細テーブル</span>
              <span className="text-gray-400 text-xs">{showWithdrawTable ? '▲ 閉じる' : '▼ 開く'}</span>
            </button>
            {showWithdrawTable && (
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
