export type WhatsappMode = 'MANUAL' | 'OWN' | 'GLOBAL';

export type WhatsappStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

export interface BillingSettings {
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
}
