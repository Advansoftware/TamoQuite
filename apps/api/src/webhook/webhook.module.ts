import { Module } from '@nestjs/common';
import { GlobalWhatsappModule } from '../global-whatsapp/global-whatsapp.module';
import { OutboundModule } from '../outbound/outbound.module';
import { BillingModule } from '../billing/billing.module';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';

@Module({
  imports: [GlobalWhatsappModule, OutboundModule, BillingModule],
  controllers: [WhatsappWebhookController],
})
export class WebhookModule {}
