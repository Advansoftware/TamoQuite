import { Module } from '@nestjs/common';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { GlobalWhatsappModule } from '../global-whatsapp/global-whatsapp.module';
import { OutboundModule } from '../outbound/outbound.module';
import { BillingController } from './billing.controller';
import { BillingSettingsService } from './billing-settings.service';
import { ChargeHistoryService } from './charge-history.service';
import { BillingCron } from './billing.cron';

@Module({
  imports: [WhatsappModule, GlobalWhatsappModule, OutboundModule],
  controllers: [BillingController],
  providers: [BillingSettingsService, ChargeHistoryService, BillingCron],
  exports: [BillingSettingsService],
})
export class BillingModule {}
