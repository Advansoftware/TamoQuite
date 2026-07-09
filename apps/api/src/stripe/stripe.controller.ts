import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  Headers,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RawBodyRequest } from '@nestjs/common';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';

@Controller('stripe')
export class StripeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async checkout(@CurrentUser('id') userId: string, @Req() req: Request) {
    const user = await this.prisma.systemUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const origin =
      (req.headers['origin'] as string) ||
      this.config.get<string>('WEB_ORIGIN') ||
      'http://localhost:3000';

    let customerId = user.stripeCustomerId;

    if (customerId) {
      try {
        await this.stripe.client.customers.retrieve(customerId);
      } catch {
        customerId = null;
      }
    }
    if (!customerId) {
      const customer = await this.stripe.client.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await this.prisma.systemUser.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    try {
      const session = await this.stripe.client.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: this.stripe.priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/`,
        metadata: { userId: user.id },
      });
      return { url: session.url };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new InternalServerErrorException(`Erro ao criar sessão de checkout: ${message}`);
    }
  }

  // Current subscription details for the "Assinatura" settings tab.
  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  async subscription(@CurrentUser('id') userId: string) {
    const user = await this.prisma.systemUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const base = {
      status: user.subscriptionStatus ?? 'INACTIVE',
      hasSubscription: false as boolean,
      currentPeriodEnd: null as number | null,
      cancelAtPeriodEnd: false as boolean,
      amount: null as number | null,
      currency: null as string | null,
      interval: null as string | null,
    };

    if (!user.stripeSubscriptionId) {
      return base;
    }

    try {
      const sub = await this.stripe.client.subscriptions.retrieve(user.stripeSubscriptionId);
      const price = sub.items.data[0]?.price;
      return {
        ...base,
        status: sub.status,
        hasSubscription: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentPeriodEnd: (sub as any).current_period_end ?? null,
        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
        amount: price?.unit_amount ?? null,
        currency: price?.currency ?? null,
        interval: price?.recurring?.interval ?? null,
      };
    } catch {
      // Subscription id stale/deleted on Stripe — fall back to the stored status.
      return base;
    }
  }

  // Opens the Stripe Billing Portal so the user can manage/cancel/update payment.
  @UseGuards(JwtAuthGuard)
  @Post('portal')
  async portal(@CurrentUser('id') userId: string, @Req() req: Request) {
    const user = await this.prisma.systemUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!user.stripeCustomerId) {
      throw new BadRequestException('Nenhuma assinatura encontrada para gerenciar');
    }

    const origin =
      (req.headers['origin'] as string) ||
      this.config.get<string>('WEB_ORIGIN') ||
      'http://localhost:3000';

    try {
      const session = await this.stripe.client.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${origin}/dashboard`,
      });
      return { url: session.url };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new InternalServerErrorException(`Erro ao abrir o portal de assinatura: ${message}`);
    }
  }

  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: Stripe.Event;
    try {
      if (!signature || !this.stripe.webhookSecret) {
        throw new Error('Assinatura do webhook ou segredo ausente.');
      }
      event = this.stripe.client.webhooks.constructEvent(
        req.rawBody as Buffer,
        signature,
        this.stripe.webhookSecret,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return res.status(400).json({ error: `Webhook Error: ${message}` });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;
          const userId = session.metadata?.userId;
          if (userId) {
            const subscription = await this.stripe.client.subscriptions.retrieve(subscriptionId);
            await this.prisma.systemUser.update({
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
          const user = await this.prisma.systemUser.findFirst({
            where: { stripeCustomerId: customerId },
          });
          if (user) {
            await this.prisma.systemUser.update({
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
          const user = await this.prisma.systemUser.findFirst({
            where: { stripeCustomerId: customerId },
          });
          if (user) {
            await this.prisma.systemUser.update({
              where: { id: user.id },
              data: { stripeSubscriptionId: null, subscriptionStatus: 'canceled' },
            });
          }
          break;
        }
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
      return res.json({ received: true });
    } catch (error: unknown) {
      console.error('Webhook database transaction failed:', error);
      return res.status(500).json({ error: 'Webhook handler failed' });
    }
  }
}
