import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  readonly client: Stripe;
  readonly webhookSecret: string;
  readonly priceId: string;

  constructor(config: ConfigService) {
    // Pinned to the same stable version the original app used.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripeOptions: any = { apiVersion: '2022-11-15', typescript: true };
    // Placeholder key when unconfigured so the app can boot without Stripe; real calls need a real key.
    const secretKey = config.get<string>('STRIPE_SECRET_KEY') || 'sk_test_not_configured';
    this.client = new Stripe(secretKey, stripeOptions);
    this.webhookSecret = config.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    this.priceId = config.get<string>('STRIPE_PRICE_ID') || 'price_1Tj2ZQCsywhPRDWax02I6aMH';
  }
}
