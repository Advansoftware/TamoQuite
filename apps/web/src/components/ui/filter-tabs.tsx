'use client';

import { cn } from '@/lib/utils';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/**
 * Scrollable chip row used as the status tabs on the list screens. Scrolls
 * horizontally instead of squeezing, so adding a tab never breaks phone layout.
 */
export function FilterTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: FilterOption<T>[];
  className?: string;
}) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1 -mx-1 px-1', className)}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'h-10 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border shrink-0',
              active
                ? 'border-neon bg-neon-dim text-neon'
                : 'border-border bg-surface text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn('ml-1.5', active ? 'text-neon/70' : 'text-muted-foreground/60')}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
