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
      where: { userId },
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
            status: true,
            partialPayments: { select: { amount: true, createdAt: true } },
          },
        },
      },
    });

    const byStatus = { ACTIVE: 0, COMPLETED: 0, CANCELED: 0 };
    let totalLent = 0;
    let totalReceived = 0;
    let outstanding = 0;
    let expectedTotal = 0; // principal + juros combinados dos contratos que valem

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

    for (const loan of loans) {
      if (loan.status === 'COMPLETED') byStatus.COMPLETED++;
      else if (loan.status === 'CANCELED') byStatus.CANCELED++;
      else byStatus.ACTIVE++;

      // Cancelled contracts still happened, but they no longer represent money
      // in play — keep them out of the lent/outstanding figures.
      const counts = loan.status !== 'CANCELED';
      if (counts) {
        totalLent += loan.originalAmount;
        expectedTotal += loan.totalAmount;
      }

      for (const inst of loan.installments) {
        const paid = inst.paidAmount || 0;
        if (counts) {
          totalReceived += paid;
          if (inst.status !== 'PAID') outstanding += Math.max(0, inst.amount - paid);
        }

        // A full payment writes paidAmount/paidAt with no PartialPayment row;
        // partial payments create rows. Count the rows, then attribute only the
        // remainder to paidAt, so nothing is counted twice.
        const fromRows = inst.partialPayments.reduce((s, p) => s + p.amount, 0);
        for (const p of inst.partialPayments) addReceipt(p.createdAt, p.amount);
        addReceipt(inst.paidAt, paid - fromRows);
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
      },
      byStatus,
      monthly: timeline.map((m) => ({ ...m, received: round(buckets.get(m.key) ?? 0) })),
    };
  }
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
