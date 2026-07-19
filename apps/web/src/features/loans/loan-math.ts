// Pure loan math — the single source of truth for how a loan's total is computed.
//
// Model: SIMPLE interest on the original principal.
//   total = principal × (1 + ratePerPeriod × installments)
// A single "à vista" loan is just `installments = 1`. 0% interest → total = principal.
//
// This is money logic, so it lives in one pure, well-tested module (see loan-math.test.ts).

export type CalcMode = 'BY_RATE' | 'BY_TOTAL';

/**
 * Total and per-installment value from a per-period rate.
 * @param ratePerPeriod fraction per period (e.g. 0.05 = 5%)
 */
export function calcFromRate(
  principal: number,
  ratePerPeriod: number,
  installments: number,
): { total: number; pmt: number } {
  const total = principal * (1 + ratePerPeriod * installments);
  return { total, pmt: installments > 0 ? total / installments : 0 };
}

/**
 * Splits a total into installments that add up to EXACTLY the total — the same
 * rule the backend persists with (see api loan-math.ts). Kept in sync so the
 * preview never promises a parcela the contract won't have.
 */
export function splitIntoInstallments(total: number, count: number): number[] {
  if (count <= 0) return [];
  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_v, idx) => (base + (idx < remainder ? 1 : 0)) / 100);
}

/** The per-period rate (as a %) that makes `principal` reach `target` over `installments`. */
export function calcRateFromTotal(principal: number, target: number, installments: number): number {
  if (principal <= 0 || installments <= 0) return 0;
  const rate = ((target / principal - 1) / installments) * 100;
  return Math.round(rate * 100) / 100;
}

export interface LoanInput {
  principal: number;
  installments: number;
  mode: CalcMode;
  /** Used when mode = 'BY_RATE' (per-period rate as a %). */
  ratePercent?: number;
  /** Used when mode = 'BY_TOTAL' (target amount to receive). Empty/0 → equals principal (no interest). */
  targetTotal?: number;
}

export interface LoanResult {
  total: number;
  pmt: number;
  /** Effective per-period rate as a % (what gets stored on the loan). */
  ratePercent: number;
}

/** High-level resolver: total / per-installment / effective rate from either a % or a target total. */
export function computeLoan(input: LoanInput): LoanResult {
  const { principal, installments, mode } = input;
  if (principal <= 0 || installments <= 0) return { total: 0, pmt: 0, ratePercent: 0 };

  if (mode === 'BY_TOTAL') {
    const target = input.targetTotal && input.targetTotal > 0 ? input.targetTotal : principal;
    return { total: target, pmt: target / installments, ratePercent: calcRateFromTotal(principal, target, installments) };
  }

  const ratePercent = input.ratePercent ?? 0;
  const { total, pmt } = calcFromRate(principal, ratePercent / 100, installments);
  return { total, pmt, ratePercent };
}
