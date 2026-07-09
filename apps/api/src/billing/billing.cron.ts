import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { BillingSettingsService } from './billing-settings.service';
import { renderTemplate } from './billing.constants';

type ChargeType = 'REMINDER' | 'DUE' | 'OVERDUE';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

@Injectable()
export class BillingCron {
  private readonly logger = new Logger(BillingCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly settings: BillingSettingsService,
  ) {}

  // Runs hourly; each user is only processed during their configured sendHour.
  // Server timezone is expected to be America/Sao_Paulo (TZ env in Docker).
  @Cron(CronExpression.EVERY_HOUR)
  async hourlySweep() {
    const hour = new Date().getHours();
    const allSettings = await this.prisma.billingSettings.findMany({
      where: { sendHour: hour },
    });
    for (const s of allSettings) {
      try {
        await this.processUser(s.userId);
      } catch (err: any) {
        this.logger.error(`processUser(${s.userId}) failed: ${err?.message}`);
      }
    }
  }

  /** Processes a single user's due/overdue installments. Also exposed for manual runs. */
  async processUser(userId: string): Promise<{ sent: number; skipped: string }> {
    const settings = await this.settings.getOrCreate(userId);

    const connected = await this.whatsapp.isConnected(userId);
    if (!connected) return { sent: 0, skipped: 'whatsapp_not_connected' };

    const global = {
      remindBeforeEnabled: settings.remindBeforeEnabled,
      daysBefore: settings.daysBefore,
      sendOnDueDate: settings.sendOnDueDate,
      overdueEnabled: settings.overdueEnabled,
      overdueIntervalDays: settings.overdueIntervalDays,
    };

    const installments = await this.prisma.installment.findMany({
      where: {
        doNotCharge: false,
        status: { not: 'PAID' },
        type: { not: 'INTEREST' },
        loan: { userId, status: 'ACTIVE', doNotCharge: false },
      },
      include: { loan: { include: { borrower: true } } },
    });

    const today = new Date();
    const todayStart = startOfDay(today);
    let sent = 0;

    for (const inst of installments) {
      const cfg = this.settings.resolveForLoan(global, inst.loan);
      const daysUntil = daysBetween(today, new Date(inst.dueDate));

      let type: ChargeType | null = null;
      if (daysUntil > 0 && cfg.remindBeforeEnabled && cfg.daysBefore > 0 && daysUntil === cfg.daysBefore) {
        type = 'REMINDER';
      } else if (daysUntil === 0 && cfg.sendOnDueDate) {
        type = 'DUE';
      } else if (daysUntil < 0 && cfg.overdueEnabled) {
        const interval = Math.max(1, cfg.overdueIntervalDays);
        if (Math.abs(daysUntil) % interval === 0) type = 'OVERDUE';
      }
      if (!type) continue;

      // Idempotency: at most one message of this type per installment per day.
      const alreadyToday = await this.prisma.chargeLog.findFirst({
        where: { installmentId: inst.id, type, sentAt: { gte: todayStart } },
      });
      if (alreadyToday) continue;

      // Cap on total overdue messages, if configured (0 = unlimited).
      if (type === 'OVERDUE' && settings.maxOverdueMessages > 0) {
        const overdueCount = await this.prisma.chargeLog.count({
          where: { installmentId: inst.id, type: 'OVERDUE', status: 'SENT' },
        });
        if (overdueCount >= settings.maxOverdueMessages) continue;
      }

      const template =
        type === 'REMINDER'
          ? settings.reminderTemplate
          : type === 'DUE'
            ? settings.dueTemplate
            : settings.overdueTemplate;

      const message = renderTemplate(template, {
        nome: inst.loan.borrower.name,
        valor: inst.amount - (inst.paidAmount || 0),
        vencimento: new Date(inst.dueDate),
        parcela: inst.installmentNumber,
        total: inst.loan.totalAmount,
      });

      try {
        const messageId = await this.whatsapp.sendMessage(
          userId,
          inst.loan.borrower.whatsapp,
          message,
        );
        await this.prisma.chargeLog.create({
          data: {
            installmentId: inst.id,
            type,
            status: 'SENT',
            message,
            evolutionMessageId: messageId || null,
          },
        });
        sent++;
      } catch (err: any) {
        await this.prisma.chargeLog.create({
          data: {
            installmentId: inst.id,
            type,
            status: 'FAILED',
            message,
            error: err?.message?.slice(0, 500) || 'unknown',
          },
        });
      }
    }

    return { sent, skipped: 'none' };
  }
}
