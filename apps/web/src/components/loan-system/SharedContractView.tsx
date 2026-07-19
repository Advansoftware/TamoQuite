'use client';

import { useQuery } from '@tanstack/react-query';
import { Zap, ShieldCheck, MessageCircle, FileX2 } from 'lucide-react';
import { apiUrl } from '@/lib/config';
import { formatCurrency, formatDate, formatPhone } from '@/lib/helpers';
import { StatusBadge } from './StatusBadge';
import { StatTile } from '@/components/ui/stat-tile';
import { LoadingBlock } from '@/components/ui/spinner';

interface SharedInstallment {
  number: number;
  dueDate: string;
  amount: number;
  status: string;
  paidAmount: number;
  paidAt: string | null;
  payments: { amount: number; date: string }[];
}

interface SharedContract {
  lender: { name: string; contactPhone: string | null };
  borrower: { name: string };
  contract: {
    originalAmount: number;
    totalAmount: number;
    interestRate: number;
    installmentCount: number;
    startDate: string;
    paymentFrequency: string;
    status: string;
    createdAt: string;
  };
  summary: {
    totalPaid: number;
    remaining: number;
    paidCount: number;
    nextDueDate: string | null;
    nextDueAmount: number | null;
    overdueCount: number;
  };
  installments: SharedInstallment[];
}

const FREQUENCY_LABEL: Record<string, string> = {
  WEEKLY: 'Toda semana',
  BIWEEKLY: 'A cada 15 dias',
  MONTHLY: 'Todo mês',
};

/**
 * The page a debtor sees when the lender shares a contract link. Read-only by
 * construction: it talks to the public endpoint, sends no token, and offers no
 * action that changes anything. Wording assumes the reader is the debtor.
 */
export function SharedContractView({ token }: { token: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['share', token],
    queryFn: async (): Promise<SharedContract> => {
      const res = await fetch(apiUrl(`/api/public/share/${token}`));
      if (!res.ok) throw new Error('unavailable');
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <Shell>
        <LoadingBlock />
      </Shell>
    );
  }

  if (isError || !data) {
    return (
      <Shell>
        <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-3">
          <FileX2 className="w-10 h-10 text-muted-foreground mx-auto" />
          <h1 className="text-lg font-bold text-foreground">Link indisponível</h1>
          <p className="text-sm text-muted-foreground">
            Este link foi desativado por quem compartilhou, ou o endereço está incorreto.
            Peça um novo link para a pessoa que enviou.
          </p>
        </div>
      </Shell>
    );
  }

  const { lender, borrower, contract, summary, installments } = data;
  const canceled = contract.status === 'CANCELED';
  const completed = contract.status === 'COMPLETED';

  return (
    <Shell>
      <div className="space-y-4">
        {/* Who owes whom — the first question a shared link has to answer. */}
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Contrato de</p>
          <h1 className="text-xl font-bold text-foreground">{borrower.name}</h1>
          <p className="text-xs text-muted-foreground pt-1">
            Criado em {formatDate(contract.createdAt)}
          </p>
        </div>

        {canceled && (
          <Banner tone="danger">
            Este contrato foi cancelado. Ele fica registrado aqui apenas para consulta.
          </Banner>
        )}
        {completed && !canceled && (
          <Banner tone="neon">Tudo quitado. Não há mais parcelas em aberto.</Banner>
        )}
        {!canceled && !completed && summary.overdueCount > 0 && (
          <Banner tone="danger">
            {summary.overdueCount === 1
              ? '1 parcela está atrasada.'
              : `${summary.overdueCount} parcelas estão atrasadas.`}
          </Banner>
        )}

        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Valor total" value={formatCurrency(contract.totalAmount)} />
          <StatTile label="Já pago" value={formatCurrency(summary.totalPaid)} tone="neon" />
          <StatTile
            label="Falta pagar"
            value={formatCurrency(summary.remaining)}
            tone={summary.remaining > 0 ? 'warning' : 'default'}
          />
          <StatTile
            label="Parcelas pagas"
            value={`${summary.paidCount} de ${contract.installmentCount}`}
          />
        </div>

        {!canceled && !completed && summary.nextDueDate && (
          <div className="bg-surface border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Próximo pagamento</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(summary.nextDueAmount ?? 0)}
            </p>
            <p className="text-sm text-muted-foreground">em {formatDate(summary.nextDueDate)}</p>
          </div>
        )}

        <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Como foi combinado</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Valor emprestado" value={formatCurrency(contract.originalAmount)} />
            <Row label="Valor a pagar" value={formatCurrency(contract.totalAmount)} />
            <Row
              label="Parcelas"
              value={`${contract.installmentCount}x de ${formatCurrency(
                contract.totalAmount / contract.installmentCount,
              )}`}
            />
            <Row
              label="Frequência"
              value={FREQUENCY_LABEL[contract.paymentFrequency] ?? contract.paymentFrequency}
            />
            <Row label="Primeiro vencimento" value={formatDate(contract.startDate)} />
          </dl>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-4 space-y-2">
          <h2 className="text-sm font-semibold text-foreground mb-1">Parcelas</h2>
          {installments.map((inst) => (
            <div
              key={inst.number}
              className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Parcela {inst.number}
                  <span className="text-muted-foreground font-normal"> · {formatDate(inst.dueDate)}</span>
                </p>
                {inst.paidAmount > 0 && inst.status !== 'PAID' && (
                  <p className="text-xs text-muted-foreground">
                    Pago {formatCurrency(inst.paidAmount)} de {formatCurrency(inst.amount)}
                  </p>
                )}
                {inst.status === 'PAID' && inst.paidAt && (
                  <p className="text-xs text-muted-foreground">Pago em {formatDate(inst.paidAt)}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {formatCurrency(inst.amount)}
                </span>
                <StatusBadge status={inst.status} />
              </div>
            </div>
          ))}
        </div>

        {lender.contactPhone && (
          <a
            href={`https://wa.me/${lender.contactPhone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 h-12 w-full rounded-xl bg-surface border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-neon" />
            Falar com {lender.name} ({formatPhone(lender.contactPhone)})
          </a>
        )}

        {/* Icon is inline so it stays glued to the text when it wraps on narrow phones. */}
        <p className="text-xs text-muted-foreground text-center text-balance pt-2">
          <ShieldCheck className="w-3.5 h-3.5 inline-block align-[-2px] mr-1.5" />
          Página somente de consulta. Nada pode ser alterado por aqui.
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neon-dim flex items-center justify-center">
            <Zap className="w-4 h-4 text-neon" />
          </div>
          <span className="font-bold text-foreground">TamoQuite</span>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-4">{children}</main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function Banner({ tone, children }: { tone: 'danger' | 'neon'; children: React.ReactNode }) {
  const cls =
    tone === 'danger'
      ? 'bg-danger/10 border-danger/20 text-danger'
      : 'bg-neon-dim border-neon/20 text-neon';
  return <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${cls}`}>{children}</div>;
}
