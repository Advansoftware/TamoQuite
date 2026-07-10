import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_DUE_TEMPLATE,
  DEFAULT_GLOBAL_DUE_TEMPLATE,
  DEFAULT_GLOBAL_OVERDUE_TEMPLATE,
  DEFAULT_GLOBAL_REMINDER_TEMPLATE,
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

    // In GLOBAL mode the shared number is anonymous to the debtor, so every message
    // must name the creditor. Any template still missing {{credor}} is auto-filled
    // with the global default (which already includes {{credor}}/{{telefone_credor}}),
    // so switching modes never breaks or blocks the save.
    // Only auto-fill when switching INTO global mode, so later template edits in
    // the billing tab are never silently overwritten.
    const switchingToGlobal = data.whatsappMode === 'GLOBAL' && current.whatsappMode !== 'GLOBAL';
    if (switchingToGlobal) {
      const fills: [keyof typeof current, string, string][] = [
        ['reminderTemplate', 'reminderTemplate', DEFAULT_GLOBAL_REMINDER_TEMPLATE],
        ['dueTemplate', 'dueTemplate', DEFAULT_GLOBAL_DUE_TEMPLATE],
        ['overdueTemplate', 'overdueTemplate', DEFAULT_GLOBAL_OVERDUE_TEMPLATE],
      ];
      for (const [field, key, fallback] of fills) {
        const effective = (data[key] as string | undefined) ?? (current[field] as string);
        if (!hasCreditorPlaceholder(effective)) data[key] = fallback;
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
