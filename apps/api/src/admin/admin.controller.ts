import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SUPER_ADMIN_EMAIL } from '../common/constants';

@UseGuards(JwtAuthGuard)
@Controller('admin/users')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  private assertSuperAdmin(user: AuthUser) {
    if (user.email !== SUPER_ADMIN_EMAIL) {
      throw new ForbiddenException('Acesso restrito');
    }
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    this.assertSuperAdmin(user);
    return this.prisma.systemUser.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
        subscriptionStatus: true,
        trialUsedAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        _count: { select: { borrowers: true, loans: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Delete()
  async deactivate(@CurrentUser() user: AuthUser, @Body() body: { targetUserId?: string }) {
    this.assertSuperAdmin(user);

    const { targetUserId } = body;
    if (!targetUserId) throw new BadRequestException('ID do usuário é obrigatório');
    if (targetUserId === user.id) throw new BadRequestException('Não pode desativar a si mesmo');

    await this.prisma.systemUser.update({
      where: { id: targetUserId },
      data: { isActive: false },
    });
    return { success: true };
  }
}
