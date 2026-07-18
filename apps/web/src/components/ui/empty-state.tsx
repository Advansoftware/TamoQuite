import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Optional call to action rendered below the text. */
  action?: React.ReactNode;
  className?: string;
}

/** Shared "nothing here yet" block used by every list and detail screen. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12 space-y-3', className)}>
      <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center mx-auto">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
        <p className={description ? 'text-sm font-medium text-foreground' : 'text-sm text-muted-foreground'}>
          {title}
        </p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
      {action && <div className="flex flex-col items-center gap-2 pt-1">{action}</div>}
    </div>
  );
}
