import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
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

  // `status`: active (default) | inactive | all. Deactivated users are kept
  // forever and stay reachable under their own tab.
  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: 'active' | 'inactive' | 'all',
  ) {
    this.assertSuperAdmin(user);
    const s = status ?? 'active';
    return this.prisma.systemUser.findMany({
      where: s === 'all' ? {} : { isActive: s === 'active' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
        isActive: true,
        deactivatedAt: true,
        subscriptionStatus: true,
        trialUsedAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        _count: { select: { borrowers: true, loans: { where: { deletedAt: null } } } },
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
      data: { isActive: false, deactivatedAt: new Date() },
    });
    return { success: true };
  }

  @Post(':id/reactivate')
  async reactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.assertSuperAdmin(user);
    await this.prisma.systemUser.update({
      where: { id },
      data: { isActive: true, deactivatedAt: null },
    });
    return { success: true };
  }
}
