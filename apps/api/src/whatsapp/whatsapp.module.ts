import { Module } from '@nestjs/common';
import { EvolutionService } from './evolution.service';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';

@Module({
  controllers: [WhatsappController],
  providers: [EvolutionService, WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
