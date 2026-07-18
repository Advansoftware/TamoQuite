'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { LoanBillingCard } from './LoanBillingCard';
import { apiFetch, apiPut, apiPost, apiDelete, getApiError } from '@/lib/api';
import {
  formatCurrency,
  formatDate,
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
  AlertTriangle,
  CreditCard,
  ArrowLeftRight,
  Undo2,
  ArrowLeft,
  ChevronDown,
  Send,
} from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
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
  type: string;
}

interface PartialPayment {
  id: string;
  amount: number;
  note: string | null;
  createdAt: string;
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
  doNotCharge?: boolean;
  whatsappMode?: 'MANUAL' | 'OWN' | 'GLOBAL' | null;
  paymentFrequency?: string;
  borrower: { id: string; name: string; whatsapp: string };
  installments: Installment[];
}

const FREQUENCY_LABEL: Record<string, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quinzenal',
  MONTHLY: 'Mensal',
};

async function fetchLoanData(selectedLoanId: string): Promise<{ loan: LoanDetail; partialPayments: Record<string, PartialPayment[]> }> {
  const res = await apiFetch(`/api/loans/${selectedLoanId}`);
  if (!res.ok) throw new Error('Failed to fetch loan');
  const loan: LoanDetail = await res.json();

  const paymentsMap: Record<string, PartialPayment[]> = {};
  await Promise.all(
    loan.installments.map(async (inst) => {
      if (inst.status === 'PARTIAL' || inst.status === 'PAID') {
        try {
          const paymentsRes = await apiFetch(`/api/installments/${inst.id}/partial-payments`);
          if (paymentsRes.ok) {
            const payments = await paymentsRes.json();
            if (payments.length > 0) paymentsMap[inst.id] = payments;
          }
        } catch { /* ignore */ }
      }
    })
  );

  return { loan, partialPayments: paymentsMap };
}

