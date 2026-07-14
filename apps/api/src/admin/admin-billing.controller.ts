import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import Stripe from 'stripe';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { SUPER_ADMIN_EMAIL } from '../common/constants';

@UseGuards(JwtAuthGuard)
@Controller('admin/billing')
export class AdminBillingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  private assertSuperAdmin(user: AuthUser) {
    if (user.email !== SUPER_ADMIN_EMAIL) {
      throw new ForbiddenException('Acesso restrito');
    }
  }

  /** Clears the one-time trial flag so the user can start a fresh 7-day free trial. */
  @Post('users/:id/reset-trial')
  async resetTrial(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.assertSuperAdmin(user);
    const target = await this.prisma.systemUser.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Usuário não encontrado');
    await this.prisma.systemUser.update({ where: { id }, data: { trialUsedAt: null } });
    return { success: true };
  }

  /** Lists coupons with their promotion codes so the admin can see/share them. */
  @Get('coupons')
  async listCoupons(@CurrentUser() user: AuthUser) {
    this.assertSuperAdmin(user);
    const coupons = await this.stripe.client.coupons.list({ limit: 100 });
    const promos = await this.stripe.client.promotionCodes.list({ limit: 100 });

    return coupons.data.map((c) => ({
      id: c.id,
      name: c.name,
      percentOff: c.percent_off,
      amountOff: c.amount_off,
      currency: c.currency,
      duration: c.duration,
      durationInMonths: c.duration_in_months,
      valid: c.valid,
      codes: promos.data
        .filter((p) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pc = (p as any).coupon;
          const couponId = typeof pc === 'string' ? pc : pc?.id;
          return couponId === c.id;
        })
        .map((p) => ({
          id: p.id,
          code: p.code,
          active: p.active,
          timesRedeemed: p.times_redeemed,
          maxRedemptions: p.max_redemptions,
        })),
    }));
  }

  /**
   * Creates a coupon (optionally with a shareable promotion code).
   * Example "1 ano grátis": { percentOff: 100, months: 12, code: 'FREE1ANO' }.
   */
  @Post('coupons')
  async createCoupon(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name?: string;
      percentOff?: number;
      amountOffBRL?: number;
      months?: number;
      code?: string;
      maxRedemptions?: number;
    },
  ) {
    this.assertSuperAdmin(user);

    const { name, percentOff, amountOffBRL, months, code, maxRedemptions } = body;

    if (!percentOff && !amountOffBRL) {
      throw new BadRequestException('Informe um desconto (percentual ou valor).');
    }
    if (percentOff && (percentOff < 1 || percentOff > 100)) {
      throw new BadRequestException('Percentual deve estar entre 1 e 100.');
    }
    if (months !== undefined && (months < 1 || months > 36)) {
      throw new BadRequestException('Duração em meses deve estar entre 1 e 36.');
    }

    const params: Stripe.CouponCreateParams = {
      name: name || undefined,
      duration: months ? 'repeating' : 'once',
      ...(months ? { duration_in_months: months } : {}),
    };
    if (percentOff) {
      params.percent_off = percentOff;
    } else if (amountOffBRL) {
      params.amount_off = Math.round(amountOffBRL * 100);
      params.currency = 'brl';
    }

    let coupon: Stripe.Coupon;
    try {
      coupon = await this.stripe.client.coupons.create(params);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      throw new BadRequestException(`Erro ao criar cupom: ${message}`);
    }

    let promo: Stripe.PromotionCode | null = null;
    if (code && code.trim()) {
      try {
        promo = await this.stripe.client.promotionCodes.create({
          coupon: coupon.id,
          code: code.trim().toUpperCase(),
          ...(maxRedemptions ? { max_redemptions: maxRedemptions } : {}),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        // Coupon was created; surface the code failure so the admin can retry the code.
        throw new BadRequestException(
          `Cupom criado, mas o código falhou: ${message}. Crie o código novamente.`,
        );
      }
    }

    return { couponId: coupon.id, code: promo?.code ?? null };
  }

  /**
   * Applies a coupon directly to a specific user — no code needed on their side.
   * If they already have a subscription, it discounts that subscription; otherwise
   * it attaches to their Stripe customer so the next subscription picks it up.
   */
  @Post('users/:id/apply-coupon')
  async applyCoupon(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { couponId?: string },
  ) {
    this.assertSuperAdmin(user);
    if (!body.couponId) throw new BadRequestException('Cupom é obrigatório');

    const target = await this.prisma.systemUser.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Usuário não encontrado');

    // Ensure the user has a Stripe customer.
    let customerId = target.stripeCustomerId;
    if (customerId) {
      try {
        const c = await this.stripe.client.customers.retrieve(customerId);
        if ((c as Stripe.DeletedCustomer).deleted) customerId = null;
      } catch {
        customerId = null;
      }
    }
    if (!customerId) {
      const customer = await this.stripe.client.customers.create({
        email: target.email,
        name: target.name,
        metadata: { userId: target.id },
      });
      customerId = customer.id;
      await this.prisma.systemUser.update({
        where: { id },
        data: { stripeCustomerId: customerId },
      });
    }

    try {
      const activeSub =
        target.stripeSubscriptionId &&
        ['active', 'trialing', 'past_due'].includes(target.subscriptionStatus || '');
      if (activeSub) {
        await this.stripe.client.subscriptions.update(target.stripeSubscriptionId as string, {
          coupon: body.couponId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        return { success: true, applied: 'subscription' };
      }
      // No live subscription: attach to the customer for their next subscription/invoice.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.stripe.client.customers.update(customerId, { coupon: body.couponId } as any);
      return { success: true, applied: 'customer' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      throw new BadRequestException(`Erro ao aplicar cupom: ${message}`);
    }
  }
}
