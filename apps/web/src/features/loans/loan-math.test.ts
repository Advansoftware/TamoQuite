import { describe, it, expect } from 'vitest';
import { calcFromRate, calcRateFromTotal, computeLoan } from './loan-math';

describe('calcFromRate — juros simples sobre o principal', () => {
  it('R$200 a 5%/período por 2 períodos = R$220 (parcela R$110)', () => {
    const { total, pmt } = calcFromRate(200, 0.05, 2);
    expect(total).toBeCloseTo(220, 6);
    expect(pmt).toBeCloseTo(110, 6);
  });

  it('0% de juros → total igual ao principal', () => {
    const { total, pmt } = calcFromRate(100, 0, 3);
    expect(total).toBeCloseTo(100, 6);
    expect(pmt).toBeCloseTo(100 / 3, 6);
  });

  it('à vista (1 período) a 5% = R$105', () => {
    const { total, pmt } = calcFromRate(100, 0.05, 1);
    expect(total).toBeCloseTo(105, 6);
    expect(pmt).toBeCloseTo(105, 6);
  });
});

describe('calcRateFromTotal — inverso', () => {
  it('R$220 sobre R$200 em 2 períodos = 5%', () => {
    expect(calcRateFromTotal(200, 220, 2)).toBe(5);
  });

  it('à vista: R$120 sobre R$100 = 20%', () => {
    expect(calcRateFromTotal(100, 120, 1)).toBe(20);
  });

  it('total igual ao principal = 0%', () => {
    expect(calcRateFromTotal(100, 100, 1)).toBe(0);
  });

  it('principal 0 → 0 (sem divisão por zero)', () => {
    expect(calcRateFromTotal(0, 100, 1)).toBe(0);
  });
});

describe('computeLoan — resolver de alto nível', () => {
  it('BY_RATE: 200 / 5% / 2', () => {
    const r = computeLoan({ principal: 200, installments: 2, mode: 'BY_RATE', ratePercent: 5 });
    expect(r.total).toBeCloseTo(220, 6);
    expect(r.pmt).toBeCloseTo(110, 6);
    expect(r.ratePercent).toBe(5);
  });

  it('BY_TOTAL: 220 em 2 → 5% embutido', () => {
    const r = computeLoan({ principal: 200, installments: 2, mode: 'BY_TOTAL', targetTotal: 220 });
    expect(r.total).toBeCloseTo(220, 6);
    expect(r.pmt).toBeCloseTo(110, 6);
    expect(r.ratePercent).toBe(5);
  });

  it('à vista sem juros (total vazio) → recebe o mesmo valor', () => {
    const r = computeLoan({ principal: 100, installments: 1, mode: 'BY_TOTAL' });
    expect(r.total).toBeCloseTo(100, 6);
    expect(r.ratePercent).toBe(0);
  });

  it('à vista BY_RATE 5% = 105', () => {
    const r = computeLoan({ principal: 100, installments: 1, mode: 'BY_RATE', ratePercent: 5 });
    expect(r.total).toBeCloseTo(105, 6);
    expect(r.ratePercent).toBe(5);
  });

  it('entradas inválidas → zeros', () => {
    expect(computeLoan({ principal: 0, installments: 2, mode: 'BY_RATE', ratePercent: 5 })).toEqual({ total: 0, pmt: 0, ratePercent: 0 });
  });
});
