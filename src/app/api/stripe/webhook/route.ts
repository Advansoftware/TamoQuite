import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stripe, webhookSecret } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      throw new Error('Assinatura do webhook ou segredo ausente.');
    }
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error: unknown) {
    console.error('Webhook signature verification failed:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;
        const userId = session.metadata?.userId;

        if (userId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await db.systemUser.update({
            where: { id: userId },
            data: {
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: customerId,
              subscriptionStatus: subscription.status,
            },
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await db.systemUser.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          await db.systemUser.update({
            where: { id: user.id },
            data: {
              stripeSubscriptionId: subscription.id,
              subscriptionStatus: subscription.status,
            },
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await db.systemUser.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          await db.systemUser.update({
            where: { id: user.id },
            data: {
              stripeSubscriptionId: null,
              subscriptionStatus: 'canceled',
            },
          });
        }
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Webhook database transaction failed:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
