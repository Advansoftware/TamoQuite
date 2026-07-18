import { getStatusLabel, getStatusBgColor } from '@/lib/helpers';
import { cn } from '@/lib/utils';

/**
 * Installment status pill. Always derives its colour from the status, which also
 * fixes the dashboard's overdue list where the tone was hard-coded.
 */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap',
        getStatusBgColor(status),
        className,
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}
