import { Module } from '@nestjs/common';
import { EvolutionModule } from '../whatsapp/evolution.module';
import { GlobalWhatsappService } from './global-whatsapp.service';
import { GlobalWhatsappController } from './global-whatsapp.controller';

@Module({
  imports: [EvolutionModule],
  controllers: [GlobalWhatsappController],
  providers: [GlobalWhatsappService],
  exports: [GlobalWhatsappService],
})
export class GlobalWhatsappModule {}
