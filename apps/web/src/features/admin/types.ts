export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
  createdAt: string;
  subscriptionStatus: string | null;
  trialUsedAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  _count: { borrowers: number; loans: number };
}

export interface CouponCode {
  id: string;
  code: string;
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
}

export interface Coupon {
  id: string;
  name: string | null;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  duration: string;
  durationInMonths: number | null;
  valid: boolean;
  codes: CouponCode[];
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: string;
}

export interface CreateCouponInput {
  name?: string;
  percentOff?: number;
  months?: number;
  code?: string;
  maxRedemptions?: number;
}
