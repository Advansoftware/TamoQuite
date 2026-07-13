import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { BillingSettingsService } from './billing-settings.service';
import { BillingCron } from './billing.cron';

@UseGuards(JwtAuthGuard)
@Controller('settings/billing')
export class BillingController {
  constructor(
    private readonly settings: BillingSettingsService,
    private readonly cron: BillingCron,
  ) {}

  @Get()
  async get(@CurrentUser('id') userId: string) {
    return this.settings.getOrCreate(userId);
  }

  @Put()
  async update(@CurrentUser('id') userId: string, @Body() body: Record<string, unknown>) {
    return this.settings.update(userId, body);
  }

  // Manual trigger — runs the billing sweep for the current user right now (useful for testing).
  @Post('run')
  async run(@CurrentUser('id') userId: string) {
    return this.cron.processUser(userId);
  }

  // Force-send a charge for one installment right now (automatic send from the UI).
  @Post('charge/:installmentId')
  async chargeNow(
    @CurrentUser('id') userId: string,
    @Param('installmentId') installmentId: string,
  ) {
    return this.cron.chargeInstallmentNow(userId, installmentId);
  }

  // Force-send a consolidated (custom) charge message to a borrower right now.
  @Post('charge-message')
  async chargeMessage(
    @CurrentUser('id') userId: string,
    @Body() body: { borrowerId?: string; message?: string },
  ) {
    return this.cron.sendCustomCharge(userId, body.borrowerId ?? '', body.message ?? '');
  }
}
