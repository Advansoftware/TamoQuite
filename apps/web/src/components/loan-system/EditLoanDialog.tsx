'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/helpers';
import { useUpdateLoan } from '@/features/loans/use-loans';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Percent, ArrowLeftRight, CalendarDays, ChevronDown, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { calcFromRate, calcRateFromTotal, splitIntoInstallments, type CalcMode } from '@/features/loans/loan-math';
import { buildSchedule } from '@/features/loans/schedule';

interface EditLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: {
    id: string;
    originalAmount: number;
    interestRate: number;
    totalAmount: number;
    installmentCount: number;
    paymentFrequency?: string;
    installments: Array<{ dueDate: string }>;
  };
  onSuccess: () => void;
}

/**
 * Corrects a contract that was created with the wrong numbers — the value, the
 * number of parcelas, the dates.
 *
 * Unlike the create dialog this one starts populated with the contract as it is,
 * and it rewrites the whole schedule on save. The backend only accepts that while
 * nothing has been paid; the caller is responsible for not offering the button
 * once a parcela is settled, and the server rejects it anyway.
 */
export function EditLoanDialog({ open, onOpenChange, loan, onSuccess }: EditLoanDialogProps) {
  const updateLoan = useUpdateLoan(loan.id);
  const submitting = updateLoan.isPending;

  const [calcMode, setCalcMode] = useState<CalcMode>('BY_RATE');
  const [singlePayment, setSinglePayment] = useState(false);
  const [dueDateOverrides, setDueDateOverrides] = useState<Record<number, string>>({});
  const [datesOpen, setDatesOpen] = useState(false);

  const [form, setForm] = useState({
    originalAmount: '',
    interestRate: '',
    totalAmount: '',
    installmentCount: '',
    frequency: 'MONTHLY',
    startDate: '',
  });

  // Load the contract into the form each time the dialog opens, so a cancelled
  // edit never leaks into the next one. Deferred a tick to avoid a synchronous
  // setState cascade inside the effect body (same as CreateLoanDialog).
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const firstDue = loan.installments[0]?.dueDate?.split('T')[0] ?? '';
      setForm({
        originalAmount: String(loan.originalAmount),
        interestRate: String(loan.interestRate),
        totalAmount: String(loan.totalAmount),
        installmentCount: String(loan.installmentCount),
        frequency: loan.paymentFrequency || 'MONTHLY',
        startDate: firstDue,
      });
      setSinglePayment(loan.installmentCount === 1);
      setCalcMode('BY_RATE');
      // The contract's real dates are the starting point, not a fresh periodic
      // schedule — a contract whose dates were hand-adjusted must not silently
      // snap back to the frequency just because the user opened this dialog.
      setDueDateOverrides(
        Object.fromEntries(
          loan.installments.map((inst, idx) => [idx, inst.dueDate.split('T')[0]]),
        ),
      );
      setDatesOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [open, loan]);

  const P = parseFloat(form.originalAmount) || 0;
  const n = singlePayment ? 1 : (parseInt(form.installmentCount) || 0);
  const r = parseFloat(form.interestRate) || 0;
  const totalInput = parseFloat(form.totalAmount) || 0;

  const periodNoun = form.frequency === 'WEEKLY' ? 'semana' : form.frequency === 'BIWEEKLY' ? 'quinzena' : 'mês';
  const periodAbbr = form.frequency === 'WEEKLY' ? 'a.s.' : form.frequency === 'BIWEEKLY' ? 'a.q.' : 'a.m.';

  let previewTotal = 0;
  let previewRate = 0;

  if (singlePayment && P > 0) {
    let receive: number;
    if (calcMode === 'BY_RATE') {
      receive = P * (1 + r / 100);
      previewRate = r;
    } else {
      receive = totalInput > 0 ? totalInput : P;
      previewRate = receive > P ? ((receive / P) - 1) * 100 : 0;
    }
    previewTotal = receive;
  } else if (calcMode === 'BY_RATE' && P > 0 && r > 0 && n > 0) {
    previewTotal = calcFromRate(P, r / 100, n).total;
    previewRate = r;
  } else if (calcMode === 'BY_TOTAL' && P > 0 && totalInput > 0 && n > 0) {
    previewTotal = totalInput;
    previewRate = calcRateFromTotal(P, totalInput, n);
  }

  const previewParts = splitIntoInstallments(previewTotal, n);

  // The periodic schedule is the fallback; anything the user kept or typed wins.
  // On open every slot is pre-filled from the contract, so changing the
  // frequency or the 1º vencimento only takes effect for slots the user clears.
  const schedule = buildSchedule(form.startDate, form.frequency, n);
  const dueDates = schedule.map((d, idx) => dueDateOverrides[idx] || d);

  const setDueDate = (idx: number, value: string) => {
    setDueDateOverrides((prev) => {
      const next = { ...prev };
      if (value) next[idx] = value;
      else delete next[idx];
      return next;
    });
  };

  /** Re-derives every date from the frequency, dropping the hand-set ones. */
  const resetDates = () => setDueDateOverrides({});

  const handleSave = async () => {
    let finalRate: number;
    if (singlePayment) {
      if (calcMode === 'BY_RATE') {
        finalRate = r;
      } else {
        const receive = totalInput > 0 ? totalInput : P;
        finalRate = receive > P ? ((receive / P) - 1) * 100 : 0;
      }
    } else if (calcMode === 'BY_RATE') {
      finalRate = r;
    } else {
      finalRate = calcRateFromTotal(P, totalInput, n);
    }
    finalRate = Math.round(finalRate * 100) / 100;

    if (!P || !n || !form.startDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await updateLoan.mutateAsync({
        originalAmount: P,
        interestRate: finalRate,
        // Same reason as create: the rate is capped at 2 decimals, so the total
        // shown in the preview is sent verbatim instead of being re-derived.
        totalAmount: Math.round(previewTotal * 100) / 100,
        installmentCount: n,
        frequency: form.frequency,
        startDate: dueDates[0] || form.startDate,
        dueDates,
      });
      toast.success('Contrato atualizado!');
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro de conexão com o servidor');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Editar Contrato</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Corrija o valor, o parcelamento ou os vencimentos.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            As parcelas serão recalculadas. Só é possível editar enquanto nenhuma
            parcela tiver sido paga.
          </p>
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Valor Original (R$) *</label>
            <Input
              type="number"
              step="0.01"
              value={form.originalAmount}
              onChange={(e) => setForm({ ...form, originalAmount: e.target.value })}
              className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
            />
          </div>

          <div className="bg-surface-elevated rounded-xl p-1 flex gap-1">
            <button
              type="button"
              onClick={() => setSinglePayment(false)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${!singlePayment ? 'bg-neon text-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Parcelado
            </button>
            <button
              type="button"
              onClick={() => setSinglePayment(true)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${singlePayment ? 'bg-neon text-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              À vista (1x)
            </button>
          </div>

          <div className="bg-surface-elevated rounded-xl p-1 flex gap-1">
            <button
              type="button"
              onClick={() => setCalcMode('BY_RATE')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${calcMode === 'BY_RATE' ? 'bg-neon text-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Percent className="w-3.5 h-3.5" />
              Informar {singlePayment ? '%' : 'Taxa'}
            </button>
            <button
              type="button"
              onClick={() => setCalcMode('BY_TOTAL')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${calcMode === 'BY_TOTAL' ? 'bg-neon text-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Informar Total
            </button>
          </div>

          {calcMode === 'BY_RATE' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {singlePayment ? 'Juros (%)' : `Taxa de Juros (% ${periodAbbr}) *`}
              </label>
              <Input
                type="number"
                step="0.01"
                value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
              />
              <p className="text-xs text-muted-foreground">
                {singlePayment
                  ? 'Juros único sobre o valor emprestado. Deixe 0 para receber o mesmo valor.'
                  : `Juros de ${form.interestRate || 'X'}% por ${periodNoun} sobre o valor emprestado`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Total a Receber (R$) *</label>
              <Input
                type="number"
                step="0.01"
                value={form.totalAmount}
                onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
              />
            </div>
          )}

          {!singlePayment && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Periodicidade *</label>
              <Select
                value={form.frequency}
                onValueChange={(v) => {
                  // A new periodicidade invalidates the dates loaded from the
                  // contract — rebuild them instead of leaving stale ones that
                  // no longer match the frequency the user just picked.
                  setForm({ ...form, frequency: v });
                  resetDates();
                }}
              >
                <SelectTrigger className="w-full bg-surface-elevated border-border text-foreground rounded-xl data-[size=default]:h-11 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-elevated border-border">
                  <SelectItem value="WEEKLY" className="text-foreground">Semanal (a cada 7 dias)</SelectItem>
                  <SelectItem value="BIWEEKLY" className="text-foreground">Quinzenal (a cada 15 dias)</SelectItem>
                  <SelectItem value="MONTHLY" className="text-foreground">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!singlePayment && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Número de Parcelas *</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.installmentCount}
                  onChange={(e) => setForm({ ...form, installmentCount: e.target.value })}
                  className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">{singlePayment ? 'Data de Vencimento *' : '1º Vencimento *'}</label>
              <Input
                type="date"
                value={dueDates[0] || form.startDate}
                onChange={(e) => {
                  // Moving the first due date re-anchors the whole schedule.
                  setForm({ ...form, startDate: e.target.value });
                  resetDates();
                }}
                className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
              />
            </div>
          </div>

          {!singlePayment && n > 0 && form.startDate && (
            <div className="rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setDatesOpen((v) => !v)}
                className="w-full flex items-center justify-between p-3 bg-surface-elevated hover:bg-secondary transition-colors cursor-pointer"
              >
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-neon" />
                  Vencimentos das parcelas
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${datesOpen ? 'rotate-180' : ''}`} />
              </button>
              {datesOpen && (
                <div className="p-3 space-y-2 max-h-56 overflow-y-auto">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Altere qualquer data se combinou outro dia.
                    </p>
                    <button
                      type="button"
                      onClick={resetDates}
                      className="text-xs text-neon hover:underline shrink-0 cursor-pointer"
                    >
                      Recalcular
                    </button>
                  </div>
                  {dueDates.map((date, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">{idx + 1}ª parcela</span>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDueDate(idx, e.target.value)}
                        className="bg-surface-elevated border-border text-foreground rounded-lg h-9 text-xs flex-1"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {previewTotal > 0 && (
            <div className="bg-neon-dim rounded-xl p-4 border border-neon/20 space-y-2">
              <p className="text-xs text-neon font-medium">💰 Como vai ficar</p>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Valor original</span>
                <span className="text-xs text-foreground font-medium">{formatCurrency(P)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Taxa equivalente</span>
                <span className="text-xs text-foreground font-medium">{previewRate.toFixed(2)}% {periodAbbr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Total com juros</span>
                <span className="text-xs text-neon font-medium">{formatCurrency(previewTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Valor por parcela</span>
                <span className="text-xs text-neon font-bold">
                  {previewParts.length > 1 && previewParts[0] !== previewParts[previewParts.length - 1]
                    ? `${formatCurrency(previewParts[0])} / ${formatCurrency(previewParts[previewParts.length - 1])}`
                    : formatCurrency(previewParts[0] ?? 0)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1 cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={submitting || !P || !n || (calcMode === 'BY_TOTAL' && !totalInput)}
            className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1 cursor-pointer"
          >
            {submitting ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
