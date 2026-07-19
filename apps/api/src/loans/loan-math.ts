// Pure loan math (backend source of truth). Mirrors the frontend model:
// SIMPLE interest on the original principal — total = principal × (1 + rate × nº periods).
// Amounts are rounded to cents for persistence. 0% → total equals the principal.

function roundCents(v: number): number {
  return Math.round(v * 100) / 100;
}

export function computeLoanTotals(
  principal: number,
  ratePercent: number,
  installmentCount: number,
): { totalAmount: number; installmentValue: number } {
  const periodRate = ratePercent / 100;
  const total = principal * (1 + periodRate * installmentCount);
  return {
    totalAmount: roundCents(total),
    installmentValue: installmentCount > 0 ? roundCents(total / installmentCount) : 0,
  };
}

/**
 * Splits a total into `count` installments that add up to EXACTLY the total.
 *
 * A flat `total / count` rounded per installment silently loses (or invents)
 * cents: R$250 in 3x becomes 3 × 83.33 = 249.99, and every screen that sums the
 * installments then shows 249,99 for a 250 contract. So the remainder cents are
 * handed out one-by-one to the first installments — 250 in 3x is 83.34 + 83.33
 * + 83.33 — and the contract's total always ties out.
 */
export function splitIntoInstallments(total: number, count: number): number[] {
  if (count <= 0) return [];
  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_v, idx) => (base + (idx < remainder ? 1 : 0)) / 100);
}
