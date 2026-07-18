import { cn } from '@/lib/utils';

type StatTone = 'default' | 'neon' | 'warning' | 'danger';

const TONES: Record<StatTone, string> = {
  default: 'text-foreground',
  neon: 'text-neon',
  warning: 'text-warning',
  danger: 'text-danger',
};

/** Compact labelled figure used in the summary grids. */
export function StatTile({
  label,
  value,
  tone = 'default',
  className,
}: {
  label: string;
  value: string;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <div className={cn('bg-surface rounded-xl p-3 border border-border text-center', className)}>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className={cn('text-xs font-bold truncate', TONES[tone])}>{value}</p>
    </div>
  );
}
