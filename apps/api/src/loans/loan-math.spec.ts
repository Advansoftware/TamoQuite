import { describe, it, expect } from 'vitest';
import { computeLoanTotals } from './loan-math';

describe('computeLoanTotals — juros simples sobre o principal', () => {
  it('R$200 a 5% por 2 períodos → total 220, parcela 110', () => {
    expect(computeLoanTotals(200, 5, 2)).toEqual({ totalAmount: 220, installmentValue: 110 });
  });

  it('0% de juros → total igual ao principal', () => {
    expect(computeLoanTotals(100, 0, 1)).toEqual({ totalAmount: 100, installmentValue: 100 });
  });

  it('à vista (1 período) a 5% → 105', () => {
    expect(computeLoanTotals(100, 5, 1)).toEqual({ totalAmount: 105, installmentValue: 105 });
  });

  it('arredonda para centavos', () => {
    const r = computeLoanTotals(100, 3.33, 3);
    expect(r.totalAmount).toBe(109.99);
    expect(r.installmentValue).toBe(36.66);
  });
});