export function LoanDetailView() {
  const params = useParams();
  const router = useRouter();
  const selectedLoanId = params.id as string;
  const queryClient = useQueryClient();

  const [payOpen, setPayOpen] = useState(false);
  const [partialOpen, setPartialOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [interestOpen, setInterestOpen] = useState(false);
  const [interestAmount, setInterestAmount] = useState('');
  const [rollImmediately, setRollImmediately] = useState(true);
  const [rollRemainingOpen, setRollRemainingOpen] = useState(false);
  const [undoRollOpen, setUndoRollOpen] = useState(false);
  const [expandedInstallments, setExpandedInstallments] = useState<Set<string>>(new Set());
  const [undoPartialPaymentId, setUndoPartialPaymentId] = useState<string | null>(null);
  const [sendingChargeId, setSendingChargeId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['loan', selectedLoanId],
    queryFn: () => fetchLoanData(selectedLoanId!),
    enabled: !!selectedLoanId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['loan', selectedLoanId] });
    queryClient.invalidateQueries({ queryKey: ['loans'] });
  };

  const payFullMutation = useMutation({
    mutationFn: async (inst: Installment) => {
      const res = await apiPut(`/api/installments/${inst.id}`, { status: 'PAID' });
      const errMsg = await getApiError(res);
      if (errMsg) throw new Error(errMsg);
    },
    onSuccess: () => { setPayOpen(false); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const payPartialMutation = useMutation({
    mutationFn: async ({ installmentId, amount }: { installmentId: string; amount: number }) => {
      const res = await apiPost(`/api/installments/${installmentId}/partial-payments`, { amount });
      const errMsg = await getApiError(res);
      if (errMsg) throw new Error(errMsg);
    },
    onSuccess: () => { setPartialOpen(false); setPartialAmount(''); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const payInterestMutation = useMutation({
    mutationFn: async ({ installmentId, interestAmount, rollImmediately }: { installmentId: string; interestAmount: number; rollImmediately: boolean }) => {
      const res = await apiPost(`/api/installments/${installmentId}/pay-interest`, { interestAmount, rollImmediately });
      const errMsg = await getApiError(res);
      if (errMsg) throw new Error(errMsg);
    },
    onSuccess: (_, vars) => {
      toast.success(vars.rollImmediately ? 'Juros pagos e parcela adiada!' : 'Pagamento de juros registrado!');
      setInterestOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rollRemainingMutation = useMutation({
    mutationFn: async (installmentId: string) => {
      const res = await apiPost(`/api/installments/${installmentId}/roll-remaining`, {});
      const errMsg = await getApiError(res);
      if (errMsg) throw new Error(errMsg);
    },
    onSuccess: () => { toast.success('Parcela adiada para o próximo mês!'); setRollRemainingOpen(false); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const undoPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInstallment) return;
      if (undoPartialPaymentId) {
        const res = await apiDelete(`/api/installments/${selectedInstallment.id}/partial-payments/${undoPartialPaymentId}`);
        const errMsg = await getApiError(res);
        if (errMsg) throw new Error(errMsg);
      } else if (selectedInstallment.type === 'INTEREST') {
        const res = await apiPost(`/api/installments/${selectedInstallment.id}/undo-roll`, {});
        const errMsg = await getApiError(res);
        if (errMsg) throw new Error(errMsg);
      } else {
        const res = await apiPost(`/api/installments/${selectedInstallment.id}/undo-payment`, {});
        const errMsg = await getApiError(res);
        if (errMsg) throw new Error(errMsg);
      }
    },
    onSuccess: () => {
      toast.success('Pagamento desfeito com sucesso!');
      setUndoRollOpen(false);
      setUndoPartialPaymentId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendChargeMutation = useMutation({
    mutationFn: async (installmentId: string) => {
      const res = await apiPost(`/api/settings/billing/charge/${installmentId}`, {});
      const errMsg = await getApiError(res);
      if (errMsg) throw new Error(errMsg);
      return res.json();
    },
    onMutate: (installmentId: string) => setSendingChargeId(installmentId),
    onSuccess: () => toast.success('Cobrança enviada!'),
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setSendingChargeId(null),
  });

  const anySubmitting = payFullMutation.isPending || payPartialMutation.isPending || payInterestMutation.isPending || rollRemainingMutation.isPending || undoPaymentMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-neon/30 border-t-neon rounded-full animate-spin" />
      </div>
    );
  }

  const loan = data?.loan;
  const partialPayments = data?.partialPayments || {};
  if (!loan) return null;

  const paidCount = loan.installments.filter((i) => i.status === 'PAID').length;
  const paidAmount = loan.installments.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  const totalAmount = loan.installments.reduce((sum, i) => sum + i.amount, 0);
  const remainingAmount = loan.installments.reduce((sum, i) => sum + (i.amount - (i.paidAmount || 0)), 0);
  const progressPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  return (
    <div className="space-y-4 pb-6">
      {/* Botão de Voltar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-surface border border-border hover:bg-secondary text-foreground text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-neon" />
          Voltar
        </button>
      </div>

      <LoanBillingCard
        loanId={loan.id}
        initialDoNotCharge={!!loan.doNotCharge}
        initialWhatsappMode={loan.whatsappMode ?? null}
      />

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
          <span className="ml-auto text-[10px] px-2 py-1 rounded-md bg-surface-elevated text-muted-foreground border border-border font-medium">
            {FREQUENCY_LABEL[loan.paymentFrequency || 'MONTHLY']}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-elevated rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Original</p>
            <p className="text-sm font-bold text-foreground">{formatCurrency(loan.originalAmount)}</p>
          </div>
          <div className="bg-surface-elevated rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-sm font-bold text-neon">{formatCurrency(totalAmount)}</p>
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
                className={`bg-surface rounded-xl p-4 border transition-all duration-300 ${
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

                {/* Partial payment collapse */}
                {(inst.status === 'PARTIAL' || (inst.status === 'PAID' && partialPayments[inst.id]?.length > 0)) && (
                  <Collapsible
                    open={expandedInstallments.has(inst.id)}
                    onOpenChange={() => {
                      setExpandedInstallments((prev) => {
                        const next = new Set(prev);
                        if (next.has(inst.id)) next.delete(inst.id);
                        else next.add(inst.id);
                        return next;
                      });
                    }}
                  >
                    <div className="mb-3 bg-warning/5 rounded-lg border border-warning/10 overflow-hidden">
                      <CollapsibleTrigger className="w-full flex items-center justify-between p-2.5 cursor-pointer hover:bg-warning/10 transition-colors">
                        <p className="text-xs text-warning font-medium">
                          Pago: {formatCurrency(inst.paidAmount || 0)} · Restante: {formatCurrency(remaining)}
                        </p>
                        <ChevronDown className={`w-4 h-4 text-warning shrink-0 transition-transform duration-200 ${expandedInstallments.has(inst.id) ? 'rotate-180' : ''}`} />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-2.5 pb-2.5 space-y-1.5">
                          {partialPayments[inst.id]?.length > 0 ? (
                            partialPayments[inst.id].map((payment) => (
                              <div key={payment.id} className="flex items-center justify-between py-1.5 px-2 bg-surface-elevated rounded-lg">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-foreground font-medium">{formatCurrency(payment.amount)}</p>
                                  <p className="text-[10px] text-muted-foreground">{formatDate(payment.createdAt)}</p>
                                  {payment.note && (
                                    <p className="text-[10px] text-muted-foreground italic truncate">{payment.note}</p>
                                  )}
                                </div>
                                {inst.status === 'PARTIAL' && (
                                  <button
                                    onClick={() => {
                                      setSelectedInstallment(inst);
                                      setUndoPartialPaymentId(payment.id);
                                      setUndoRollOpen(true);
                                    }}
                                    className="ml-2 text-danger hover:text-danger/80 cursor-pointer"
                                    title="Remover pagamento"
                                  >
                                    <Undo2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-muted-foreground">Nenhum pagamento registrado.</p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )}

                {/* Actions for non-PAID */}
                {inst.status !== 'PAID' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedInstallment(inst);
                          setPayOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-neon/10 hover:bg-neon/20 text-neon rounded-xl text-xs font-semibold transition-colors active:scale-[0.98] cursor-pointer"
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
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-surface-elevated hover:bg-secondary text-foreground rounded-xl text-xs font-medium transition-colors active:scale-[0.98] cursor-pointer"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Pagamento Parcial
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            disabled={sendingChargeId === inst.id}
                            className="flex items-center justify-center w-10 h-10 bg-whatsapp/10 hover:bg-whatsapp/20 text-whatsapp rounded-xl transition-colors shrink-0 disabled:opacity-60 cursor-pointer outline-none"
                            title="Cobrar via WhatsApp"
                          >
                            {sendingChargeId === inst.id ? (
                              <span className="w-4 h-4 border-2 border-whatsapp/30 border-t-whatsapp rounded-full animate-spin" />
                            ) : (
                              <MessageCircle className="w-4 h-4" />
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-surface border-border text-foreground w-64">
                          <DropdownMenuItem
                            onClick={() => sendChargeMutation.mutate(inst.id)}
                            className="cursor-pointer focus:bg-secondary/40 flex-col items-start gap-0.5 py-2"
                          >
                            <span className="flex items-center gap-2 font-medium">
                              <Send className="w-4 h-4 text-neon" />
                              O sistema cobra por mim
                            </span>
                            <span className="text-[11px] text-muted-foreground pl-6">Envia a mensagem agora, automático.</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="cursor-pointer focus:bg-secondary/40">
                            <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex-col items-start gap-0.5 py-2">
                              <span className="flex items-center gap-2 font-medium">
                                <MessageCircle className="w-4 h-4 text-whatsapp" />
                                Eu mesmo envio
                              </span>
                              <span className="text-[11px] text-muted-foreground pl-6">Abre o WhatsApp com a mensagem pronta.</span>
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedInstallment(inst);
                          const standardInterest = loan.originalAmount * (loan.interestRate / 100);
                          setInterestAmount(String(Math.round(standardInterest * 100) / 100));
                          setRollImmediately(true);
                          setInterestOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-warning/10 hover:bg-warning/20 text-warning rounded-xl text-xs font-semibold transition-colors active:scale-[0.98] cursor-pointer"
                      >
                        <Percent className="w-3.5 h-3.5" />
                        Pagar Apenas Juros
                      </button>
                      {inst.status === 'PARTIAL' && (
                        <button
                          onClick={() => {
                            setSelectedInstallment(inst);
                            setRollRemainingOpen(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl text-xs font-semibold transition-colors active:scale-[0.98] cursor-pointer"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          Adiar Parcela
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {inst.status === 'PAID' && (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neon" />
                      {inst.paidAt ? `Pago em ${formatDate(inst.paidAt)}` : 'Pago'}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedInstallment(inst);
                        setUndoRollOpen(true);
                      }}
                      className="text-xs text-danger hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Undo2 className="w-3 h-3" />
                      Desfazer Pagamento
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pay Full Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Confirmar Pagamento</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedInstallment && (selectedInstallment.paidAmount || 0) > 0 ? (
                <>
                  Confirme o pagamento restante da parcela{' '}
                  <strong className="text-foreground">#{selectedInstallment.installmentNumber}</strong> no valor de{' '}
                  <strong className="text-neon">{formatCurrency(selectedInstallment.amount - (selectedInstallment.paidAmount || 0))}</strong>
                  <span className="text-muted-foreground"> (já pago: {formatCurrency(selectedInstallment.paidAmount || 0)})</span>
                </>
              ) : (
                <>
                  Confirme o pagamento completo da parcela{' '}
                  <strong className="text-foreground">#{selectedInstallment?.installmentNumber}</strong> no valor de{' '}
                  <strong className="text-neon">{selectedInstallment ? formatCurrency(selectedInstallment.amount) : ''}</strong>
                </>
              )}
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
              onClick={() => selectedInstallment && payFullMutation.mutate(selectedInstallment)}
              disabled={anySubmitting}
              className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1"
            >
              {payFullMutation.isPending ? 'Confirmando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partial Payment Dialog */}
      <Dialog open={partialOpen} onOpenChange={setPartialOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl">
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
              onClick={() => {
                if (!selectedInstallment || !partialAmount) return;
                payPartialMutation.mutate({ installmentId: selectedInstallment.id, amount: parseFloat(partialAmount) });
              }}
              disabled={anySubmitting || !partialAmount || parseFloat(partialAmount) <= 0}
              className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1"
            >
              {payPartialMutation.isPending ? 'Registrando...' : 'Registrar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Only Interest Dialog */}
      <Dialog open={interestOpen} onOpenChange={setInterestOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Pagar Apenas Juros</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Parcela #{selectedInstallment?.installmentNumber} — Valor total:{' '}
              <strong className="text-foreground">{selectedInstallment ? formatCurrency(selectedInstallment.amount) : ''}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Valor dos Juros (R$)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 150"
                value={interestAmount}
                onChange={(e) => setInterestAmount(e.target.value)}
                className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
              />
              <p className="text-xs text-muted-foreground">Valor padrão correspondente à taxa mensal do empréstimo.</p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-sm font-medium text-foreground">Ação de Rolagem</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-surface-elevated rounded-xl border border-border cursor-pointer hover:bg-secondary/20 transition-colors">
                  <input
                    type="radio"
                    name="rollImmediately"
                    checked={rollImmediately === true}
                    onChange={() => setRollImmediately(true)}
                    className="accent-neon h-4 w-4 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Rolar parcela (Adiar vencimento)</p>
                    <p className="text-[10px] text-muted-foreground">Adia esta parcela e as futuras em 1 mês. Cria parcela de juros paga.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-surface-elevated rounded-xl border border-border cursor-pointer hover:bg-secondary/20 transition-colors">
                  <input
                    type="radio"
                    name="rollImmediately"
                    checked={rollImmediately === false}
                    onChange={() => setRollImmediately(false)}
                    className="accent-neon h-4 w-4 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Apenas registrar pagamento parcial</p>
                    <p className="text-[10px] text-muted-foreground">Mantém a data original. Útil se o cliente for pagar o restante em breve.</p>
                  </div>
                </label>
              </div>
            </div>

            {rollImmediately && (
              <div className="bg-warning/10 rounded-xl p-3 border border-warning/20 flex gap-2.5 items-start">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-warning leading-relaxed">
                  <strong>Aviso:</strong> A data desta parcela e de todas as parcelas futuras serão adiadas em 1 mês. O juro pago será registrado em uma parcela quitada neste mês.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => setInterestOpen(false)}
              className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!selectedInstallment || !interestAmount) return;
                payInterestMutation.mutate({
                  installmentId: selectedInstallment.id,
                  interestAmount: parseFloat(interestAmount),
                  rollImmediately,
                });
              }}
              disabled={anySubmitting || !interestAmount || parseFloat(interestAmount) <= 0}
              className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1 cursor-pointer"
            >
              {payInterestMutation.isPending ? 'Confirmando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roll Remaining Dialog */}
      <Dialog open={rollRemainingOpen} onOpenChange={setRollRemainingOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Rolar Parcela (Adiar Vencimento)</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Deseja adiar o saldo restante desta parcela para o próximo mês?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              O valor pago até o momento ({selectedInstallment ? formatCurrency(selectedInstallment.paidAmount) : ''}) será isolado como uma nova parcela correspondente ao juro quitado deste mês.
            </p>
            <div className="bg-warning/10 rounded-xl p-3 border border-warning/20 flex gap-2.5 items-start">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning leading-relaxed">
                A data de vencimento desta parcela e de todas as parcelas futuras serão empurradas em 1 mês para a frente.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => setRollRemainingOpen(false)}
              className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => selectedInstallment && rollRemainingMutation.mutate(selectedInstallment.id)}
              disabled={anySubmitting}
              className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1 cursor-pointer"
            >
              {rollRemainingMutation.isPending ? 'Processando...' : 'Confirmar Rolagem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Undo Roll Dialog */}
      <Dialog open={undoRollOpen} onOpenChange={(open) => {
        setUndoRollOpen(open);
        if (!open) setUndoPartialPaymentId(null);
      }}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Desfazer Pagamento</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {undoPartialPaymentId
                ? 'Tem certeza que deseja remover este pagamento parcial?'
                : 'Tem certeza que deseja desfazer este pagamento?'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {undoPartialPaymentId
                ? 'Este pagamento parcial será removido e o valor será descontado do total pago desta parcela.'
                : 'Esta ação irá reverter o pagamento realizado. Se esta parcela foi adiada, as parcelas subsequentes também serão restauradas.'}
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => setUndoRollOpen(false)}
              className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => undoPaymentMutation.mutate()}
              disabled={anySubmitting}
              className="bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 font-semibold rounded-xl flex-1 cursor-pointer"
            >
              {undoPaymentMutation.isPending ? 'Processando...' : 'Desfazer Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
