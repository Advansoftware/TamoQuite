'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { apiPost, getApiError } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useBorrower } from '@/features/borrowers/use-borrowers';
import { formatPhone, formatCurrency, formatDate, generateWhatsAppLink } from '@/lib/helpers';
import { Plus, FileText, ArrowRight, ChevronRight, MessageCircle, AlertTriangle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/components/ui/action-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { CreateLoanDialog } from './CreateLoanDialog';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { StatTile } from '@/components/ui/stat-tile';

export function BorrowerDetailView() {
  const params = useParams();
  const router = useRouter();
  const selectedBorrowerId = params.id as string;
  const qc = useQueryClient();
  const { data: borrower, isLoading: loading } = useBorrower(selectedBorrowerId);
  const [createLoanOpen, setCreateLoanOpen] = useState(false);
  // null = usuário ainda não mexeu → todas as atrasadas ficam pré-selecionadas.
  const [selectedOverdueIds, setSelectedOverdueIds] = useState<string[] | null>(null);
  const [sendingConsolidated, setSendingConsolidated] = useState(false);

  const refreshBorrower = () => {
    qc.invalidateQueries({ queryKey: qk.borrower(selectedBorrowerId) });
    qc.invalidateQueries({ queryKey: qk.loans });
    qc.invalidateQueries({ queryKey: qk.dashboard });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (!borrower) return null;

  const totalLent = borrower.loans.reduce(
    (sum, l) => sum + l.installments.reduce((s, i) => s + i.amount, 0),
    0
  );
  const totalReceived = borrower.loans.reduce(
    (sum, l) => sum + l.installments.reduce((s, i) => s + (i.paidAmount || 0), 0),
    0
  );
  const totalRemaining = totalLent - totalReceived;

  const overdueInstallments = borrower.loans
    .flatMap((l) => l.installments.map((i) => ({ ...i, loanId: l.id })))
    .filter((i) => i.status === 'OVERDUE');
  const hasOverdue = overdueInstallments.length > 0;
  const totalOverdue = overdueInstallments.reduce((sum, i) => sum + (i.amount - (i.paidAmount || 0)), 0);

  // Default selection = all overdue, until the user toggles anything.
  const allOverdueIds = overdueInstallments.map((i) => i.id);
  const selectedIds = selectedOverdueIds ?? allOverdueIds;

  const buildConsolidatedMessage = (): string | null => {
    if (!borrower) return null;
    const selectedInsts = overdueInstallments.filter((i) => selectedIds.includes(i.id));
    if (selectedInsts.length === 0) return null;
    const totalAmount = selectedInsts.reduce((sum, i) => sum + (i.amount - (i.paidAmount || 0)), 0);

    let msg = `Olá ${borrower.name}! 💰 Passando para lembrar das parcelas em aberto:\n\n`;
    selectedInsts.forEach((i) => {
      const loanIndex = borrower.loans.findIndex((l) => l.id === i.loanId);
      const loanNumber = borrower.loans.length - loanIndex;
      const remaining = i.amount - (i.paidAmount || 0);
      msg += `• *Contrato #${loanNumber} — Parcela #${i.installmentNumber}* (Venceu dia ${formatDate(i.dueDate)}): *${formatCurrency(remaining)}*\n`;
    });
    msg += `\n*Total em aberto selecionado: ${formatCurrency(totalAmount)}*\n\nSe precisar da chave Pix ou do código de pagamento, me avise aqui. Tamo junto! 🤝`;
    return msg;
  };

  const openConsolidatedWhatsApp = () => {
    const msg = buildConsolidatedMessage();
    if (!msg || !borrower) return;
    window.open(generateWhatsAppLink(borrower.whatsapp, msg), '_blank');
  };

  const sendConsolidatedNow = async () => {
    const msg = buildConsolidatedMessage();
    if (!msg || !borrower) return;
    setSendingConsolidated(true);
    try {
      const res = await apiPost('/api/settings/billing/charge-message', {
        borrowerId: borrower.id,
        message: msg,
      });
      const errMsg = await getApiError(res);
      if (errMsg) throw new Error(errMsg);
      toast.success('Cobrança enviada!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar cobrança');
    } finally {
      setSendingConsolidated(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Borrower Info */}
      <div className="bg-surface rounded-2xl p-4 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-xl bg-neon-dim flex items-center justify-center">
            <span className="text-neon font-bold text-lg">
              {borrower.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold text-foreground">{borrower.name}</p>
            <p className="text-sm text-muted-foreground">{formatPhone(borrower.whatsapp)}</p>
          </div>
          <a
            href={`https://wa.me/55${borrower.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-xl bg-whatsapp/10 hover:bg-whatsapp/20 text-whatsapp flex items-center justify-center transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
          </a>
        </div>
        {borrower.notes && (
          <div className="bg-surface-elevated rounded-xl p-3 text-sm text-muted-foreground">
            {borrower.notes}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatTile label="Total Emprestado" value={formatCurrency(totalLent)} />
        <StatTile label="Total Recebido" value={formatCurrency(totalReceived)} tone="neon" />
        <StatTile label="Saldo Devedor" value={formatCurrency(totalRemaining)} tone="warning" />
        <StatTile label="Saldo em Atraso" value={formatCurrency(totalOverdue)} tone="danger" />
      </div>

      {/* Cobrança Consolidada */}
      {hasOverdue && (
        <div className="bg-danger/10 border border-danger/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 animate-pulse" />
            <h3 className="text-sm font-bold text-danger">Cobrança de Parcelas Atrasadas</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Selecione as parcelas que deseja cobrar de uma vez só via WhatsApp:
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {overdueInstallments.map((inst) => {
              const isChecked = selectedIds.includes(inst.id);
              const loanIndex = borrower.loans.findIndex((l) => l.id === inst.loanId);
              const loanNumber = borrower.loans.length - loanIndex;
              const remaining = inst.amount - (inst.paidAmount || 0);

              return (
                <label
                  key={inst.id}
                  className="flex items-center justify-between p-2.5 bg-surface border border-border/50 hover:bg-secondary/20 rounded-xl cursor-pointer text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setSelectedOverdueIds((prev) => (prev ?? allOverdueIds).filter((id) => id !== inst.id));
                        } else {
                          setSelectedOverdueIds((prev) => [...(prev ?? allOverdueIds), inst.id]);
                        }
                      }}
                      className="accent-danger h-4 w-4 shrink-0 rounded cursor-pointer"
                    />
                    <div>
                      <p className="font-semibold text-foreground">Contrato #{loanNumber} — Parcela #{inst.installmentNumber}</p>
                      <p className="text-muted-foreground text-[10px]">Venceu em {formatDate(inst.dueDate)}</p>
                    </div>
                  </div>
                  <span className="font-bold text-danger shrink-0">{formatCurrency(remaining)}</span>
                </label>
              );
            })}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={selectedIds.length === 0 || sendingConsolidated}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-danger text-white hover:bg-danger/95 font-bold rounded-xl text-xs transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer outline-none"
              >
                {sendingConsolidated ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                ) : (
                  <MessageCircle className="w-4 h-4 shrink-0" />
                )}
                Enviar Cobrança Consolidada ({selectedIds.length})
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="bg-surface border-border text-foreground w-[var(--radix-dropdown-menu-trigger-width)]">
              <DropdownMenuItem
                onClick={sendConsolidatedNow}
                className="cursor-pointer focus:bg-secondary/40"
              >
                <Send className="w-4 h-4 text-neon" />
                Enviar cobrança agora
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={openConsolidatedWhatsApp}
                className="cursor-pointer focus:bg-secondary/40"
              >
                <MessageCircle className="w-4 h-4 text-whatsapp" />
                Abrir no meu WhatsApp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Loans */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-neon" />
            Contratos ({borrower.loans.length})
          </h3>
          <ActionButton onClick={() => setCreateLoanOpen(true)}>
            <Plus className="w-4 h-4" />
            Novo
          </ActionButton>
        </div>

        {borrower.loans.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum contrato ativo"
            className="py-8"
            action={
              <ActionButton onClick={() => setCreateLoanOpen(true)} className="px-4">
                <Plus className="w-4 h-4" />
                Criar primeiro contrato
              </ActionButton>
            }
          />
        ) : (
          <div className="space-y-2">
            {borrower.loans.map((loan, index) => {
              const paidCount = loan.installments.filter((i) => i.status === 'PAID').length;
              const paidAmount = loan.installments.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
              const loanTotalAmount = loan.installments.reduce((sum, i) => sum + i.amount, 0);
              const progress = loanTotalAmount > 0 ? (paidAmount / loanTotalAmount) * 100 : 0;
              const remaining = loanTotalAmount - paidAmount;
              const contractHasOverdue = loan.installments.some((i) => i.status === 'OVERDUE');
              
              return (
                <div
                  key={loan.id}
                  className={`bg-surface rounded-2xl p-4 border card-hover cursor-pointer ${
                    contractHasOverdue ? 'border-danger/30' : 'border-border'
                  }`}
                  onClick={() => router.push(`/loans/${loan.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Contrato #{borrower.loans.length - index}</p>
                        {contractHasOverdue && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20 font-bold flex items-center gap-0.5 shrink-0 animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                            Atrasado
                          </span>
                        )}
                      </div>
                      <p className="text-base font-bold text-foreground mt-0.5">{formatCurrency(loanTotalAmount)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                        loan.status === 'ACTIVE' ? 'bg-neon-dim text-neon border-neon/20' : 'bg-secondary text-muted-foreground border-border'
                      }`}>
                        {loan.status === 'ACTIVE' ? 'Ativo' : 'Finalizado'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 py-2 my-2 border-y border-border/50 text-[10px]">
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Original</span>
                      <span className="font-semibold text-foreground">{formatCurrency(loan.originalAmount)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Pago</span>
                      <span className="font-semibold text-neon">{formatCurrency(paidAmount)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Restante</span>
                      <span className="font-semibold text-warning">{formatCurrency(remaining)}</span>
                    </div>
                  </div>

                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Progresso</span>
                      <span>{paidCount}/{loan.installments.length} parcelas quitadas</span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neon rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Loan Dialog */}
      {/* Create Loan Dialog */}
      <CreateLoanDialog
        open={createLoanOpen}
        onOpenChange={setCreateLoanOpen}
        fixedBorrowerId={borrower.id}
        fixedBorrowerName={borrower.name}
        onSuccess={refreshBorrower}
      />
    </div>
  );
}