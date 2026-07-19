import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PAGE_SIZE = 30;

export interface ChargeHistoryQuery {
  status?: string; // QUEUED | SENT | FAILED
  borrowerId?: string;
  cursor?: string;
  limit?: number;
}

/**
 * Read model for "cobranças enviadas".
 *
 * Every query is scoped through installment -> loan -> userId, so a user can
 * only ever see charges belonging to their own contracts. There is no code path
 * here that reads ChargeLog without that ownership filter.
 */
@Injectable()
export class ChargeHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, q: ChargeHistoryQuery) {
    const take = Math.min(Math.max(q.limit ?? PAGE_SIZE, 1), 100);

    const where = {
      // Ownership filter — never remove.
      // Ownership + visibility: charges of a deleted contract, or of a client
      // the user deactivated, are gone from the history too.
      installment: {
        loan: {
          userId,
          deletedAt: null,
          borrower: { isActive: true },
          ...(q.borrowerId ? { borrowerId: q.borrowerId } : {}),
        },
      },
      ...(q.status ? { status: q.status } : {}),
    };

    const rows = await this.prisma.chargeLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: take + 1, // one extra to detect the next page
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      include: {
        installment: {
          select: {
            id: true,
            installmentNumber: true,
            dueDate: true,
            amount: true,
            loan: {
              select: {
                id: true,
                borrower: { select: { id: true, name: true, whatsapp: true } },
              },
            },
          },
        },
      },
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;

    return {
      items: page.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        message: r.message,
        error: r.error,
        sentAt: r.sentAt,
        deliveryStatus: r.deliveryStatus,
        deliveredAt: r.deliveredAt,
        readAt: r.readAt,
        loanId: r.installment.loan.id,
        installmentNumber: r.installment.installmentNumber,
        dueDate: r.installment.dueDate,
        amount: r.installment.amount,
        borrowerId: r.installment.loan.borrower.id,
        borrowerName: r.installment.loan.borrower.name,
        borrowerWhatsapp: r.installment.loan.borrower.whatsapp,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  /** Counters for the filter chips — same ownership scoping as list(). */
  async summary(userId: string) {
    const base = {
      installment: { loan: { userId, deletedAt: null, borrower: { isActive: true } } },
    };
    const [total, sent, failed, queued] = await Promise.all([
      this.prisma.chargeLog.count({ where: base }),
      this.prisma.chargeLog.count({ where: { ...base, status: 'SENT' } }),
      this.prisma.chargeLog.count({ where: { ...base, status: 'FAILED' } }),
      this.prisma.chargeLog.count({ where: { ...base, status: 'QUEUED' } }),
    ]);
    return { total, sent, failed, queued };
  }
}
