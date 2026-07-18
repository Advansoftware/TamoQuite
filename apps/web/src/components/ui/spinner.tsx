import { cn } from '@/lib/utils';

/** The app's loading indicator. Was duplicated inline in nine places. */
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className={cn(
        'border-2 border-neon/30 border-t-neon rounded-full animate-spin',
        size === 'sm' ? 'w-6 h-6' : 'w-8 h-8',
        className,
      )}
    />
  );
}

/** Centered spinner for list/section loading states. */
export function LoadingBlock({ className }: { className?: string }) {
  return (
    <div className={cn('flex justify-center py-12', className)}>
      <Spinner />
    </div>
  );
}
