export interface SubscriptionInfo {
  status: string;
  hasSubscription: boolean;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
}
