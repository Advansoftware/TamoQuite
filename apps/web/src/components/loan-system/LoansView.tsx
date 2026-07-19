'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatPhone } from '@/lib/helpers';
import { Plus, Search, FileText, Ban, RotateCcw, ChevronRight, Percent, Calendar, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLoans, useCancelLoan, useReactivateLoan, useInvalidateLoans } from '@/features/loans/use-loans';
import type { LoanListItem as Loan } from '@/features/loans/types';

import { CreateLoanDialog } from './CreateLoanDialog';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterTabs } from '@/components/ui/filter-tabs';

export function LoansView() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selected, setSelected] = useState<Loan | null>(null);
  const router = useRouter();
  const { loansFilter, setLoansFilter } = useAppStore();

  const { data: loans = [], isLoading: loading } = useLoans();
  const cancelMut = useCancelLoan();
  const reactivateMut = useReactivateLoan();
  const invalidateLoans = useInvalidateLoans();
  const submitting = cancelMut.isPending || reactivateMut.isPending;

  const filtered = loans.filter((l) => {
    const matchesName = l.borrower.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesName) return false;

    if (loansFilter === 'ACTIVE') return l.status === 'ACTIVE';
    if (loansFilter === 'OVERDUE') {
      return l.status === 'ACTIVE' && l.installments.some((i) => i.status === 'OVERDUE');
    }
    if (loansFilter === 'COMPLETED') return l.status === 'COMPLETED';
    if (loansFilter === 'CANCELED') return l.status === 'CANCELED';
    return true;
  });

  const counts = {
    ACTIVE: loans.filter((l) => l.status === 'ACTIVE').length,
    OVERDUE: loans.filter((l) => l.status === 'ACTIVE' && l.installments.some((i) => i.status === 'OVERDUE')).length,
    COMPLETED: loans.filter((l) => l.status === 'COMPLETED').length,
    CANCELED: loans.filter((l) => l.status === 'CANCELED').length,
  };

  const openCreate = () => {
    setCreateOpen(true);
  };

  const openCancel = (loan: Loan) => { setSelected(loan); setCancelOpen(true); };

  const handleCancel = async () => {
    if (!selected) return;
    try {
      await cancelMut.mutateAsync(selected.id);
      toast.success('Contrato cancelado. Ele continua no histórico.');
      setCancelOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro de conexão com o servidor');
    }
  };

  const handleReactivate = async (loan: Loan) => {
    try {
      await reactivateMut.mutateAsync(loan.id);
      toast.success('Contrato reativado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro de conexão com o servidor');
    }
  };

  const getLoanProgress = (loan: Loan) => {
    const paid = loan.installments.filter((i) => i.status === 'PAID').length;
    const paidAmount = loan.installments.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    const loanTotalAmount = loan.installments.reduce((sum, i) => sum + i.amount, 0);
    const percent = loanTotalAmount > 0 ? (paidAmount / loanTotalAmount) * 100 : 0;
    return { paid, total: loan.installments.length, percent, loanTotalAmount };
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Empréstimos</h2>
          <p className="text-sm text-muted-foreground">{loans.length} empréstimo{loans.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 h-11 sm:h-auto sm:py-2.5 bg-neon text-background rounded-xl text-sm font-semibold hover:shadow-[0_0_20px_rgba(0,255,163,0.3)] transition-all active:scale-95">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-surface border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11" />
        </div>
      </div>

      <FilterTabs
        value={loansFilter}
        onChange={setLoansFilter}
        options={[
          { value: 'ACTIVE', label: 'Ativos', count: counts.ACTIVE },
          { value: 'OVERDUE', label: 'Atrasados', count: counts.OVERDUE },
          { value: 'COMPLETED', label: 'Concluídos', count: counts.COMPLETED },
          { value: 'CANCELED', label: 'Cancelados', count: counts.CANCELED },
          { value: 'ALL', label: 'Todos', count: loans.length },
        ]}
      />

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title={search ? 'Nenhum resultado' : 'Nenhum empréstimo cadastrado'} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((loan) => {
            const progress = getLoanProgress(loan);
            return (
              <div key={loan.id} className="bg-surface rounded-2xl p-4 border border-border card-hover" onClick={() => router.push(`/loans/${loan.id}`)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neon-dim flex items-center justify-center shrink-0">
                      <span className="text-neon font-bold text-xs">{loan.borrower.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{loan.borrower.name}</p>
                      <p className="text-xs text-muted-foreground">{formatPhone(loan.borrower.whatsapp)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {loan.status === 'CANCELED' ? (
                      <button title="Reativar contrato" onClick={(e) => { e.stopPropagation(); handleReactivate(loan); }} className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-secondary hover:bg-neon-dim flex items-center justify-center transition-colors"><RotateCcw className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    ) : (
                      <button title="Cancelar contrato" onClick={(e) => { e.stopPropagation(); openCancel(loan); }} className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-secondary hover:bg-danger/10 flex items-center justify-center transition-colors"><Ban className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    )}
                    <button onClick={() => router.push(`/loans/${loan.id}`)} className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-secondary hover:bg-surface-elevated flex items-center justify-center transition-colors"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
                  </div>
                </div>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(progress.loanTotalAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Original</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(loan.originalAmount)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{progress.paid}/{progress.total} parcelas</span>
                    <span className="text-xs text-neon font-medium">{progress.percent.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-neon rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,255,163,0.3)]" style={{ width: `${progress.percent}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Percent className="w-3 h-3" />{loan.interestRate}% a.m.</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{loan.installmentCount}x</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-neon font-medium">Ver parcelas <ArrowRight className="w-3 h-3" /></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <CreateLoanDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={invalidateLoans}
      />

      {/* Delete Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-danger">Cancelar contrato</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Cancelar o contrato de <strong className="text-foreground">{selected?.borrower.name}</strong>? As cobranças automáticas param, mas nada é apagado — o contrato fica na aba &quot;Cancelados&quot; e pode ser reativado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setCancelOpen(false)} className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1">Voltar</Button>
            <Button onClick={handleCancel} disabled={submitting} className="bg-danger text-white hover:bg-danger/90 font-semibold rounded-xl flex-1">
              {submitting ? 'Cancelando...' : 'Cancelar contrato'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}