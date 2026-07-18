export interface SubscriptionInfo {
  status: string;
  hasSubscription: boolean;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  // Present on the settings view; the notification bell ignores these.
  amount?: number | null;
  currency?: string | null;
  interval?: string | null;
}
