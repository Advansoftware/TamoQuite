export type PaymentFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export const PAYMENT_FREQUENCIES: PaymentFrequency[] = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];

export function normalizeFrequency(value: unknown): PaymentFrequency {
  return PAYMENT_FREQUENCIES.includes(value as PaymentFrequency)
    ? (value as PaymentFrequency)
    : 'MONTHLY';
}

/**
 * Shifts a date by `count` payment periods according to the loan frequency.
 * WEEKLY = +7 days, BIWEEKLY = +15 days (quinzenal), MONTHLY = +1 calendar month.
 * Negative `count` moves backwards (used when undoing a roll).
 */
export function addPeriods(base: Date, frequency: string, count: number): Date {
  const d = new Date(base);
  switch (frequency) {
    case 'WEEKLY':
      d.setDate(d.getDate() + 7 * count);
      break;
    case 'BIWEEKLY':
      d.setDate(d.getDate() + 15 * count);
      break;
    case 'MONTHLY':
    default:
      d.setMonth(d.getMonth() + count);
      break;
  }
  return d;
}
