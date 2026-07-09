import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { WhatsappService } from './whatsapp.service';

@UseGuards(JwtAuthGuard)
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Get('status')
  async status(@CurrentUser('id') userId: string) {
    return this.whatsapp.status(userId);
  }

  @Post('connect')
  async connect(@CurrentUser('id') userId: string) {
    return this.whatsapp.connect(userId);
  }

  @Post('disconnect')
  async disconnect(@CurrentUser('id') userId: string) {
    return this.whatsapp.disconnect(userId);
  }
}
