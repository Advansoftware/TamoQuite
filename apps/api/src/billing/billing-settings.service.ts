import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_DUE_TEMPLATE,
  DEFAULT_OVERDUE_TEMPLATE,
  DEFAULT_REMINDER_TEMPLATE,
  hasCreditorPlaceholder,
} from './billing.constants';

export type WhatsappMode = 'MANUAL' | 'OWN' | 'GLOBAL';

export interface EffectiveBillingConfig {
  remindBeforeEnabled: boolean;
  daysBefore: number;
  sendOnDueDate: boolean;
  overdueEnabled: boolean;
  overdueIntervalDays: number;
}

@Injectable()
export class BillingSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    const existing = await this.prisma.billingSettings.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.billingSettings.create({
      data: {
        userId,
        reminderTemplate: DEFAULT_REMINDER_TEMPLATE,
        dueTemplate: DEFAULT_DUE_TEMPLATE,
        overdueTemplate: DEFAULT_OVERDUE_TEMPLATE,
      },
    });
  }

  async update(
    userId: string,
    body: Partial<{
      whatsappMode: WhatsappMode;
      contactPhone: string | null;
      remindBeforeEnabled: boolean;
      daysBefore: number;
      sendOnDueDate: boolean;
      overdueEnabled: boolean;
      overdueIntervalDays: number;
      maxOverdueMessages: number;
      sendHour: number;
      reminderTemplate: string;
      dueTemplate: string;
      overdueTemplate: string;
    }>,
  ) {
    const current = await this.getOrCreate(userId);
    const data: Record<string, unknown> = {};
    for (const key of [
      'whatsappMode',
      'contactPhone',
      'remindBeforeEnabled',
      'daysBefore',
      'sendOnDueDate',
      'overdueEnabled',
      'overdueIntervalDays',
      'maxOverdueMessages',
      'sendHour',
      'reminderTemplate',
      'dueTemplate',
      'overdueTemplate',
    ] as const) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    // In GLOBAL mode the shared number requires every template to name the creditor.
    const mode = (data.whatsappMode as WhatsappMode | undefined) ?? (current.whatsappMode as WhatsappMode);
    if (mode === 'GLOBAL') {
      const templates = {
        reminderTemplate: (data.reminderTemplate as string) ?? current.reminderTemplate,
        dueTemplate: (data.dueTemplate as string) ?? current.dueTemplate,
        overdueTemplate: (data.overdueTemplate as string) ?? current.overdueTemplate,
      };
      const missing = Object.entries(templates)
        .filter(([, tpl]) => !hasCreditorPlaceholder(tpl))
        .map(([k]) => k);
      if (missing.length > 0) {
        throw new BadRequestException(
          'No modo Global, todas as mensagens devem incluir {{credor}} para identificar quem está cobrando.',
        );
      }
    }

    return this.prisma.billingSettings.update({ where: { userId }, data });
  }

  /** Effective sending mode for a loan: per-contract override wins over the user default. */
  resolveMode(userMode: string, loanMode: string | null): WhatsappMode {
    const mode = (loanMode ?? userMode) as WhatsappMode;
    return mode === 'MANUAL' || mode === 'OWN' || mode === 'GLOBAL' ? mode : 'OWN';
  }

  /** Per-contract override wins over the global settings (null override fields fall back to global). */
  resolveForLoan(
    global: {
      remindBeforeEnabled: boolean;
      daysBefore: number;
      sendOnDueDate: boolean;
      overdueEnabled: boolean;
      overdueIntervalDays: number;
    },
    loan: {
      billingOverride: boolean;
      remindBeforeEnabled: boolean | null;
      daysBefore: number | null;
      sendOnDueDate: boolean | null;
      overdueEnabled: boolean | null;
      overdueIntervalDays: number | null;
    },
  ): EffectiveBillingConfig {
    if (!loan.billingOverride) return { ...global };
    return {
      remindBeforeEnabled: loan.remindBeforeEnabled ?? global.remindBeforeEnabled,
      daysBefore: loan.daysBefore ?? global.daysBefore,
      sendOnDueDate: loan.sendOnDueDate ?? global.sendOnDueDate,
      overdueEnabled: loan.overdueEnabled ?? global.overdueEnabled,
      overdueIntervalDays: loan.overdueIntervalDays ?? global.overdueIntervalDays,
    };
  }
}
