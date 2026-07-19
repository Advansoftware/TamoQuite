'use client';

import { useState } from 'react';
import { Table2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Frame every chart sits in: a plain-language title, an optional one-line
 * explanation for non-technical readers, and a table view of the same data
 * (so nothing is gated behind reading a chart).
 */
export function ChartCard({
  title,
  hint,
  table,
  className,
  children,
}: {
  title: string;
  hint?: string;
  /** Rows shown in the "ver números" view — same data as the chart. */
  table?: { label: string; value: string }[];
  className?: string;
  children: React.ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className={cn('bg-surface rounded-2xl border border-border p-4 space-y-3', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {hint && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{hint}</p>}
        </div>
        {table && table.length > 0 && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            title={showTable ? 'Ver gráfico' : 'Ver números'}
            aria-label={showTable ? 'Ver gráfico' : 'Ver números'}
            className="shrink-0 h-10 w-10 sm:h-8 sm:w-8 rounded-lg bg-surface-elevated text-muted-foreground hover:text-foreground flex items-center justify-center transition cursor-pointer"
          >
            {showTable ? <X className="w-4 h-4" /> : <Table2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {showTable && table ? (
        <table className="w-full text-xs">
          <tbody>
            {table.map((r) => (
              <tr key={r.label} className="border-b border-border/60 last:border-0">
                <td className="py-2 text-muted-foreground">{r.label}</td>
                <td className="py-2 text-right font-medium text-foreground tabular-nums">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        children
      )}
    </div>
  );
}
