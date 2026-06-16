'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatDate, getStatusLabel, getStatusBgColor, formatPhone } from '@/lib/helpers';
import { Plus, Search, FileText, Trash2, ChevronRight, User, Percent, Calendar, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BorrowerOption {
  id: string;
  name: string;
  whatsapp: string;
}

interface Loan {
  id: string;
  borrowerId: string;
  originalAmount: number;
  interestRate: number;
  totalAmount: number;
  installmentCount: number;
  startDate: string;
  status: string;
  createdAt: string;
  borrower: { name: string; whatsapp: string };
  installments: Array<{
    id: string;
    status: string;
    amount: number;
  }>;
}

export function LoansView() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [borrowers, setBorrowers] = useState<BorrowerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Loan | null>(null);
  const [form, setForm] = useState({
    borrowerId: '',
    originalAmount: '',
    interestRate: '',
    installmentCount: '',
    startDate: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const { selectLoan, refreshKey, triggerRefresh } = useAppStore();

  const fetchData = useCallback(async () => {
    try {
      const [loansRes, borrowersRes] = await Promise.all([
        fetch('/api/loans'),
        fetch('/api/borrowers'),
      ]);
      setLoans(await loansRes.json());
      setBorrowers(await borrowersRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const filtered = loans.filter((l) =>
    l.borrower.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setForm({
      borrowerId: '',
      originalAmount: '',
      interestRate: '',
      installmentCount: '',
      startDate: new Date().toISOString().split('T')[0],
    });
    setCreateOpen(true);
  };

  const openDelete = (loan: Loan) => {
    setSelected(loan);
    setDeleteOpen(true);
  };

  const handleCreate = async () => {
    const { borrowerId, originalAmount, interestRate, installmentCount, startDate } = form;
    if (!borrowerId || !originalAmount || !interestRate || !installmentCount || !startDate) return;
    setSubmitting(true);
    try {
      await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowerId,
          originalAmount: parseFloat(originalAmount),
          interestRate: parseFloat(interestRate),
          installmentCount: parseInt(installmentCount),
          startDate,
        }),
      });
      setCreateOpen(false);
      triggerRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await fetch(`/api/loans/${selected.id}`, { method: 'DELETE' });
      setDeleteOpen(false);
      triggerRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const getLoanProgress = (loan: Loan) => {
    const paid = loan.installments.filter((i) => i.status === 'PAID' || i.status === 'PARTIAL').length;
    return { paid, total: loan.installments.length, percent: (paid / loan.installments.length) * 100 };
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Empréstimos</h2>
          <p className="text-sm text-muted-foreground">{loans.length} empréstimo{loans.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-neon text-background rounded-xl text-sm font-semibold hover:shadow-[0_0_20px_rgba(0,255,163,0.3)] transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-surface border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-neon/30 border-t-neon rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            {search ? 'Nenhum resultado encontrado' : 'Nenhum empréstimo cadastrado'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((loan) => {
            const progress = getLoanProgress(loan);
            return (
              <div
                key={loan.id}
                className="bg-surface rounded-2xl p-4 border border-border card-hover"
              >
                {/* Top row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3" onClick={() => selectLoan(loan.id)}>
                    <div className="w-10 h-10 rounded-xl bg-neon-dim flex items-center justify-center shrink-0">
                      <span className="text-neon font-bold text-xs">
                        {loan.borrower.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{loan.borrower.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPhone(loan.borrower.whatsapp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openDelete(loan)}
                      className="w-8 h-8 rounded-lg bg-secondary hover:bg-danger/10 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => selectLoan(loan.id)}
                      className="w-8 h-8 rounded-lg bg-secondary hover:bg-surface-elevated flex items-center justify-center transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(loan.totalAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Original</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(loan.originalAmount)}</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{progress.paid}/{progress.total} parcelas pagas</span>
                    <span className="text-xs text-neon font-medium">{progress.percent.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neon rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,255,163,0.3)]"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      {loan.interestRate}% a.m.
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {loan.installmentCount}x
                    </span>
                  </div>
                  <button
                    onClick={() => selectLoan(loan.id)}
                    className="flex items-center gap-1 text-xs text-neon font-medium hover:underline"
                  >
                    Ver parcelas <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Novo Empréstimo</DialogTitle>
            <DialogDescription className="text-muted-foreground">Crie um empréstimo e gere as parcelas automaticamente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Pessoa *</label>
              <Select value={form.borrowerId} onValueChange={(v) => setForm({ ...form, borrowerId: v })}>
                <SelectTrigger className="bg-surface-elevated border-border text-foreground rounded-xl h-11">
                  <SelectValue placeholder="Selecione uma pessoa" />
                </SelectTrigger>
                <SelectContent className="bg-surface-elevated border-border">
                  {borrowers.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-foreground">
                      {b.name} — {formatPhone(b.whatsapp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Valor Original (R$) *</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 5000"
                value={form.originalAmount}
                onChange={(e) => setForm({ ...form, originalAmount: e.target.value })}
                className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Taxa de Juros (% a.m.) *</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 2.5"
                value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
              />
              <p className="text-xs text-muted-foreground">CET do banco — usado para calcular o valor exato das parcelas (tabela Price)</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Número de Parcelas *</label>
              <Select value={form.installmentCount} onValueChange={(v) => setForm({ ...form, installmentCount: v })}>
                <SelectTrigger className="bg-surface-elevated border-border text-foreground rounded-xl h-11">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-surface-elevated border-border">
                  {[2, 3, 4, 5, 6, 8, 10, 12, 18, 24, 36].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-foreground">
                      {n} parcelas
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Data de Início *</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
              />
            </div>

            {/* Preview */}
            {form.originalAmount && form.interestRate && form.installmentCount && (
              <div className="bg-neon-dim rounded-xl p-4 border border-neon/20">
                <p className="text-xs text-neon font-medium mb-2">💰 Prévia do Cálculo</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Valor original</span>
                    <span className="text-xs text-foreground font-medium">{formatCurrency(parseFloat(form.originalAmount))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Total com juros</span>
                    <span className="text-xs text-neon font-medium">
                      {(() => {
                        const P = parseFloat(form.originalAmount);
                        const r = parseFloat(form.interestRate) / 100;
                        const n = parseInt(form.installmentCount);
                        if (!P || !r || !n) return '—';
                        const total = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) * n;
                        return formatCurrency(total);
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Valor por parcela</span>
                    <span className="text-xs text-neon font-bold">
                      {(() => {
                        const P = parseFloat(form.originalAmount);
                        const r = parseFloat(form.interestRate) / 100;
                        const n = parseInt(form.installmentCount);
                        if (!P || !r || !n) return '—';
                        const pmt = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
                        return formatCurrency(pmt);
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting || !form.borrowerId || !form.originalAmount || !form.interestRate || !form.installmentCount}
              className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1"
            >
              {submitting ? 'Criando...' : 'Criar Empréstimo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-danger">Excluir Empréstimo</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir o empréstimo de <strong className="text-foreground">{selected?.borrower.name}</strong>? 
              Todas as parcelas serão removidas permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteOpen(false)}
              className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={submitting}
              className="bg-danger text-white hover:bg-danger/90 font-semibold rounded-xl flex-1"
            >
              {submitting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}