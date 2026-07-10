export type PaymentFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export const PAYMENT_FREQUENCIES: PaymentFrequency[] = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];

export function normalizeFrequency(value: unknown): PaymentFrequency {
  return PAYMENT_FREQUENCIES.includes(value as PaymentFrequency)
    ? (value as PaymentFrequency)
    : 'MONTHLY';
}

/**
 * Parses a date-only value ("YYYY-MM-DD" or an ISO/Date) and anchors it to
 * 12:00 UTC. Anchoring at noon keeps the calendar day stable across any timezone
 * within ±12h, so a due date never displays as the previous/next day.
 */
export function parseDateOnly(input: string | Date): Date {
  if (input instanceof Date) {
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 12, 0, 0));
  }
  const datePart = String(input).split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return new Date(input);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/**
 * Shifts a date by `count` payment periods according to the loan frequency.
 * WEEKLY = +7 days, BIWEEKLY = +15 days (quinzenal), MONTHLY = +1 calendar month.
 * Negative `count` moves backwards (used when undoing a roll). Uses UTC math so a
 * noon-UTC-anchored date stays on the same calendar day.
 */
export function addPeriods(base: Date, frequency: string, count: number): Date {
  const d = new Date(base);
  switch (frequency) {
    case 'WEEKLY':
      d.setUTCDate(d.getUTCDate() + 7 * count);
      break;
    case 'BIWEEKLY':
      d.setUTCDate(d.getUTCDate() + 15 * count);
      break;
    case 'MONTHLY':
    default:
      d.setUTCMonth(d.getUTCMonth() + count);
      break;
  }
  return d;
}
