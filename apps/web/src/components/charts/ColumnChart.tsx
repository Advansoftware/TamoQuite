'use client';

import { useState } from 'react';
import { CHART, niceMax, shortMoney } from './chart-theme';

export interface ColumnDatum {
  label: string;
  value: number;
}

/**
 * Single-series columns over time. One colour (nothing to tell apart), a
 * recessive grid, and a value label only on the tallest bar — a number on every
 * bar reads as noise. Tap or hover any bar for the exact figure.
 */
export function ColumnChart({
  data,
  formatValue = (v) => shortMoney(v),
  height = 180,
}: {
  data: ColumnDatum[];
  formatValue?: (v: number) => string;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);

  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);
  const allZero = data.every((d) => d.value === 0);
  const ticks = [max, max / 2, 0];

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* Y axis — clean numbers only; they carry what isn't directly labelled. */}
        <div
          className="flex flex-col justify-between text-[10px] tabular-nums shrink-0 text-right"
          style={{ height, color: CHART.textMuted }}
        >
          {ticks.map((t) => (
            <span key={t}>{shortMoney(t)}</span>
          ))}
        </div>

        <div className="relative flex-1 min-w-0" style={{ height }}>
          {/* Gridlines: hairline, solid, recessive */}
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute left-0 right-0 border-t"
              style={{ borderColor: CHART.grid, top: `${((max - t) / max) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end justify-between gap-[2px]">
            {data.map((d, i) => {
              const pct = max > 0 ? (d.value / max) * 100 : 0;
              const isActive = active === i;
              return (
                <button
                  key={d.label + i}
                  type="button"
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onClick={() => setActive(isActive ? null : i)}
                  aria-label={`${d.label}: ${formatValue(d.value)}`}
                  className="relative flex-1 h-full flex items-end justify-center cursor-pointer group"
                >
                  {/* the bar itself — capped thickness, rounded data-end, square at baseline */}
                  <div
                    className="w-full max-w-[24px] rounded-t transition-opacity"
                    style={{
                      height: `${Math.max(pct, d.value > 0 ? 2 : 0)}%`,
                      background: CHART.single,
                      opacity: active === null || isActive ? 1 : 0.45,
                    }}
                  />
                  {/* direct label on the peak only */}
                  {!allZero && i === peak && active === null && (
                    <span
                      className="absolute text-[10px] font-semibold tabular-nums whitespace-nowrap"
                      style={{ bottom: `calc(${pct}% + 4px)`, color: CHART.textPrimary }}
                    >
                      {formatValue(d.value)}
                    </span>
                  )}
                  {isActive && (
                    <span
                      className="absolute z-10 px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap pointer-events-none border"
                      style={{
                        bottom: `calc(${pct}% + 6px)`,
                        background: CHART.surface,
                        borderColor: CHART.grid,
                        color: CHART.textPrimary,
                      }}
                    >
                      {formatValue(d.value)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* X axis */}
      <div className="flex gap-2">
        <div className="shrink-0 invisible text-[10px]">{shortMoney(max)}</div>
        <div className="flex-1 flex justify-between gap-[2px]">
          {data.map((d, i) => (
            <span
              key={d.label + i}
              className="flex-1 text-center text-[10px] capitalize"
              style={{ color: active === i ? CHART.textPrimary : CHART.textMuted }}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
