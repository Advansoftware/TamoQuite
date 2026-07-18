'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neon' | 'danger' | 'muted';

const TONES: Record<Tone, string> = {
  neon: 'bg-neon-dim text-neon hover:bg-neon-dim/70',
  danger: 'bg-danger/10 text-danger hover:bg-danger/20',
  muted: 'bg-surface-elevated text-muted-foreground hover:text-foreground',
};

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
}

/**
 * Compact labelled action for section headers and cards. Sized for touch first
 * (44px tall on mobile, tighter on desktop) so these read as buttons instead of
 * hover-only text links, which have no affordance on a phone.
 */
export function ActionButton({ tone = 'neon', className, ...props }: ActionButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl px-3',
        'h-11 sm:h-9 text-xs font-semibold whitespace-nowrap',
        'transition active:scale-[0.97] cursor-pointer disabled:opacity-60',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/**
 * Icon-only action with a real hit area. Use `-m-*` at the call site when the
 * larger box would otherwise push the surrounding layout around.
 */
export function IconButton({ tone = 'muted', className, ...props }: ActionButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center rounded-lg shrink-0',
        'h-10 w-10 sm:h-8 sm:w-8',
        'transition active:scale-[0.94] cursor-pointer disabled:opacity-60',
        tone === 'muted' ? 'text-muted-foreground hover:text-foreground hover:bg-secondary' : TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
