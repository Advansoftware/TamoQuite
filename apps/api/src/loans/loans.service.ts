import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addPeriods, normalizeFrequency, parseDateOnly } from '../common/period.util';
import { computeLoanTotals, splitIntoInstallments } from './loan-math';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';

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
   * Corrects a contract that was created with the wrong numbers — a typo in the
   * value, the wrong number of parcelas, dates that don't match what was agreed.
   *
   * Two levels of editing, depending on whether the contract has been touched:
   *
   *  - **Money** (valor, juros, total, nº de parcelas) rebuilds the whole
   *    schedule, so it is only allowed while every parcela is still pending. Once
   *    something is paid, rewriting the amounts would strand that payment against
   *    a value that no longer exists — so it is refused.
   *  - **Dates** (vencimentos, periodicidade) can be corrected at any time,
   *    because moving a due date never invalidates a payment. A parcela that is
   *    already quitada keeps its date though — that date is part of the settled
   *    record — so only the still-open parcelas move.
   *  - **The client** never touches the schedule and can always be fixed.
   *
   * Parcelas are reconciled in place rather than dropped and recreated, so the
   * ones that survive keep their id — and with it their cobrança history, which
   * a delete would cascade away.
   */
  async update(userId: string, id: string, dto: UpdateLoanDto) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, userId, ...NOT_DELETED },
      include: { installments: { orderBy: { installmentNumber: 'asc' } } },
    });
    if (!loan) throw new NotFoundException('Loan not found');

    const touchesMoney =
      dto.originalAmount !== undefined ||
      dto.interestRate !== undefined ||
      dto.totalAmount !== undefined ||
      dto.installmentCount !== undefined;

    const touchesDates =
      dto.startDate !== undefined || dto.frequency !== undefined || dto.dueDates !== undefined;

    const hasPayments = loan.installments.some(
      (inst) => inst.paidAmount > 0 || inst.status !== 'PENDING',
    );

    // Money changes rebuild the parcelas, so they need an untouched schedule.
    // Undo the payments first, then edit the value or the parcelamento.
    if (touchesMoney && hasPayments) {
      throw new BadRequestException(
        'Este contrato já tem parcelas pagas. Desfaça os pagamentos antes de alterar o valor ou o número de parcelas.',
      );
    }

    const data: Record<string, unknown> = {};

    if (dto.borrowerId !== undefined && dto.borrowerId !== loan.borrowerId) {
      const borrower = await this.prisma.borrower.findFirst({
        where: { id: dto.borrowerId, userId },
      });
      if (!borrower) throw new NotFoundException('Devedor não encontrado');
      data.borrowerId = dto.borrowerId;
    }

    // Nothing about the schedule changed — just the client (or nothing at all).
    if (!touchesMoney && !touchesDates) {
      if (Object.keys(data).length === 0) return this.get(userId, id);
      await this.prisma.loan.update({ where: { id }, data });
      return this.get(userId, id);
    }

    // Dates only: correct the vencimentos without rebuilding the amounts. Works
    // even on a contract with payments, but a quitada parcela keeps its date.
    if (!touchesMoney) {
      return this.updateDatesOnly(userId, id, loan, dto, data);
    }

    // Rebuild from the merged state: whatever the user sent wins, everything
    // else keeps what the contract already had.
    const frequency = normalizeFrequency(dto.frequency ?? loan.paymentFrequency);
    const originalAmount = dto.originalAmount ?? loan.originalAmount;
    const installmentCount = dto.installmentCount ?? loan.installmentCount;
    const interestRate =
      dto.interestRate !== undefined
        ? Math.round(dto.interestRate * 100) / 100
        : loan.interestRate;

    // Same rule as create: an explicit total is the truth, because re-deriving
    // it from the 2-decimal rate drifts (250 → 249,98). But once the principal,
    // the rate or the count moved, a stale stored total is no longer meaningful —
    // only a total sent in this very request can stand in for the derived one.
    const totalAmount =
      dto.totalAmount !== undefined
        ? Math.round(dto.totalAmount * 100) / 100
        : dto.originalAmount !== undefined ||
            dto.interestRate !== undefined ||
            dto.installmentCount !== undefined
          ? computeLoanTotals(originalAmount, interestRate, installmentCount).totalAmount
          : loan.totalAmount;

    const amounts = splitIntoInstallments(totalAmount, installmentCount);

    if (dto.dueDates && dto.dueDates.length !== installmentCount) {
      throw new BadRequestException('As datas de vencimento não batem com o número de parcelas');
    }

    const start = parseDateOnly(dto.startDate ?? loan.startDate);
    const dueDates = dto.dueDates
      ? dto.dueDates.map((d) => parseDateOnly(d))
      : Array.from({ length: installmentCount }, (_v, idx) => addPeriods(start, frequency, idx));

    const existing = loan.installments;
    const keep = Math.min(existing.length, installmentCount);

    await this.prisma.$transaction([
      this.prisma.loan.update({
        where: { id },
        data: {
          ...data,
          originalAmount,
          interestRate,
          totalAmount,
          installmentCount,
          startDate: dueDates[0] ?? start,
          paymentFrequency: frequency,
        },
      }),
      // Reused rows: same id, corrected numbers.
      ...existing.slice(0, keep).map((inst, idx) =>
        this.prisma.installment.update({
          where: { id: inst.id },
          data: { installmentNumber: idx + 1, amount: amounts[idx], dueDate: dueDates[idx] },
        }),
      ),
      // The contract grew — the extra parcelas are new rows.
      ...(installmentCount > existing.length
        ? [
            this.prisma.installment.createMany({
              data: Array.from({ length: installmentCount - existing.length }, (_v, i) => {
                const idx = existing.length + i;
                return {
                  loanId: id,
                  installmentNumber: idx + 1,
                  dueDate: dueDates[idx],
                  amount: amounts[idx],
                  status: 'PENDING',
                };
              }),
            }),
          ]
        : []),
      // The contract shrank — the parcelas past the new end go away. They are all
      // PENDING (the guard above guarantees it), so nothing paid is lost.
      ...(existing.length > installmentCount
        ? [
            this.prisma.installment.deleteMany({
              where: { id: { in: existing.slice(installmentCount).map((i) => i.id) } },
            }),
          ]
        : []),
    ]);

    return this.get(userId, id);
  }

  /**
   * Corrects vencimentos on a contract without rebuilding the amounts — the only
   * kind of edit allowed once a parcela has been paid. A quitada parcela never
   * moves (its date is settled history); every still-open parcela takes the new
   * date, with its atrasada flag recomputed the same way the per-parcela endpoint
   * does, so a parcela pushed into the future stops showing as overdue.
   *
   * The parcela count is fixed here — changing it is a money edit, handled above.
   */
  private async updateDatesOnly(
    userId: string,
    id: string,
    loan: { startDate: Date; paymentFrequency: string; installments: Array<{ id: string; status: string; dueDate: Date }> },
    dto: UpdateLoanDto,
    data: Record<string, unknown>,
  ) {
    const existing = loan.installments;
    const frequency = normalizeFrequency(dto.frequency ?? loan.paymentFrequency);

    if (dto.dueDates && dto.dueDates.length !== existing.length) {
      throw new BadRequestException('As datas de vencimento não batem com o número de parcelas');
    }

    const start = parseDateOnly(dto.startDate ?? loan.startDate);
    const dueDates = dto.dueDates
      ? dto.dueDates.map((d) => parseDateOnly(d))
      : existing.map((_v, idx) => addPeriods(start, frequency, idx));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // A quitada parcela keeps its date, so the loan's startDate anchors to the
    // first parcela that actually moved (or its current start if none did).
    const firstOpenIdx = existing.findIndex((inst) => inst.status !== 'PAID');

    const dateUpdates = existing
      .map((inst, idx) => {
        if (inst.status === 'PAID') return null;
        const dueDate = dueDates[idx];
        const stillOpen = inst.status === 'PENDING' || inst.status === 'OVERDUE';
        const status = stillOpen ? (dueDate < todayStart ? 'OVERDUE' : 'PENDING') : inst.status;
        return this.prisma.installment.update({ where: { id: inst.id }, data: { dueDate, status } });
      })
      .filter((op): op is NonNullable<typeof op> => op !== null);

    await this.prisma.$transaction([
      this.prisma.loan.update({
        where: { id },
        data: {
          ...data,
          paymentFrequency: frequency,
          startDate: firstOpenIdx >= 0 ? dueDates[firstOpenIdx] : loan.startDate,
        },
      }),
      ...dateUpdates,
    ]);

    return this.get(userId, id);
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
