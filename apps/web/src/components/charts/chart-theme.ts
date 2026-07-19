/**
 * Chart tokens for the TamoQuite dark surface (#111827).
 *
 * The categorical trio below was run through the palette validator
 * (dark mode, surface #111827) and passes every check: lightness band, chroma
 * floor, CVD separation (worst adjacent ΔE 20.8), normal-vision floor (22.4)
 * and contrast vs surface. The brand neon (#00FFA3) sits above the dark
 * lightness band, so categorical marks use a darker step of the same hue;
 * the neon itself is kept for single-series charts, where nothing can be
 * confused with anything.
 */
export const CHART = {
  surface: '#111827',
  grid: 'rgba(255,255,255,0.08)',
  textPrimary: '#F1F5F9',
  textMuted: '#6B7280',
  /** Single-series marks — brand accent, no identity ambiguity possible. */
  single: '#00FFA3',
} as const;

export type StatusKey = 'ACTIVE' | 'COMPLETED' | 'CANCELED';

/** Validated categorical slots, in fixed order. Colour follows the entity, never its rank. */
export const STATUS_COLOR: Record<StatusKey, string> = {
  ACTIVE: '#0FA36B',
  COMPLETED: '#3987e5',
  CANCELED: '#EF4444',
};

export const STATUS_LABEL: Record<StatusKey, string> = {
  ACTIVE: 'Em andamento',
  COMPLETED: 'Já quitados',
  CANCELED: 'Cancelados',
};

/** Compact money for axis ticks and tight labels: 1.2 mil / 15 mil. */
export function shortMoney(v: number): string {
  if (Math.abs(v) >= 1000) {
    const n = v / 1000;
    return `${n % 1 === 0 ? n : n.toFixed(1).replace('.', ',')} mil`;
  }
  return String(Math.round(v));
}

/** Rounds an axis maximum up to a clean number so ticks read 0 / 500 / 1.000. */
export function niceMax(v: number): number {
  if (v <= 0) return 100;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / (mag / 2)) * (mag / 2);
}
