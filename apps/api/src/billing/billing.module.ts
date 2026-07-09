import { Module } from '@nestjs/common';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { BillingController } from './billing.controller';
import { BillingSettingsService } from './billing-settings.service';
import { BillingCron } from './billing.cron';

@Module({
  imports: [WhatsappModule],
  controllers: [BillingController],
  providers: [BillingSettingsService, BillingCron],
  exports: [BillingSettingsService],
})
export class BillingModule {}
