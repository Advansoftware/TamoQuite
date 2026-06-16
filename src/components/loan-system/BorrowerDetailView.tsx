'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { formatPhone, formatCurrency, formatDate } from '@/lib/helpers';
import { Plus, FileText, ArrowRight, ChevronRight, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BorrowerDetail {
  id: string;
  name: string;
  whatsapp: string;
  notes: string | null;
  createdAt: string;
  loans: Array<{
    id: string;
    originalAmount: number;
    totalAmount: number;
    status: string;
    startDate: string;
    installmentCount: number;
    installments: Array<{
      id: string;
      status: string;
      amount: number;
      paidAmount: number;
    }>;
  }>;
}

export function BorrowerDetailView() {
  const { selectedBorrowerId, selectLoan, setView, refreshKey } = useAppStore();
  const [borrower, setBorrower] = useState<BorrowerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [createLoanOpen, setCreateLoanOpen] = useState(false);
  const [form, setForm] = useState({
    originalAmount: '',
    interestRate: '',
    installmentCount: '',
    startDate: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchBorrower = useCallback(async () => {
    if (!selectedBorrowerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/borrowers/${selectedBorrowerId}`);
      const json = await res.json();
      setBorrower(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBorrowerId]);

  useEffect(() => {
    fetchBorrower();
  }, [fetchBorrower, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-neon/30 border-t-neon rounded-full animate-spin" />
      </div>
    );
  }

  if (!borrower) return null;

  const totalLent = borrower.loans.reduce((sum, l) => sum + l.totalAmount, 0);
  const totalReceived = borrower.loans.reduce(
    (sum, l) => sum + l.installments.reduce((s, i) => s + (i.paidAmount || 0), 0),
    0
  );

  const handleCreateLoan = async () => {
    const { originalAmount, interestRate, installmentCount, startDate } = form;
    if (!originalAmount || !interestRate || !installmentCount || !startDate) return;
    setSubmitting(true);
    try {
      await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowerId: borrower.id,
          originalAmount: parseFloat(originalAmount),
          interestRate: parseFloat(interestRate),
          installmentCount: parseInt(installmentCount),
          startDate,
        }),
      });
      setCreateLoanOpen(false);
      useAppStore.getState().triggerRefresh();
      fetchBorrower();
    } finally {
      setSubmitting(false);
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
            className="w-10 h-10 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] flex items-center justify-center transition-colors"
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
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Total Emprestado</p>
          <p className="text-base font-bold text-foreground">{formatCurrency(totalLent)}</p>
        </div>
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Total Recebido</p>
          <p className="text-base font-bold text-neon">{formatCurrency(totalReceived)}</p>
        </div>
      </div>

      {/* Loans */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-neon" />
            Empréstimos ({borrower.loans.length})
          </h3>
          <button
            onClick={() => {
              setForm({
                originalAmount: '',
                interestRate: '',
                installmentCount: '',
                startDate: new Date().toISOString().split('T')[0],
              });
              setCreateLoanOpen(true);
            }}
            className="flex items-center gap-1 text-xs text-neon font-medium hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo
          </button>
        </div>

        {borrower.loans.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Nenhum empréstimo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {borrower.loans.map((loan) => {
              const paidCount = loan.installments.filter((i) => i.status === 'PAID' || i.status === 'PARTIAL').length;
              const progress = (paidCount / loan.installments.length) * 100;
              return (
                <div
                  key={loan.id}
                  className="bg-surface rounded-xl p-4 border border-border card-hover"
                  onClick={() => selectLoan(loan.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(loan.totalAmount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {loan.installmentCount} parcelas · {formatCurrency(loan.originalAmount)} original
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        loan.status === 'ACTIVE' ? 'bg-neon-dim text-neon border-neon/20' : 'bg-secondary text-muted-foreground border-border'
                      }`}>
                        {loan.status === 'ACTIVE' ? 'Ativo' : 'Finalizado'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neon rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{paidCount}/{loan.installments.length} parcelas pagas</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Loan Dialog */}
      <Dialog open={createLoanOpen} onOpenChange={setCreateLoanOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Novo Empréstimo</DialogTitle>
            <DialogDescription className="text-muted-foreground">Para {borrower.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Número de Parcelas *</label>
              <Select value={form.installmentCount} onValueChange={(v) => setForm({ ...form, installmentCount: v })}>
                <SelectTrigger className="bg-surface-elevated border-border text-foreground rounded-xl h-11">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-surface-elevated border-border">
                  {[2, 3, 4, 5, 6, 8, 10, 12, 18, 24, 36].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-foreground">{n} parcelas</SelectItem>
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
            {form.originalAmount && form.interestRate && form.installmentCount && (
              <div className="bg-neon-dim rounded-xl p-4 border border-neon/20">
                <p className="text-xs text-neon font-medium mb-2">💰 Prévia</p>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Valor/parcela</span>
                  <span className="text-xs text-neon font-bold">
                    {(() => {
                      const P = parseFloat(form.originalAmount);
                      const r = parseFloat(form.interestRate) / 100;
                      const n = parseInt(form.installmentCount);
                      if (!P || !r || !n) return '—';
                      return formatCurrency(P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
                    })()}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => setCreateLoanOpen(false)}
              className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateLoan}
              disabled={submitting || !form.originalAmount || !form.interestRate || !form.installmentCount}
              className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1"
            >
              {submitting ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}