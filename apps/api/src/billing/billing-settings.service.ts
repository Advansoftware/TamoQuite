import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_DUE_TEMPLATE,
  DEFAULT_OVERDUE_TEMPLATE,
  DEFAULT_REMINDER_TEMPLATE,
} from './billing.constants';

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
    await this.getOrCreate(userId);
    const data: Record<string, unknown> = {};
    for (const key of [
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
    return this.prisma.billingSettings.update({ where: { userId }, data });
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
