import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY || '';

export const stripe = new Stripe(secretKey, {
  apiVersion: '2022-11-15', // Matches a stable Stripe API version
  typescript: true,
});

export const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
