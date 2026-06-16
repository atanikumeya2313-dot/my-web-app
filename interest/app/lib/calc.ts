export type NisaType = 'none' | 'tsumitate' | 'growth';

// モード間連携：複利比較の項目 → 積み立てシミュレーターへ引き継ぐ初期値
// （運用期間 years は両モードで共有するため seed には含めない）
export interface SavingsSeed {
  monthly: number;
  rate: number;
  initial: number;
}

export interface SimParams {
  monthlyAmount: number;
  annualRate: number;
  years: number;
  initialAmount: number;
  nisaType: NisaType;
  inflationRate?: number;
  bonusAmount?: number;
  bonusTimes?: 1 | 2;
  stepUpYear?: number;
  stepUpAmount?: number;
}

export interface YearResult {
  year: number;
  principal: number;
  nisaPrincipal: number;
  nonNisaPrincipal: number;
  nisaBalance: number;
  nonNisaBalance: number;
  balance: number;
  afterTaxBalance: number;
  realBalance: number;
  nisaUsedTotal: number;
}

export interface WithdrawalYearResult {
  year: number;
  balance: number;
  realBalance: number;
}

const TAX_RATE      = 0.20315;
const NISA_LIFETIME = 18_000_000;

const NISA_ANNUAL: Record<NisaType, number> = {
  none:      0,
  tsumitate: 1_200_000,
  growth:    2_400_000,
};

export function simulate(params: SimParams): YearResult[] {
  const {
    monthlyAmount, annualRate, years, initialAmount, nisaType,
    inflationRate = 0,
    bonusAmount = 0, bonusTimes = 2,
    stepUpYear, stepUpAmount,
  } = params;
  const monthlyRate   = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  const nisaAnnualLim = NISA_ANNUAL[nisaType];

  const initNisa    = nisaType !== 'none'
    ? Math.min(initialAmount, nisaAnnualLim, NISA_LIFETIME) : 0;
  const initNonNisa = initialAmount - initNisa;

  let nisaBalance      = initNisa;
  let nonNisaBalance   = initNonNisa;
  let nisaPrincipal    = initNisa;
  let nonNisaPrincipal = initNonNisa;
  let nisaUsedTotal    = initNisa;

  const afterTax = (_nb: number, _np: number, nnb: number, nnp: number) => {
    const nb = _nb;
    const nonNisaGains = Math.max(0, nnb - nnp);
    return nb + nnp + nonNisaGains * (1 - TAX_RATE);
  };

  const realVal = (atb: number, year: number) =>
    inflationRate === 0 ? atb : atb / Math.pow(1 + inflationRate / 100, year);

  const results: YearResult[] = [{
    year: 0,
    principal: initialAmount,
    nisaPrincipal: initNisa,
    nonNisaPrincipal: initNonNisa,
    nisaBalance,
    nonNisaBalance,
    balance: initialAmount,
    afterTaxBalance: afterTax(nisaBalance, nisaPrincipal, nonNisaBalance, nonNisaPrincipal),
    realBalance: initialAmount,
    nisaUsedTotal,
  }];

  const isBonusMonth = (month: number) =>
    bonusTimes === 2 ? (month === 6 || month === 12) : month === 12;

  for (let y = 1; y <= years; y++) {
    let nisaUsedThisYear = 0;
    const currentMonthly = (stepUpYear && y > stepUpYear && stepUpAmount)
      ? stepUpAmount : monthlyAmount;

    for (let m = 1; m <= 12; m++) {
      nisaBalance    *= (1 + monthlyRate);
      nonNisaBalance *= (1 + monthlyRate);

      // 毎月積み立て
      const remainAnnual   = nisaAnnualLim - nisaUsedThisYear;
      const remainLifetime = NISA_LIFETIME  - nisaUsedTotal;
      const nisaContrib    = nisaType !== 'none'
        ? Math.min(currentMonthly, remainAnnual, Math.max(0, remainLifetime)) : 0;
      const nonNisaContrib = currentMonthly - nisaContrib;

      nisaBalance      += nisaContrib;
      nonNisaBalance   += nonNisaContrib;
      nisaPrincipal    += nisaContrib;
      nonNisaPrincipal += nonNisaContrib;
      nisaUsedThisYear += nisaContrib;
      nisaUsedTotal    += nisaContrib;

      // ボーナス積み立て
      if (bonusAmount > 0 && isBonusMonth(m)) {
        const bonusRemainAnnual   = nisaAnnualLim - nisaUsedThisYear;
        const bonusRemainLifetime = NISA_LIFETIME  - nisaUsedTotal;
        const bonusNisa    = nisaType !== 'none'
          ? Math.min(bonusAmount, bonusRemainAnnual, Math.max(0, bonusRemainLifetime)) : 0;
        const bonusNonNisa = bonusAmount - bonusNisa;

        nisaBalance      += bonusNisa;
        nonNisaBalance   += bonusNonNisa;
        nisaPrincipal    += bonusNisa;
        nonNisaPrincipal += bonusNonNisa;
        nisaUsedThisYear += bonusNisa;
        nisaUsedTotal    += bonusNisa;
      }
    }

    const balance = nisaBalance + nonNisaBalance;
    const atb = afterTax(nisaBalance, nisaPrincipal, nonNisaBalance, nonNisaPrincipal);
    results.push({
      year: y,
      principal:        nisaPrincipal + nonNisaPrincipal,
      nisaPrincipal,
      nonNisaPrincipal,
      nisaBalance,
      nonNisaBalance,
      balance,
      afterTaxBalance:  atb,
      realBalance:      Math.round(realVal(atb, y)),
      nisaUsedTotal,
    });
  }

  return results;
}

