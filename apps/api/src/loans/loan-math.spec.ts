import { describe, it, expect } from 'vitest';
import { computeLoanTotals, splitIntoInstallments } from './loan-math';

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

describe('splitIntoInstallments — a soma das parcelas fecha com o total', () => {
  const sum = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) * 100) / 100;

  it('R$250 em 3x → 83,34 + 83,33 + 83,33 = 250 (e não 249,99)', () => {
    const parts = splitIntoInstallments(250, 3);
    expect(parts).toEqual([83.34, 83.33, 83.33]);
    expect(sum(parts)).toBe(250);
  });

  it('divisão exata não ganha centavo sobrando', () => {
    expect(splitIntoInstallments(220, 2)).toEqual([110, 110]);
  });

  it('parcela única recebe o total inteiro', () => {
    expect(splitIntoInstallments(250, 1)).toEqual([250]);
  });

  it('a soma fecha para qualquer combinação de total e nº de parcelas', () => {
    for (const total of [250, 100.05, 1000, 333.33, 5500, 7.77]) {
      for (const count of [1, 2, 3, 4, 6, 7, 12, 36]) {
        expect(sum(splitIntoInstallments(total, count))).toBe(total);
      }
    }
  });
});
