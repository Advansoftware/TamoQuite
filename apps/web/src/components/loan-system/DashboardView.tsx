'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface DashboardData {
  totalMonthly: number;
  totalMonthlyPending: number;
  receivedMonthly: number;
  upcomingInstallments: Array<{
    id: string;
    installmentNumber: number;
    dueDate: string;
    amount: number;
    status: string;
    paidAmount: number;
    borrowerName: string;
    borrowerWhatsapp: string;
    loanId: string;
  }>;
  overdueInstallments: Array<{
    id: string;
    installmentNumber: number;
    dueDate: string;
    amount: number;
    status: string;
    paidAmount: number;
    borrowerName: string;
    borrowerWhatsapp: string;
    loanId: string;
  }>;
  overdueCount: number;
  activeLoans: number;
  totalOutstanding: number;
  recentLoans: Array<{
    id: string;
    originalAmount: number;
    totalAmount: number;
    remainingAmount: number;
    status: string;
    createdAt: string;
    borrower: { name: string; whatsapp: string };
    _count: { installments: number };
  }>;
}

import { formatCurrency, formatDateShort, getDaysUntil, getDaysLabel, generateWhatsAppLink, generateChargeMessage, getStatusLabel, getStatusBgColor, formatPhone } from '@/lib/helpers';
import { useAppStore } from '@/lib/store';
import { Wallet, TrendingUp, AlertTriangle, Clock, ArrowRight, MessageCircle, DollarSign, Plus, UserPlus } from 'lucide-react';
import { CreateLoanDialog } from './CreateLoanDialog';

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const router = useRouter();
  const { refreshKey, setLoansFilter, triggerRefresh } = useAppStore();

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiFetch('/api/dashboard');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDashboard();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDashboard, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-neon/30 border-t-neon rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center mx-auto">
          <Wallet className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Erro ao carregar dados</p>
          <p className="text-xs text-muted-foreground mt-1">Tente recarregar a página</p>
        </div>
      </div>
    );
  }

  const progressPercent = data.totalMonthly > 0 ? (data.receivedMonthly / data.totalMonthly) * 100 : 0;

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">Painel de Controle</h2>
        <p className="text-sm text-muted-foreground">Visão geral dos seus repasses</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div onClick={() => { setLoansFilter('ACTIVE'); router.push('/loans'); }} className="bg-surface rounded-2xl p-4 border border-border card-hover cursor-pointer active:scale-[0.98] transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-neon-dim flex items-center justify-center">
              <Wallet className="w-4 h-4 text-neon" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">A Receber (Mês)</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(data.totalMonthlyPending)}</p>
        </div>

        <div onClick={() => { setLoansFilter('ALL'); router.push('/loans'); }} className="bg-surface rounded-2xl p-4 border border-border card-hover cursor-pointer active:scale-[0.98] transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-neon-dim flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-neon" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Recebido (Mês)</p>
          <p className="text-lg font-bold text-neon">{formatCurrency(data.receivedMonthly)}</p>
        </div>

        <div onClick={() => { setLoansFilter('OVERDUE'); router.push('/loans'); }} className="bg-surface rounded-2xl p-4 border border-border card-hover cursor-pointer active:scale-[0.98] transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-danger" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Inadimplentes</p>
          <p className="text-lg font-bold text-danger">{data.overdueCount}</p>
        </div>

        <div onClick={() => { setLoansFilter('ACTIVE'); router.push('/loans'); }} className="bg-surface rounded-2xl p-4 border border-border card-hover cursor-pointer active:scale-[0.98] transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-foreground" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Total a Receber</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(data.totalOutstanding)}</p>
        </div>
      </div>

      {/* Monthly Progress */}
      {data.totalMonthly > 0 && (
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">Progresso do Mês</span>
            <span className="text-xs text-neon font-medium">{progressPercent.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon/80 to-neon rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,255,163,0.4)]"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">{formatCurrency(data.receivedMonthly)} recebido</span>
            <span className="text-xs text-muted-foreground">{formatCurrency(data.totalMonthly)} total</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Overdue and Upcoming */}
        <div className="space-y-6">
          {/* Overdue Section */}
          {data.overdueInstallments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-danger" />
                <h3 className="text-sm font-semibold text-danger">Parcelas Atrasadas</h3>
                <span className="text-xs bg-danger/10 text-danger px-2 py-0.5 rounded-full font-medium">
                  {data.overdueInstallments.length}
                </span>
              </div>
              <div className="space-y-2">
                {data.overdueInstallments.map((inst) => {
                  const days = getDaysUntil(inst.dueDate);
                  const message = generateChargeMessage(inst.borrowerName, inst.amount, inst.dueDate);
                  const waLink = generateWhatsAppLink(inst.borrowerWhatsapp, message);
                  return (
                    <div
                      key={inst.id}
                      className="bg-surface rounded-xl p-4 border border-danger/20 card-hover"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{inst.borrowerName}</p>
                          <p className="text-xs text-danger font-medium">{getDaysLabel(days)}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full border bg-danger/10 text-danger border-danger/20 font-medium whitespace-nowrap ml-2">
                          {getStatusLabel(inst.status)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-base font-bold text-foreground">{formatCurrency(inst.amount)}</p>
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-lg text-xs font-medium transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Cobrar
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {data.upcomingInstallments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-neon" />
                <h3 className="text-sm font-semibold text-foreground">Próximos Vencimentos</h3>
              </div>
              <div className="space-y-2">
                {data.upcomingInstallments.map((inst) => {
                  const days = getDaysUntil(inst.dueDate);
                  const message = generateChargeMessage(inst.borrowerName, inst.amount, inst.dueDate);
                  const waLink = generateWhatsAppLink(inst.borrowerWhatsapp, message);
                  return (
                    <div
                      key={inst.id}
                      className="bg-surface rounded-xl p-4 border border-border card-hover cursor-pointer"
                      onClick={() => router.push(`/loans/${inst.loanId}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{inst.borrowerName}</p>
                          <p className="text-xs text-muted-foreground">{getDaysLabel(days)} · {formatDateShort(inst.dueDate)}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ml-2 ${getStatusBgColor(inst.status)}`}>
                          {getStatusLabel(inst.status)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-base font-bold text-foreground">{formatCurrency(inst.amount)}</p>
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-lg text-xs font-medium transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Cobrar
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recent Loans */}
        <div className="space-y-6">
          {data.recentLoans.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Empréstimos Recentes</h3>
                <button
                  onClick={() => router.push('/loans')}
                  className="flex items-center gap-1 text-xs text-neon hover:underline cursor-pointer"
                >
                  Ver todos <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {data.recentLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="bg-surface rounded-xl p-4 border border-border card-hover cursor-pointer"
                    onClick={() => router.push(`/loans/${loan.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{loan.borrower.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {loan._count.installments} parcelas · {formatCurrency(loan.originalAmount)}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-xs text-muted-foreground">Restante</p>
                        <p className="text-sm font-bold text-foreground">{formatCurrency(loan.remainingAmount)}</p>
                        <p className={`text-xs font-medium mt-0.5 ${loan.status === 'ACTIVE' ? 'text-neon' : 'text-muted-foreground'}`}>
                          {loan.status === 'ACTIVE' ? 'Ativo' : 'Finalizado'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {data.totalMonthly === 0 && data.overdueInstallments.length === 0 && data.recentLoans.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center mx-auto">
            <Wallet className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Nenhum empréstimo cadastrado</p>
            <p className="text-xs text-muted-foreground mt-1">Crie seu primeiro empréstimo para começar</p>
          </div>
          <div className="flex flex-col items-center gap-2 pt-1">
            <button
              onClick={() => setLoanDialogOpen(true)}
              className="inline-flex items-center gap-2 px-5 h-11 bg-neon text-background rounded-xl font-semibold text-sm hover:bg-neon/90 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Criar Empréstimo
            </button>
            <button
              onClick={() => router.push('/borrowers')}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              ou cadastrar uma pessoa primeiro
            </button>
          </div>
        </div>
      )}

      <CreateLoanDialog
        open={loanDialogOpen}
        onOpenChange={setLoanDialogOpen}
        onSuccess={() => {
          setLoanDialogOpen(false);
          triggerRefresh();
        }}
      />
    </div>
  );
}