import { formatPhoneDisplay, toE164Digits } from './phone';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'PAID':
      return 'text-neon';
    case 'PARTIAL':
      return 'text-warning';
    case 'OVERDUE':
      return 'text-danger';
    default:
      return 'text-muted-foreground';
  }
}

export function getStatusBgColor(status: string): string {
  switch (status) {
    case 'PAID':
      return 'bg-neon-dim text-neon border-neon/20';
    case 'PARTIAL':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'OVERDUE':
      return 'bg-danger/10 text-danger border-danger/20';
    default:
      return 'bg-secondary text-muted-foreground border-border';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'PAID':
      return 'Pago';
    case 'PARTIAL':
      return 'Parcial';
    case 'OVERDUE':
      return 'Atrasado';
    default:
      return 'Pendente';
  }
}

export function getDaysLabel(days: number): string {
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  if (days > 1) return `Faltam ${days} dias`;
  if (days === -1) return 'Venceu ontem';
  return `Venceu há ${Math.abs(days)} dias`;
}

export function formatPhone(phone: string): string {
  return formatPhoneDisplay(phone);
}

export function generateWhatsAppLink(phone: string, message: string): string {
  // Stored value already includes the country dial code (legacy BR numbers
  // without a code are normalized to +55 by toE164Digits).
  const digits = toE164Digits(phone);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encoded}`;
}

export function generateChargeMessage(name: string, amount: number, dueDate: string): string {
  const formattedDate = formatDate(dueDate);
  return `Opa ${name}! 💰 Passando pra lembrar da parcela de ${formatCurrency(amount)} que vence dia ${formattedDate}. Tamo junto! 🤝`;
}

// Stripe subscription statuses that grant access to the app. `trialing` covers the
// 7-day free trial; `active` is a paying subscription.
const ACCESS_SUBSCRIPTION_STATUSES = ['active', 'trialing'];

export function hasActiveSubscription(status?: string | null): boolean {
  return !!status && ACCESS_SUBSCRIPTION_STATUSES.includes(status);
}