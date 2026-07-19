import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addPeriods, normalizeFrequency, parseDateOnly } from '../common/period.util';
import { computeLoanTotals } from './loan-math';
import { CreateLoanDto } from './dto/create-loan.dto';

const LOAN_INCLUDE = {
  borrower: true,
  installments: { orderBy: { installmentNumber: 'asc' as const } },
};

// Keys the per-contract billing override endpoint is allowed to patch.
const BILLING_KEYS = [
  'doNotCharge',
  'billingOverride',
  'whatsappMode',
  'remindBeforeEnabled',
  'daysBefore',
  'sendOnDueDate',
  'overdueEnabled',
  'overdueIntervalDays',
] as const;

export type BillingOverridePatch = Partial<Record<(typeof BILLING_KEYS)[number], unknown>>;

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.loan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: LOAN_INCLUDE,
    });
  }

  async get(userId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({ where: { id, userId }, include: LOAN_INCLUDE });
    if (!loan) throw new NotFoundException('Loan not found');
    return loan;
  }

  async create(userId: string, dto: CreateLoanDto) {
    const frequency = normalizeFrequency(dto.frequency);
    // Cap at 2 decimals so a float artefact (e.g. 5.0000000000000004 from a
    // "receber total" calc) never gets persisted.
    const interestRate = Math.round((dto.interestRate ?? 0) * 100) / 100;

    const borrower = await this.prisma.borrower.findFirst({
      where: { id: dto.borrowerId, userId },
    });
    if (!borrower) throw new NotFoundException('Devedor não encontrado');

    // Simple interest on the original principal (see loan-math.ts).
    const { totalAmount, installmentValue } = computeLoanTotals(
      dto.originalAmount,
      interestRate,
      dto.installmentCount,
    );

    // The date the user enters IS the first installment's due date; subsequent
    // installments fall one period after each other.
    const start = parseDateOnly(dto.startDate);
    const installmentsData = Array.from({ length: dto.installmentCount }, (_v, idx) => ({
      installmentNumber: idx + 1,
      dueDate: addPeriods(start, frequency, idx),
      amount: installmentValue,
      status: 'PENDING',
    }));

    return this.prisma.loan.create({
      data: {
        userId,
        borrowerId: dto.borrowerId,
        originalAmount: dto.originalAmount,
        interestRate,
        totalAmount,
        installmentCount: dto.installmentCount,
        startDate: start,
        paymentFrequency: frequency,
        status: 'ACTIVE',
        installments: { create: installmentsData },
      },
      include: LOAN_INCLUDE,
    });
  }

  /**
   * Contracts are never deleted — cancelling keeps the installments, payments
   * and charge history intact, and stops the automatic billing (the cron only
   * looks at ACTIVE loans).
   */
  async cancel(userId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({ where: { id, userId } });
    if (!loan) throw new NotFoundException('Not found');
    if (loan.status === 'CANCELED') return loan;
    return this.prisma.loan.update({
      where: { id },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });
  }

  /** Brings a cancelled contract back; COMPLETED is recomputed on the next payment change. */
  async reactivate(userId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({ where: { id, userId } });
    if (!loan) throw new NotFoundException('Not found');
    const allPaid =
      (await this.prisma.installment.count({
        where: { loanId: id, status: { not: 'PAID' } },
      })) === 0;
    return this.prisma.loan.update({
      where: { id },
      data: { status: allPaid ? 'COMPLETED' : 'ACTIVE', canceledAt: null },
    });
  }

  async updateBilling(userId: string, id: string, patch: BillingOverridePatch) {
    const loan = await this.prisma.loan.findFirst({ where: { id, userId } });
    if (!loan) throw new NotFoundException('Loan not found');

    const data: Record<string, unknown> = {};
    for (const key of BILLING_KEYS) {
      if (patch[key] !== undefined) data[key] = patch[key];
    }

    return this.prisma.loan.update({ where: { id }, data });
  }
}
