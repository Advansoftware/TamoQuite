'use client';

import { useState } from 'react';
import { Bell, X, CreditCard } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { formatDate } from '@/lib/helpers';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ActionButton, IconButton } from '@/components/ui/action-button';
import { useSubscription, useOpenBillingPortal, useUpdateNotifyDays } from '@/features/subscription/use-subscription';

type Tone = 'warning' | 'danger' | 'info';

interface AppNotification {
  id: string;
  title: string;
  body: string;
  tone: Tone;
}

const DISMISS_KEY = 'tq_dismissed_notifications';

function getDismissed(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]');
  } catch {
    return [];
  }
}

function daysUntil(unixSec: number): number {
  return Math.ceil((unixSec * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
}

const toneDot: Record<Tone, string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-neon',
};

export function NotificationBell() {
  const user = useAppStore((s) => s.user);
  const { data: sub } = useSubscription();
  const openPortalMut = useOpenBillingPortal();
  const updateDays = useUpdateNotifyDays();
  const [dismissed, setDismissed] = useState<string[]>(getDismissed);
  const [open, setOpen] = useState(false);
  const notifyDays = user?.notifyBeforeSubExpiryDays ?? 2;
  const [daysInput, setDaysInput] = useState(() => String(notifyDays));
  const savingDays = updateDays.isPending;

  // ---- Build the notification list from available data ----
  const notifications: AppNotification[] = [];
  if (sub?.hasSubscription && sub.currentPeriodEnd) {
    const d = daysUntil(sub.currentPeriodEnd);
    if (d >= 0 && d <= notifyDays) {
      const when = formatDate(new Date(sub.currentPeriodEnd * 1000).toISOString());
      const dayLabel = d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `em ${d} dias`;
      const id = `sub-${sub.currentPeriodEnd}`;
      if (sub.status === 'trialing') {
        notifications.push({
          id,
          title: 'Seu teste grátis está acabando',
          body: `O teste termina ${dayLabel} (${when}). Depois disso, a cobrança de R$ 14,90/mês é iniciada.`,
          tone: 'warning',
        });
      } else if (sub.cancelAtPeriodEnd) {
        notifications.push({
          id,
          title: 'Sua assinatura vai encerrar',
          body: `Ela será encerrada ${dayLabel} (${when}). Reative para não perder o acesso.`,
          tone: 'danger',
        });
      } else {
        notifications.push({
          id,
          title: 'Sua assinatura vai renovar',
          body: `A renovação de R$ 14,90 acontece ${dayLabel} (${when}).`,
          tone: 'info',
        });
      }
    }
  }

  const visible = notifications.filter((n) => !dismissed.includes(n.id));

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const openPortal = async () => {
    try {
      await openPortalMut.mutateAsync();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao abrir o portal de assinatura');
    }
  };

  const saveDays = async () => {
    const n = Number(daysInput);
    if (!Number.isFinite(n) || n < 1 || n > 30) { toast.error('Escolha entre 1 e 30 dias.'); return; }
    try {
      await updateDays.mutateAsync(n);
      toast.success('Preferência salva.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar preferência');
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setDaysInput(String(notifyDays)); }}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-secondary hover:bg-surface-elevated text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Notificações"
        >
          <Bell className="w-4 h-4" />
          {visible.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold text-background bg-danger rounded-full border-2 border-background">
              {visible.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-surface border-border text-foreground rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border">
          <p className="text-sm font-bold text-foreground">Notificações</p>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="text-xs text-muted-foreground p-6 text-center">Nenhuma notificação no momento. 🎉</p>
          ) : (
            visible.map((n) => (
              <div key={n.id} className="p-3 border-b border-border/60 flex gap-2.5">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${toneDot[n.tone]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                  <ActionButton onClick={openPortal} className="mt-1.5 h-9 sm:h-8 px-2.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    Gerenciar assinatura
                  </ActionButton>
                </div>
                <IconButton onClick={() => dismiss(n.id)} title="Dispensar" aria-label="Dispensar" className="-mr-1.5 -mt-1.5">
                  <X className="w-4 h-4" />
                </IconButton>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-border space-y-1.5 bg-surface-elevated/30">
          <label className="text-[11px] text-muted-foreground block">
            Avisar sobre a assinatura com quantos dias de antecedência
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={30}
              value={daysInput}
              onChange={(e) => setDaysInput(e.target.value)}
              className="w-16 h-8 bg-surface-elevated border border-border rounded-lg px-2 text-sm text-foreground focus:outline-none focus:border-neon/50"
            />
            <span className="text-[11px] text-muted-foreground">dias antes</span>
            <button
              onClick={saveDays}
              disabled={savingDays}
              className="ml-auto h-8 px-3 bg-neon text-background rounded-lg text-xs font-semibold hover:bg-neon/90 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {savingDays ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
