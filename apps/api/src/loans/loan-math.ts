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