export function calcRequiredMonthly(
  target: number, rate: number, years: number, initial: number, nisaType: NisaType
): number {
  if (target <= initial) return 0;
  let lo = 0, hi = 2_000_000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const r = simulate({ monthlyAmount: mid, annualRate: rate, years, initialAmount: initial, nisaType });
    if (r[r.length - 1].afterTaxBalance < target) lo = mid; else hi = mid;
  }
  return Math.ceil((lo + hi) / 2 / 1000) * 1000;
}

export function calcRequiredYears(
  target: number, monthly: number, rate: number, initial: number, nisaType: NisaType
): number | null {
  for (let y = 1; y <= 50; y++) {
    const r = simulate({ monthlyAmount: monthly, annualRate: rate, years: y, initialAmount: initial, nisaType });
    if (r[r.length - 1].afterTaxBalance >= target) return y;
  }
  return null;
}

export function simulateWithdrawal(params: {
  initialBalance: number;
  annualRate: number;
  monthlyWithdrawal: number;
  inflationRate: number;
  maxYears: number;
}): WithdrawalYearResult[] {
  const { initialBalance, annualRate, monthlyWithdrawal, inflationRate, maxYears } = params;
  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;

  let balance = initialBalance;
  const results: WithdrawalYearResult[] = [{ year: 0, balance: Math.round(balance), realBalance: Math.round(balance) }];

  for (let y = 1; y <= maxYears; y++) {
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      balance *= (1 + monthlyRate);
      balance -= monthlyWithdrawal;
    }
    balance = Math.max(0, balance);
    const realBalance = inflationRate === 0 ? balance : balance / Math.pow(1 + inflationRate / 100, y);
    results.push({ year: y, balance: Math.round(balance), realBalance: Math.round(Math.max(0, realBalance)) });
    if (balance <= 0) break;
  }
  return results;
}

export function calcSustainableMonthly(balance: number, annualRate: number, years: number): number {
  let lo = 0, hi = balance;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const r = simulateWithdrawal({ initialBalance: balance, annualRate, monthlyWithdrawal: mid, inflationRate: 0, maxYears: years });
    if (r[r.length - 1].balance <= 0) hi = mid; else lo = mid;
  }
  return Math.floor((lo + hi) / 2 / 1000) * 1000;
}

export const fmt = (n: number) =>
  n >= 1_0000_0000 ? `${(n / 1_0000_0000).toFixed(1)}億` :
  n >= 10_000      ? `${Math.floor(n / 10_000)}万`       :
  n.toLocaleString('ja-JP');
