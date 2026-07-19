import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ACCOUNT_RETENTION_DAYS, SUPER_ADMIN_EMAIL } from '../common/constants';

/**
 * Erases accounts that have been deactivated for longer than the retention
 * window promised on the /excluir-conta page.
 *
 * This is the half of "excluir conta" that actually deletes: the endpoint only
 * deactivates, so a user who changed their mind can be recovered by support
 * within the window. Once it closes, the row and everything hanging off it go.
 *
 * The delete is a real delete. Borrowers, loans, installments, charge logs,
 * share links, WhatsApp instance and billing settings all cascade from
 * SystemUser (see schema.prisma). OutboundMessage carries a plain userId with no
 * relation, so it is cleared explicitly first — otherwise queued messages would
 * outlive the account that created them.
 */
@Injectable()
export class AccountPurgeCron {
  private readonly logger = new Logger(AccountPurgeCron.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async purge() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ACCOUNT_RETENTION_DAYS);

    const expired = await this.prisma.systemUser.findMany({
      where: {
        isActive: false,
        deactivatedAt: { not: null, lt: cutoff },
        // Never purge the platform owner, whatever its state.
        email: { not: SUPER_ADMIN_EMAIL },
      },
      select: { id: true, email: true },
    });

    if (expired.length === 0) return;

    for (const user of expired) {
      try {
        await this.prisma.outboundMessage.deleteMany({ where: { userId: user.id } });
        await this.prisma.systemUser.delete({ where: { id: user.id } });
        this.logger.log(`Conta expurgada após ${ACCOUNT_RETENTION_DAYS} dias: ${user.id}`);
      } catch (err: unknown) {
        // One bad row must not stop the rest of the sweep; it retries tomorrow.
        this.logger.error(`Falha ao expurgar a conta ${user.id}: ${String(err)}`);
      }
    }
  }
}
