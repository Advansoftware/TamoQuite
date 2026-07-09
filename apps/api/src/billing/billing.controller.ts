import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
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
}
