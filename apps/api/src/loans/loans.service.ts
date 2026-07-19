import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addPeriods, normalizeFrequency, parseDateOnly } from '../common/period.util';
import { computeLoanTotals, splitIntoInstallments } from './loan-math';
import { CreateLoanDto } from './dto/create-loan.dto';

const LOAN_INCLUDE = {
  borrower: true,
  installments: { orderBy: { installmentNumber: 'asc' as const } },
};

/** Soft-deleted contracts are invisible everywhere. Every read starts from this. */
export const NOT_DELETED = { deletedAt: null } as const;

/**
 * What counts as a live contract for anything that lists or totals on its own:
 * not deleted, and belonging to a client who is still active.
 *
 * Deactivating a client is reversible, so this is expressed as a filter over the
 * relation instead of a flag copied onto the loans. Reactivating flips one field
 * on the Borrower and every contract, parcela and total comes back exactly as it
 * was — there is no unwind step that could miss a row.
 *
 * Lookups by id (loan detail, a single parcela) deliberately use NOT_DELETED
 * only: you can still open a deactivated client's contract from their own page,
 * you just never stumble into it from a list or a total.
 */
export const VISIBLE_LOAN = { deletedAt: null, borrower: { isActive: true } } as const;

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
      where: { userId, ...VISIBLE_LOAN },
      orderBy: { createdAt: 'desc' },
      include: LOAN_INCLUDE,
    });
  }

  async get(userId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, userId, ...NOT_DELETED },
      include: LOAN_INCLUDE,
    });
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

    // Simple interest on the original principal (see loan-math.ts). When the
    // client sends the total the user actually typed, that number is the truth —
    // re-deriving it from the 2-decimal rate is what turned R$250 into 249,98.
    const totalAmount =
      dto.totalAmount !== undefined
        ? Math.round(dto.totalAmount * 100) / 100
        : computeLoanTotals(dto.originalAmount, interestRate, dto.installmentCount).totalAmount;

    // Cents are distributed instead of repeating a rounded parcela, so the
    // installments always add up to exactly `totalAmount`.
    const amounts = splitIntoInstallments(totalAmount, dto.installmentCount);

    // The date the user enters IS the first installment's due date; subsequent
    // installments fall one period after each other — unless the user set the
    // dates by hand (someone paying earlier than the scheduled due date).
    const start = parseDateOnly(dto.startDate);
    if (dto.dueDates && dto.dueDates.length !== dto.installmentCount) {
      throw new BadRequestException('As datas de vencimento não batem com o número de parcelas');
    }
    const dueDates = dto.dueDates
      ? dto.dueDates.map((d) => parseDateOnly(d))
      : Array.from({ length: dto.installmentCount }, (_v, idx) => addPeriods(start, frequency, idx));

    const installmentsData = amounts.map((amount, idx) => ({
      installmentNumber: idx + 1,
      dueDate: dueDates[idx],
      amount,
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
        startDate: dueDates[0] ?? start,
        paymentFrequency: frequency,
        status: 'ACTIVE',
        installments: { create: installmentsData },
      },
      include: LOAN_INCLUDE,
    });
  }

  /**
   * Deletes a contract from the user's point of view: it disappears along with
   * its parcelas, its cobranças and its public link, and nothing it holds is
   * ever counted in a total again. The rows stay in the database purely so a
   * past contract can still be audited — no screen reads them back.
   */
  async remove(userId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({ where: { id, userId, ...NOT_DELETED } });
    if (!loan) throw new NotFoundException('Not found');

    const now = new Date();

    // OutboundMessage.chargeLogId is a plain column, not a relation, so the
    // queued messages for this contract have to be looked up by id.
    const chargeLogs = await this.prisma.chargeLog.findMany({
      where: { installment: { loanId: id } },
      select: { id: true },
    });

    await this.prisma.$transaction([
      this.prisma.loan.update({
        where: { id },
        data: { deletedAt: now, status: 'CANCELED', canceledAt: loan.canceledAt ?? now },
      }),
      // A live share link would keep serving a contract the user deleted.
      this.prisma.loanShare.updateMany({
        where: { loanId: id, revokedAt: null },
        data: { revokedAt: now },
      }),
      // Anything still queued must not reach the debtor — the worker only ever
      // picks up PENDING rows, so parking them here takes them out of play.
      this.prisma.outboundMessage.updateMany({
        where: { chargeLogId: { in: chargeLogs.map((c) => c.id) }, status: 'PENDING' },
        data: { status: 'CANCELED', error: 'contrato excluído' },
      }),
    ]);

    return { success: true as const };
  }

  async updateBilling(userId: string, id: string, patch: BillingOverridePatch) {
    const loan = await this.prisma.loan.findFirst({ where: { id, userId, ...NOT_DELETED } });
    if (!loan) throw new NotFoundException('Loan not found');

    const data: Record<string, unknown> = {};
    for (const key of BILLING_KEYS) {
      if (patch[key] !== undefined) data[key] = patch[key];
    }

    return this.prisma.loan.update({ where: { id }, data });
  }
}
