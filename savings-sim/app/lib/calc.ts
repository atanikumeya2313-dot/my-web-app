export type NisaType = 'none' | 'tsumitate' | 'growth';

export interface SimParams {
  monthlyAmount: number;   // 毎月積み立て額
  annualRate: number;      // 年利 (%)
  years: number;           // 積み立て期間
  initialAmount: number;   // 初期投資額
  nisaType: NisaType;
}

export interface YearResult {
  year: number;
  principal: number;        // 元本累計
  nisaPrincipal: number;    // NISA元本累計
  nonNisaPrincipal: number; // 課税口座元本累計
  nisaBalance: number;      // NISA残高（税引前）
  nonNisaBalance: number;   // 課税口座残高（税引前）
  balance: number;          // 合計残高（税引前）
  afterTaxBalance: number;  // 税引後残高
  nisaUsedTotal: number;    // NISA生涯利用額
}

const TAX_RATE        = 0.20315;
const NISA_LIFETIME   = 18_000_000; // 1800万円

const NISA_ANNUAL: Record<NisaType, number> = {
  none:      0,
  tsumitate: 1_200_000, // つみたて投資枠 120万/年
  growth:    2_400_000, // 成長投資枠    240万/年
};

export function simulate(params: SimParams): YearResult[] {
  const { monthlyAmount, annualRate, years, initialAmount, nisaType } = params;
  const monthlyRate    = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  const nisaAnnualLim  = NISA_ANNUAL[nisaType];

  // 初期投資の NISA 振り分け
  const initNisa    = nisaType !== 'none'
    ? Math.min(initialAmount, nisaAnnualLim, NISA_LIFETIME)
    : 0;
  const initNonNisa = initialAmount - initNisa;

  let nisaBalance      = initNisa;
  let nonNisaBalance   = initNonNisa;
  let nisaPrincipal    = initNisa;
  let nonNisaPrincipal = initNonNisa;
  let nisaUsedTotal    = initNisa;

  const afterTax = (nb: number, np: number, nnb: number, nnp: number) => {
    const nonNisaGains = Math.max(0, nnb - nnp);
    return nb + nnp + nonNisaGains * (1 - TAX_RATE);
  };

  const results: YearResult[] = [{
    year: 0,
    principal: initialAmount,
    nisaPrincipal: initNisa,
    nonNisaPrincipal: initNonNisa,
    nisaBalance,
    nonNisaBalance,
    balance: initialAmount,
    afterTaxBalance: afterTax(nisaBalance, nisaPrincipal, nonNisaBalance, nonNisaPrincipal),
    nisaUsedTotal,
  }];

  for (let y = 1; y <= years; y++) {
    let nisaUsedThisYear = 0;

    for (let m = 0; m < 12; m++) {
      nisaBalance    *= (1 + monthlyRate);
      nonNisaBalance *= (1 + monthlyRate);

      const remainAnnual   = nisaAnnualLim - nisaUsedThisYear;
      const remainLifetime = NISA_LIFETIME  - nisaUsedTotal;
      const nisaContrib    = nisaType !== 'none'
        ? Math.min(monthlyAmount, remainAnnual, Math.max(0, remainLifetime))
        : 0;
      const nonNisaContrib = monthlyAmount - nisaContrib;

      nisaBalance      += nisaContrib;
      nonNisaBalance   += nonNisaContrib;
      nisaPrincipal    += nisaContrib;
      nonNisaPrincipal += nonNisaContrib;
      nisaUsedThisYear += nisaContrib;
      nisaUsedTotal    += nisaContrib;
    }

    const balance = nisaBalance + nonNisaBalance;
    results.push({
      year: y,
      principal:        nisaPrincipal + nonNisaPrincipal,
      nisaPrincipal,
      nonNisaPrincipal,
      nisaBalance,
      nonNisaBalance,
      balance,
      afterTaxBalance:  afterTax(nisaBalance, nisaPrincipal, nonNisaBalance, nonNisaPrincipal),
      nisaUsedTotal,
    });
  }

  return results;
}

export const fmt = (n: number) =>
  n >= 1_0000_0000 ? `${(n / 1_0000_0000).toFixed(1)}億` :
  n >= 10_000      ? `${Math.round(n / 10_000)}万`       :
  n.toLocaleString('ja-JP');
