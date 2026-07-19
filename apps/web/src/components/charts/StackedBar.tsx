'use client';

import { CHART } from './chart-theme';

export interface StackSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * Part-to-whole in one horizontal bar. Segments are separated by a 2px gap in
 * the surface colour (never a border), and a legend is always present — identity
 * is never carried by colour alone.
 */
export function StackedBar({
  segments,
  formatValue = (v) => String(v),
}: {
  segments: StackSegment[];
  formatValue?: (v: number) => string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const visible = segments.filter((s) => s.value > 0);

  if (total === 0) {
    return <p className="text-xs text-muted-foreground py-4 text-center">Nada por aqui ainda.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex h-6 w-full rounded-lg overflow-hidden" style={{ gap: 2 }}>
        {visible.map((s) => (
          <div
            key={s.key}
            title={`${s.label}: ${formatValue(s.value)}`}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            className="first:rounded-l-lg last:rounded-r-lg"
          />
        ))}
      </div>

      {/* Legend doubles as the value list — the swatch carries identity, the text stays ink-coloured. */}
      <ul className="space-y-1.5">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-muted-foreground flex-1">{s.label}</span>
            <span className="font-semibold tabular-nums" style={{ color: CHART.textPrimary }}>
              {formatValue(s.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
