'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, CheckCheck, Check, Clock, AlertTriangle, ChevronDown, MessageSquare } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/helpers';
import {
  useChargeHistory,
  useChargeHistorySummary,
  type ChargeHistoryItem,
} from '@/features/billing/use-charge-history';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingBlock, Spinner } from '@/components/ui/spinner';
import { ActionButton } from '@/components/ui/action-button';
import { cn } from '@/lib/utils';

const TYPE_LABEL: Record<string, string> = {
  REMINDER: 'Lembrete',
  DUE: 'Vencimento',
  OVERDUE: 'Atraso',
  MANUAL: 'Manual',
};

const FILTERS: { value: string | undefined; label: string }[] = [
  { value: undefined, label: 'Todas' },
  { value: 'SENT', label: 'Enviadas' },
  { value: 'QUEUED', label: 'Na fila' },
  { value: 'FAILED', label: 'Falharam' },
];

/** One line telling the user exactly how far the message got. */
function DeliveryPill({ item }: { item: ChargeHistoryItem }) {
  if (item.status === 'FAILED') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-danger">
        <AlertTriangle className="w-3.5 h-3.5" /> Falhou
      </span>
    );
  }
  if (item.status === 'QUEUED') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warning">
        <Clock className="w-3.5 h-3.5" /> Na fila
      </span>
    );
  }
  if (item.deliveryStatus === 'READ') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neon">
        <CheckCheck className="w-3.5 h-3.5" /> Lida
      </span>
    );
  }
  if (item.deliveryStatus === 'DELIVERED') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground">
        <CheckCheck className="w-3.5 h-3.5" /> Entregue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
      <Check className="w-3.5 h-3.5" /> Enviada
    </span>
  );
}

function ChargeCard({ item }: { item: ChargeHistoryItem }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const when = new Date(item.sentAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-4 flex items-start gap-3 cursor-pointer"
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{item.borrowerName}</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-elevated text-muted-foreground font-medium">
              {TYPE_LABEL[item.type] ?? item.type}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Parcela {item.installmentNumber} · {formatCurrency(item.amount)} · venc. {formatDate(item.dueDate)}
          </p>
          <div className="flex items-center gap-2.5 pt-0.5">
            <DeliveryPill item={item} />
            <span className="text-[11px] text-muted-foreground">{when}</span>
          </div>
        </div>
        <ChevronDown
          className={cn('w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-3">
          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">Mensagem enviada</p>
            <p className="text-xs text-foreground whitespace-pre-wrap bg-surface-elevated rounded-xl p-3 leading-relaxed">
              {item.message}
            </p>
          </div>
          {item.error && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-1.5">Erro</p>
              <p className="text-xs text-danger bg-danger/10 rounded-xl p-3">{item.error}</p>
            </div>
          )}
          <ActionButton onClick={() => router.push(`/loans/${item.loanId}`)} className="w-full sm:w-auto">
            Ver contrato
          </ActionButton>
        </div>
      )}
    </div>
  );
}

export function ChargeHistoryView() {
  const [status, setStatus] = useState<string | undefined>(undefined);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useChargeHistory(status);
  const { data: summary } = useChargeHistorySummary();

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-4 pb-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">Cobranças enviadas</h2>
        <p className="text-sm text-muted-foreground">
          Tudo que o sistema enviou pelos seus contratos, com a mensagem e o status de entrega.
        </p>
      </div>

      {summary && summary.total > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface rounded-xl p-3 border border-border text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Enviadas</p>
            <p className="text-sm font-bold text-foreground">{summary.sent}</p>
          </div>
          <div className="bg-surface rounded-xl p-3 border border-border text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Na fila</p>
            <p className="text-sm font-bold text-warning">{summary.queued}</p>
          </div>
          <div className="bg-surface rounded-xl p-3 border border-border text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Falharam</p>
            <p className="text-sm font-bold text-danger">{summary.failed}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const active = status === f.value;
          return (
            <button
              key={f.label}
              type="button"
              onClick={() => setStatus(f.value)}
              className={cn(
                'h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border',
                active
                  ? 'border-neon bg-neon-dim text-neon'
                  : 'border-border bg-surface text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nenhuma cobrança enviada ainda"
          description="Quando o sistema enviar uma cobrança, ela aparece aqui com a mensagem e o status."
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ChargeCard key={item.id} item={item} />
          ))}
          {hasNextPage && (
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full h-11 rounded-xl bg-surface border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isFetchingNextPage ? <Spinner size="sm" /> : (<><Send className="w-4 h-4" /> Carregar mais</>)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
