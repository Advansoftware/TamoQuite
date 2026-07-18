'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatPhone } from '@/lib/helpers';
import { Plus, Search, FileText, Trash2, ChevronRight, Percent, Calendar, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLoans, useDeleteLoan, useInvalidateLoans } from '@/features/loans/use-loans';
import type { LoanListItem as Loan } from '@/features/loans/types';

import { CreateLoanDialog } from './CreateLoanDialog';

export function LoansView() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Loan | null>(null);
  const router = useRouter();
  const { loansFilter, setLoansFilter } = useAppStore();

  const { data: loans = [], isLoading: loading } = useLoans();
  const deleteMut = useDeleteLoan();
  const invalidateLoans = useInvalidateLoans();
  const submitting = deleteMut.isPending;

  const filtered = loans.filter((l) => {
    const matchesName = l.borrower.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesName) return false;

    if (loansFilter === 'ACTIVE') {
      return l.status === 'ACTIVE';
    }
    if (loansFilter === 'OVERDUE') {
      return l.status === 'ACTIVE' && l.installments.some((i) => i.status === 'OVERDUE');
    }
    if (loansFilter === 'FINALIZED') {
      return l.status !== 'ACTIVE';
    }
    return true;
  });

  const openCreate = () => {
    setCreateOpen(true);
  };

  const openDelete = (loan: Loan) => { setSelected(loan); setDeleteOpen(true); };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await deleteMut.mutateAsync(selected.id);
      setDeleteOpen(false);
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
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-neon text-background rounded-xl text-sm font-semibold hover:shadow-[0_0_20px_rgba(0,255,163,0.3)] transition-all active:scale-95">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-surface border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11" />
        </div>
        <Select value={loansFilter} onValueChange={setLoansFilter}>
          <SelectTrigger className="w-full sm:w-56 bg-surface border-border text-foreground rounded-xl h-11">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent className="bg-surface border-border text-foreground rounded-xl">
            <SelectItem value="ALL">Todos os contratos</SelectItem>
            <SelectItem value="ACTIVE">Contratos Ativos</SelectItem>
            <SelectItem value="OVERDUE">Contratos Atrasados</SelectItem>
            <SelectItem value="FINALIZED">Contratos Finalizados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-neon/30 border-t-neon rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{search ? 'Nenhum resultado' : 'Nenhum empréstimo cadastrado'}</p>
        </div>
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
                    <button onClick={() => openDelete(loan)} className="w-8 h-8 rounded-lg bg-secondary hover:bg-danger/10 flex items-center justify-center transition-colors"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => router.push(`/loans/${loan.id}`)} className="w-8 h-8 rounded-lg bg-secondary hover:bg-surface-elevated flex items-center justify-center transition-colors"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
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
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-danger">Excluir Empréstimo</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Excluir empréstimo de <strong className="text-foreground">{selected?.borrower.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1">Cancelar</Button>
            <Button onClick={handleDelete} disabled={submitting} className="bg-danger text-white hover:bg-danger/90 font-semibold rounded-xl flex-1">
              {submitting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}