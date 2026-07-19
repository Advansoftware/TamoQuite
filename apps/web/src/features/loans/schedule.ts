// Due-date schedule for a new contract. Mirrors the backend's period.util:
// WEEKLY = +7 days, BIWEEKLY = +15 days, MONTHLY = +1 calendar month, with the
// first installment falling on the start date itself.
//
// Everything here is plain "YYYY-MM-DD" in and out. Dates are built in UTC so a
// contract created late at night never shifts a day relative to what the server
// stores, and the strings feed <input type="date"> directly.

/** Adds `count` periods to a YYYY-MM-DD date, returning YYYY-MM-DD. */
export function addPeriods(date: string, frequency: string, count: number): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  switch (frequency) {
    case 'WEEKLY':
      dt.setUTCDate(dt.getUTCDate() + 7 * count);
      break;
    case 'BIWEEKLY':
      dt.setUTCDate(dt.getUTCDate() + 15 * count);
      break;
    default:
      dt.setUTCMonth(dt.getUTCMonth() + count);
      break;
  }

  return dt.toISOString().split('T')[0];
}

/** The full schedule: installment 1 on `startDate`, the rest one period apart. */
export function buildSchedule(startDate: string, frequency: string, count: number): string[] {
  if (!startDate || count <= 0) return [];
  return Array.from({ length: count }, (_v, idx) => addPeriods(startDate, frequency, idx));
}

/** Formats a YYYY-MM-DD as DD/MM/YYYY for display, without touching timezones. */
export function formatDateOnly(date: string): string {
  const [y, m, d] = date.split('-');
  return y && m && d ? `${d}/${m}/${y}` : date;
}
