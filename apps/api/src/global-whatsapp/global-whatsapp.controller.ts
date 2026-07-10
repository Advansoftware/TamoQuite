import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { GlobalWhatsappService } from './global-whatsapp.service';

@UseGuards(JwtAuthGuard)
@Controller('admin/whatsapp')
export class GlobalWhatsappController {
  constructor(private readonly pool: GlobalWhatsappService) {}

  private assertAdmin(user: AuthUser) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Acesso restrito');
  }

  @Get('pool')
  async list(@CurrentUser() user: AuthUser) {
    this.assertAdmin(user);
    return this.pool.list();
  }

  @Post('pool')
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: { label?: string; ratePerMinute?: number; dailyCap?: number },
  ) {
    this.assertAdmin(user);
    return this.pool.create(body);
  }

  @Post('pool/:id/connect')
  async connect(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.assertAdmin(user);
    return this.pool.connect(id);
  }

  @Get('pool/:id/status')
  async status(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.assertAdmin(user);
    return this.pool.status(id);
  }

  @Put('pool/:id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { label?: string; isActive?: boolean; ratePerMinute?: number; dailyCap?: number },
  ) {
    this.assertAdmin(user);
    return this.pool.update(id, body);
  }

  @Post('pool/:id/disconnect')
  async disconnect(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.assertAdmin(user);
    return this.pool.disconnect(id);
  }

  @Delete('pool/:id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.assertAdmin(user);
    return this.pool.remove(id);
  }
}
