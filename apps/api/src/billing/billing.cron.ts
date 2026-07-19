import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { GlobalWhatsappService } from '../global-whatsapp/global-whatsapp.service';
import { OutboundService } from '../outbound/outbound.service';
import { BillingSettingsService } from './billing-settings.service';
import { renderTemplate } from './billing.constants';

type ChargeType = 'REMINDER' | 'DUE' | 'OVERDUE';

// Global sends are spread across this window (jitter) so a whole hour's worth of
// users never enqueues with the same scheduledFor. The worker's per-instance rate
// limit is the real throttle; this just avoids a thundering herd at tick time.
const GLOBAL_STAGGER_MS = 10 * 60 * 1000;

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
    private readonly pool: GlobalWhatsappService,
    private readonly outbound: OutboundService,
    private readonly settings: BillingSettingsService,
  ) {}

  // Runs hourly; each user is only processed during their configured sendHour.
  // Server timezone is expected to be America/Sao_Paulo (TZ env in Docker).
  @Cron(CronExpression.EVERY_HOUR)
  async hourlySweep() {
    const hour = new Date().getHours();
    const allSettings = await this.prisma.billingSettings.findMany({
      where: { sendHour: hour, whatsappMode: { not: 'MANUAL' } },
    });
    for (const s of allSettings) {
      try {
        await this.processUser(s.userId);
      } catch (err: any) {
        this.logger.error(`processUser(${s.userId}) failed: ${err?.message}`);
      }
    }
  }

  /** Enqueues a single user's due/overdue installments. Also exposed for manual runs. */
  async processUser(userId: string): Promise<{ queued: number; skipped: string }> {
    const settings = await this.settings.getOrCreate(userId);
    const user = await this.prisma.systemUser.findUnique({ where: { id: userId } });
    if (!user) return { queued: 0, skipped: 'user_not_found' };

    const userMode = settings.whatsappMode;
    if (userMode === 'MANUAL') return { queued: 0, skipped: 'manual_mode' };

    // Connectivity prechecks (once per user) so we don't pile messages that can't send.
    const ownConnected = await this.whatsapp.isConnected(userId);
    const globalAvailable = await this.pool.hasConnected();

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
        // Cancelled contracts and deactivated clients are never charged.
        loan: { userId, status: 'ACTIVE', doNotCharge: false, borrower: { isActive: true } },
      },
      include: { loan: { include: { borrower: true } } },
    });

    const today = new Date();
    const todayStart = startOfDay(today);
    let queued = 0;

    for (const inst of installments) {
      const cfg = this.settings.resolveForLoan(global, inst.loan);
      const mode = this.settings.resolveMode(userMode, inst.loan.whatsappMode);
      if (mode === 'MANUAL') continue;
      if (mode === 'OWN' && !ownConnected) continue;
      if (mode === 'GLOBAL' && !globalAvailable) continue;

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

      // Idempotency: at most one charge of this type per installment per day.
      // A QUEUED ChargeLog (already enqueued today) also counts.
      const alreadyToday = await this.prisma.chargeLog.findFirst({
        where: { installmentId: inst.id, type, sentAt: { gte: todayStart } },
      });
      if (alreadyToday) continue;

      // Cap on total overdue messages, if configured (0 = unlimited).
      if (type === 'OVERDUE' && settings.maxOverdueMessages > 0) {
        const overdueCount = await this.prisma.chargeLog.count({
          where: { installmentId: inst.id, type: 'OVERDUE', status: { in: ['SENT', 'QUEUED'] } },
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
        credor: user.name,
        telefone_credor: settings.contactPhone || '',
      });

      // Record intent first (QUEUED) for idempotency, then enqueue for the worker.
      const log = await this.prisma.chargeLog.create({
        data: { installmentId: inst.id, type, status: 'QUEUED', message },
      });

      const scheduledFor =
        mode === 'GLOBAL'
          ? new Date(Date.now() + Math.floor(Math.random() * GLOBAL_STAGGER_MS))
          : new Date();

      await this.outbound.enqueue({
        userId,
        phone: inst.loan.borrower.whatsapp,
        message,
        mode,
        purpose: 'BILLING',
        chargeLogId: log.id,
        scheduledFor,
      });
      queued++;
    }

    return { queued, skipped: 'none' };
  }

  /**
   * Sends a charge for a single installment right now ("forçar envio"), triggered
   * from the UI. This is the automatic counterpart to the manual wa.me link: it
   * dispatches through the outbound queue (drained within seconds) using whichever
   * connected number is available — the user's own when connected, otherwise the
   * shared platform number. Throws a user-facing error when no channel is available.
   */
  async chargeInstallmentNow(userId: string, installmentId: string) {
    const inst = await this.prisma.installment.findFirst({
      where: { id: installmentId },
      include: { loan: { include: { borrower: true } } },
    });
    if (!inst || inst.loan.userId !== userId) {
      throw new NotFoundException('Parcela não encontrada');
    }
    if (inst.status === 'PAID') {
      throw new BadRequestException('Esta parcela já está quitada');
    }
    if (inst.loan.status === 'CANCELED') {
      throw new BadRequestException('Este contrato está cancelado');
    }
    if (!inst.loan.borrower.isActive) {
      throw new BadRequestException('Este cliente está desativado');
    }

    const settings = await this.settings.getOrCreate(userId);
    const user = await this.prisma.systemUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const mode = await this.resolveSendMode(userId, settings.whatsappMode);

    // Pick the template that matches where the installment sits relative to today.
    const daysUntil = daysBetween(new Date(), new Date(inst.dueDate));
    const type: ChargeType = daysUntil < 0 ? 'OVERDUE' : daysUntil === 0 ? 'DUE' : 'REMINDER';
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
      credor: user.name,
      telefone_credor: settings.contactPhone || '',
    });

    const log = await this.prisma.chargeLog.create({
      data: { installmentId: inst.id, type, status: 'QUEUED', message },
    });

    await this.outbound.enqueue({
      userId,
      phone: inst.loan.borrower.whatsapp,
      message,
      mode,
      purpose: 'BILLING',
      chargeLogId: log.id,
      scheduledFor: new Date(),
    });

    return { queued: true, mode };
  }

  /**
   * Sends a custom (consolidated) charge message to a borrower right now. The text
   * is composed on the client — it spans several installments/contracts — so we send
   * it as-is, only appending a creditor identification when going out through the
   * shared platform number (which is anonymous to the debtor).
   */
  async sendCustomCharge(userId: string, borrowerId: string, rawMessage: string) {
    const message = (rawMessage || '').trim();
    if (!message) throw new BadRequestException('Mensagem vazia');

    const borrower = await this.prisma.borrower.findFirst({ where: { id: borrowerId, userId } });
    if (!borrower) throw new NotFoundException('Devedor não encontrado');

    const settings = await this.settings.getOrCreate(userId);
    const user = await this.prisma.systemUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const mode = await this.resolveSendMode(userId, settings.whatsappMode);

    let finalMessage = message;
    if (mode === 'GLOBAL') {
      const note = settings.contactPhone
        ? renderTemplate(
            'Cobrança automática em nome de {{credor}}. Dúvidas? Fale com {{credor}}: {{telefone_credor}}.',
            {
              nome: '',
              valor: 0,
              vencimento: new Date(),
              parcela: 0,
              total: 0,
              credor: user.name,
              telefone_credor: settings.contactPhone,
            },
          )
        : `Cobrança automática em nome de ${user.name}.`;
      finalMessage = `${message}\n\n${note}`;
    }

    await this.outbound.enqueue({
      userId,
      phone: borrower.whatsapp,
      message: finalMessage,
      mode,
      purpose: 'BILLING',
      scheduledFor: new Date(),
    });

    return { queued: true, mode };
  }

  /**
   * Resolves which connected channel to send through, preferring the user's configured
   * one but falling back to whatever is available. Throws a user-facing error when
   * neither the user's own number nor the shared platform number can send right now.
   */
  private async resolveSendMode(userId: string, preferred: string): Promise<'OWN' | 'GLOBAL'> {
    const ownConnected = await this.whatsapp.isConnected(userId);
    const globalAvailable = await this.pool.hasConnected();

    const mode: 'OWN' | 'GLOBAL' =
      preferred === 'GLOBAL'
        ? globalAvailable
          ? 'GLOBAL'
          : 'OWN'
        : ownConnected
          ? 'OWN'
          : 'GLOBAL';

    if (mode === 'OWN' && !ownConnected) {
      throw new BadRequestException(
        'Seu WhatsApp não está conectado. Conecte na aba WhatsApp ou envie manualmente.',
      );
    }
    if (mode === 'GLOBAL' && !globalAvailable) {
      throw new BadRequestException(
        'Envio automático indisponível no momento. Tente novamente ou envie manualmente.',
      );
    }
    return mode;
  }
}
