import { Module } from '@nestjs/common';
import { EvolutionModule } from '../whatsapp/evolution.module';
import { GlobalWhatsappModule } from '../global-whatsapp/global-whatsapp.module';
import { OutboundService } from './outbound.service';

@Module({
  imports: [EvolutionModule, GlobalWhatsappModule],
  providers: [OutboundService],
  exports: [OutboundService],
})
export class OutboundModule {}
