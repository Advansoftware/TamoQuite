import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Public contract sharing.
 *
 * The token is the whole security boundary: anyone holding the link sees the
 * contract, so it must be unguessable (192 bits of randomness) and revocable.
 * The public payload is assembled field by field — never spread from the Prisma
 * row — so a future column can't leak by accident.
 */
@Injectable()
export class ShareService {
  constructor(private readonly prisma: PrismaService) {}

  private newToken() {
    return randomBytes(24).toString('base64url'); // 32 url-safe chars
  }

  /** Current link for a contract the caller owns, or null if never shared/revoked. */
  async get(userId: string, loanId: string) {
    await this.assertOwned(userId, loanId);
    const share = await this.prisma.loanShare.findUnique({ where: { loanId } });
    if (!share || share.revokedAt) return { active: false as const };
    return {
      active: true as const,
      token: share.token,
      createdAt: share.createdAt,
      viewCount: share.viewCount,
      lastViewedAt: share.lastViewedAt,
    };
  }

  /**
   * Creates the link, or revives a revoked one with a fresh token. Re-enabling
   * always rotates the token so a previously shared URL stays dead.
   */
  async enable(userId: string, loanId: string) {
    await this.assertOwned(userId, loanId);
    const existing = await this.prisma.loanShare.findUnique({ where: { loanId } });

    if (existing && !existing.revokedAt) {
      return { active: true as const, token: existing.token, createdAt: existing.createdAt };
    }

    const token = this.newToken();
    const share = existing
      ? await this.prisma.loanShare.update({
          where: { loanId },
          data: { token, revokedAt: null, createdAt: new Date(), viewCount: 0, lastViewedAt: null },
        })
      : await this.prisma.loanShare.create({ data: { loanId, token } });

    return { active: true as const, token: share.token, createdAt: share.createdAt };
  }

  /** Kills the link. The row survives — nothing in this system is deleted. */
  async revoke(userId: string, loanId: string) {
    await this.assertOwned(userId, loanId);
    const share = await this.prisma.loanShare.findUnique({ where: { loanId } });
    if (!share || share.revokedAt) return { active: false as const };
    await this.prisma.loanShare.update({ where: { loanId }, data: { revokedAt: new Date() } });
    return { active: false as const };
  }

  /**
   * The unauthenticated read. Returns only what a debtor needs to check their
   * own contract: who lent, how much, and the state of each installment.
   */
  async viewByToken(token: string) {
    const share = await this.prisma.loanShare.findUnique({
      where: { token },
      include: {
        loan: {
          include: {
            borrower: true,
            user: { include: { billingSettings: true } },
            installments: {
              orderBy: { installmentNumber: 'asc' },
              include: { partialPayments: { orderBy: { createdAt: 'asc' } } },
            },
          },
        },
      },
    });

    if (!share || share.revokedAt) throw new NotFoundException('Link indisponível');

    // Best-effort view counter; a failure here must never block the read.
    this.prisma.loanShare
      .update({
        where: { id: share.id },
        data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
      })
      .catch(() => undefined);

    const loan = share.loan;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const installments = loan.installments.map((inst) => {
      const overdue = inst.status !== 'PAID' && new Date(inst.dueDate) < today;
      return {
        number: inst.installmentNumber,
        dueDate: inst.dueDate,
        amount: inst.amount,
        // Derived so the shared page shows "Atrasada" without the reader
        // having to compare dates themselves.
        status: overdue ? 'OVERDUE' : inst.status,
        paidAmount: inst.paidAmount,
        paidAt: inst.paidAt,
        payments: inst.partialPayments.map((p) => ({ amount: p.amount, date: p.createdAt })),
      };
    });

    const totalPaid = loan.installments.reduce((s, i) => s + i.paidAmount, 0);
    const nextDue = installments.find((i) => i.status !== 'PAID') ?? null;

    return {
      lender: {
        name: loan.user.name,
        // Already published to debtors in charge messages; lets them reply to a human.
        contactPhone: loan.user.billingSettings?.contactPhone ?? null,
      },
      // The debtor's own phone, shown so they can confirm the contract is
      // really theirs. Nothing else from the borrower record is exposed.
      borrower: { name: loan.borrower.name, phone: loan.borrower.whatsapp },
      contract: {
        // Principal and rate are deliberately absent: the debtor is shown what
        // they owe, not how the lender priced it. Leaving them in the JSON would
        // expose them to anyone who opens devtools, even though nothing renders them.
        totalAmount: loan.totalAmount,
        installmentCount: loan.installmentCount,
        startDate: loan.startDate,
        paymentFrequency: loan.paymentFrequency,
        status: loan.status,
        createdAt: loan.createdAt,
      },
      summary: {
        totalPaid,
        remaining: Math.max(loan.totalAmount - totalPaid, 0),
        paidCount: loan.installments.filter((i) => i.status === 'PAID').length,
        nextDueDate: nextDue?.dueDate ?? null,
        nextDueAmount: nextDue ? nextDue.amount - nextDue.paidAmount : null,
        overdueCount: installments.filter((i) => i.status === 'OVERDUE').length,
      },
      installments,
    };
  }

  private async assertOwned(userId: string, loanId: string) {
    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, userId }, select: { id: true } });
    if (!loan) throw new NotFoundException('Loan not found');
  }
}
