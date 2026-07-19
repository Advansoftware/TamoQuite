import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Read model for the reports screen. Every query is scoped by userId, so a user
 * only ever sees figures from their own contracts.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string, months = 6) {
    const span = Math.min(Math.max(months, 1), 24);

    const loans = await this.prisma.loan.findMany({
      // Deleted contracts and deactivated clients are out of every figure here.
      where: { userId, deletedAt: null, borrower: { isActive: true } },
      select: {
        id: true,
        status: true,
        originalAmount: true,
        totalAmount: true,
        installments: {
          select: {
            amount: true,
            paidAmount: true,
            paidAt: true,
            dueDate: true,
            status: true,
            partialPayments: { select: { amount: true, createdAt: true } },
          },
        },
      },
    });

    const byStatus = { ACTIVE: 0, COMPLETED: 0 };
    let totalLent = 0;
    let totalReceived = 0;
    let outstanding = 0;
    let expectedTotal = 0; // principal + juros combinados dos contratos que valem
    let expectedToDate = 0; // o que já deveria ter entrado (parcelas vencidas ou vencendo hoje)
    let activeCapital = 0; // capital próprio ainda "na rua" nos contratos em andamento

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Build the month buckets first so empty months still render (a gap in a
    // time series is information; a missing bar is a lie).
    const buckets = new Map<string, number>();
    const now = new Date();
    const timeline: { key: string; label: string }[] = [];
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      buckets.set(key, 0);
      timeline.push({ key, label: MONTH_LABELS[d.getMonth()] });
    }

    const addReceipt = (when: Date | null, amount: number) => {
      if (!when || amount <= 0) return;
      const key = monthKey(new Date(when));
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + amount);
    };

    // Every loan that reaches this point is a live one — deleted contracts were
    // filtered out in the query, so there is no "does this count?" case left.
    for (const loan of loans) {
      if (loan.status === 'COMPLETED') byStatus.COMPLETED++;
      else byStatus.ACTIVE++;

      totalLent += loan.originalAmount;
      expectedTotal += loan.totalAmount;

      let receivedForLoan = 0;

      for (const inst of loan.installments) {
        const paid = inst.paidAmount || 0;
        totalReceived += paid;
        receivedForLoan += paid;
        if (inst.status !== 'PAID') outstanding += Math.max(0, inst.amount - paid);
        // Só conta como "projetado" o que já venceu — o futuro ainda não devia ter entrado.
        if (new Date(inst.dueDate) <= todayEnd) expectedToDate += inst.amount;

        // A full payment writes paidAmount/paidAt with no PartialPayment row;
        // partial payments create rows. Count the rows, then attribute only the
        // remainder to paidAt, so nothing is counted twice.
        const fromRows = inst.partialPayments.reduce((s, p) => s + p.amount, 0);
        for (const p of inst.partialPayments) addReceipt(p.createdAt, p.amount);
        addReceipt(inst.paidAt, paid - fromRows);
      }

      // Dinheiro seu que ainda não voltou, só nos contratos em andamento.
      // Quitados já devolveram o capital.
      if (loan.status !== 'COMPLETED') {
        activeCapital += Math.max(0, loan.originalAmount - receivedForLoan);
      }
    }

    return {
      totals: {
        activeContracts: byStatus.ACTIVE,
        totalContracts: loans.length,
        totalLent: round(totalLent),
        totalReceived: round(totalReceived),
        outstanding: round(outstanding),
        // O que você ganha além do que emprestou (juros previstos).
        expectedProfit: round(expectedTotal - totalLent),
        // Projetado x Realizado: o que já deveria ter entrado até hoje.
        expectedToDate: round(expectedToDate),
        // Custo Ativo: quanto do seu dinheiro ainda está na rua.
        activeCapital: round(activeCapital),
      },
      byStatus,
      monthly: timeline.map((m) => ({ ...m, received: round(buckets.get(m.key) ?? 0) })),
    };
  }
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
