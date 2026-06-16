'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  getDaysUntil,
  getDaysLabel,
  getStatusLabel,
  getStatusBgColor,
  formatPhone,
  generateWhatsAppLink,
  generateChargeMessage,
} from '@/lib/helpers';
import {
  MessageCircle,
  CheckCircle2,
  DollarSign,
  Percent,
  Calendar,
  AlertTriangle,
  CreditCard,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Installment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: string;
  paidAmount: number;
  paidAt: string | null;
}

interface LoanDetail {
  id: string;
  originalAmount: number;
  interestRate: number;
  totalAmount: number;
  installmentCount: number;
  startDate: string;
  status: string;
  createdAt: string;
  borrower: { id: string; name: string; whatsapp: string };
  installments: Installment[];
}

export function LoanDetailView() {
  const { selectedLoanId, triggerRefresh } = useAppStore();
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [partialOpen, setPartialOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLoan = useCallback(async () => {
    if (!selectedLoanId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/loans/${selectedLoanId}`);
      const json = await res.json();
      setLoan(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedLoanId]);

  useEffect(() => {
    fetchLoan();
  }, [fetchLoan]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-neon/30 border-t-neon rounded-full animate-spin" />
      </div>
    );
  }

  if (!loan) return null;

  const paidCount = loan.installments.filter((i) => i.status === 'PAID' || i.status === 'PARTIAL').length;
  const paidAmount = loan.installments.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  const remainingAmount = loan.totalAmount - paidAmount;
  const progressPercent = (paidCount / loan.installments.length) * 100;

  const handlePayFull = async (inst: Installment) => {
    setSubmitting(true);
    try {
      await fetch(`/api/installments/${inst.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      });
      setPayOpen(false);
      triggerRefresh();
      fetchLoan();
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayPartial = async () => {
    if (!selectedInstallment || !partialAmount) return;
    setSubmitting(true);
    try {
      const amount = parseFloat(partialAmount);
      if (amount >= selectedInstallment.amount) {
        await fetch(`/api/installments/${selectedInstallment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PAID', paidAmount: selectedInstallment.amount }),
        });
      } else {
        await fetch(`/api/installments/${selectedInstallment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PARTIAL', paidAmount: amount }),
        });
      }
      setPartialOpen(false);
      setPartialAmount('');
      triggerRefresh();
      fetchLoan();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Borrower Info */}
      <div className="bg-surface rounded-2xl p-4 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-neon-dim flex items-center justify-center">
            <span className="text-neon font-bold text-sm">
              {loan.borrower.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-base font-bold text-foreground">{loan.borrower.name}</p>
            <p className="text-xs text-muted-foreground">{formatPhone(loan.borrower.whatsapp)}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-elevated rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Original</p>
            <p className="text-sm font-bold text-foreground">{formatCurrency(loan.originalAmount)}</p>
          </div>
          <div className="bg-surface-elevated rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-sm font-bold text-neon">{formatCurrency(loan.totalAmount)}</p>
          </div>
          <div className="bg-surface-elevated rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Juros</p>
            <p className="text-sm font-bold text-warning">{loan.interestRate}%</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-surface rounded-2xl p-4 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Progresso</span>
          <span className="text-xs text-neon font-medium">{paidCount}/{loan.installments.length} parcelas</span>
        </div>
        <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-neon/80 to-neon rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,255,163,0.4)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Recebido</p>
            <p className="text-sm font-bold text-neon">{formatCurrency(paidAmount)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Restante</p>
            <p className="text-sm font-bold text-foreground">{formatCurrency(Math.max(remainingAmount, 0))}</p>
          </div>
        </div>
      </div>

      {/* Installments List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-neon" />
          Parcelas
        </h3>
        <div className="space-y-2">
          {loan.installments.map((inst) => {
            const days = getDaysUntil(inst.dueDate);
            const message = generateChargeMessage(loan.borrower.name, inst.amount, inst.dueDate);
            const waLink = generateWhatsAppLink(loan.borrower.whatsapp, message);
            const remaining = inst.amount - (inst.paidAmount || 0);

            return (
              <div
                key={inst.id}
                className={`bg-surface rounded-xl p-4 border ${
                  inst.status === 'OVERDUE' ? 'border-danger/20' : 'border-border'
                } card-hover`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      inst.status === 'PAID' ? 'bg-neon-dim' :
                      inst.status === 'OVERDUE' ? 'bg-danger/10' :
                      'bg-surface-elevated'
                    }`}>
                      <span className={`text-xs font-bold ${
                        inst.status === 'PAID' ? 'text-neon' :
                        inst.status === 'OVERDUE' ? 'text-danger' :
                        'text-muted-foreground'
                      }`}>
                        {inst.installmentNumber.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(inst.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(inst.dueDate)}
                        {inst.status === 'PENDING' && days >= 0 && (
                          <span className="text-muted-foreground"> · {getDaysLabel(days)}</span>
                        )}
                        {inst.status === 'OVERDUE' && (
                          <span className="text-danger font-medium"> · {getDaysLabel(days)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${getStatusBgColor(inst.status)}`}>
                    {getStatusLabel(inst.status)}
                  </span>
                </div>

                {/* Partial payment info */}
                {inst.status === 'PARTIAL' && (
                  <div className="mb-3 bg-warning/5 rounded-lg p-2.5 border border-warning/10">
                    <p className="text-xs text-warning">
                      Pago: {formatCurrency(inst.paidAmount || 0)} · Restante: {formatCurrency(remaining)}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {inst.status !== 'PAID' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedInstallment(inst);
                        setPayOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-neon/10 hover:bg-neon/20 text-neon rounded-xl text-xs font-semibold transition-colors active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Dar Baixa
                    </button>
                    <button
                      onClick={() => {
                        setSelectedInstallment(inst);
                        setPartialAmount('');
                        setPartialOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-surface-elevated hover:bg-secondary text-foreground rounded-xl text-xs font-medium transition-colors active:scale-[0.98]"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Pagamento Parcial
                    </button>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl transition-colors shrink-0"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                )}

                {inst.status === 'PAID' && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-neon" />
                    {inst.paidAt ? `Pago em ${formatDate(inst.paidAt)}` : 'Pago'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pay Full Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Confirmar Pagamento</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Confirme o pagamento completo da parcela{' '}
              <strong className="text-foreground">#{selectedInstallment?.installmentNumber}</strong> no valor de{' '}
              <strong className="text-neon">{selectedInstallment ? formatCurrency(selectedInstallment.amount) : ''}</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => setPayOpen(false)}
              className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => selectedInstallment && handlePayFull(selectedInstallment)}
              disabled={submitting}
              className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1"
            >
              {submitting ? 'Confirmando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partial Payment Dialog */}
      <Dialog open={partialOpen} onOpenChange={setPartialOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Pagamento Parcial</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Parcela #{selectedInstallment?.installmentNumber} — Valor total:{' '}
              <strong className="text-foreground">{selectedInstallment ? formatCurrency(selectedInstallment.amount) : ''}</strong>
              {selectedInstallment && (
                <>
                  {' '}· Restante:{' '}
                  <strong className="text-warning">
                    {formatCurrency(selectedInstallment.amount - (selectedInstallment.paidAmount || 0))}
                  </strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Valor do Pagamento (R$)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 150"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => setPartialOpen(false)}
              className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePayPartial}
              disabled={submitting || !partialAmount || parseFloat(partialAmount) <= 0}
              className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1"
            >
              {submitting ? 'Registrando...' : 'Registrar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}