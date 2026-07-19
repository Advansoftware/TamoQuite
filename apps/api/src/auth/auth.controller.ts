import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Res,
  UnauthorizedException,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { buildPasswordResetEmail } from '../mail/templates';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { SUPER_ADMIN_EMAIL, ACCOUNT_RETENTION_DAYS } from '../common/constants';
import { StripeService } from '../stripe/stripe.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly stripe: StripeService,
  ) {}

  private webBaseUrl(): string {
    const raw =
      this.config.get<string>('WEB_URL') ||
      (this.config.get<string>('WEB_ORIGIN') || '').split(',')[0].trim() ||
      'http://localhost:3000';
    return raw.replace(/\/$/, '');
  }

  @Post('login')
  async login(
    @Body() body: { email?: string; password?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { email, password } = body;
    if (!email || !password) {
      throw new BadRequestException('Email e senha são obrigatórios');
    }

    const user = await this.auth.verifyCredentials(email, password);
    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const token = this.auth.signToken(user.id);

    res.cookie('cf_session', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        subscriptionStatus: user.subscriptionStatus,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return user;
  }

  // User preference: how many days before subscription expiry to be notified.
  @UseGuards(JwtAuthGuard)
  @Put('notification-prefs')
  async updateNotificationPrefs(
    @CurrentUser() user: AuthUser,
    @Body() body: { notifyBeforeSubExpiryDays?: number },
  ) {
    const days = Number(body.notifyBeforeSubExpiryDays);
    if (!Number.isFinite(days) || days < 1 || days > 30) {
      throw new BadRequestException('Escolha entre 1 e 30 dias.');
    }
    await this.prisma.systemUser.update({
      where: { id: user.id },
      data: { notifyBeforeSubExpiryDays: Math.round(days) },
    });
    return { success: true, notifyBeforeSubExpiryDays: Math.round(days) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() body: { currentPassword?: string; newPassword?: string },
  ) {
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Preencha todos os campos');
    }
    if (newPassword.length < 6) {
      throw new BadRequestException('A nova senha deve ter no mínimo 6 caracteres');
    }

    const dbUser = await this.prisma.systemUser.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const success = await this.auth.changePassword(user.id, newPassword);
    if (!success) {
      throw new InternalServerErrorException('Erro ao alterar senha');
    }

    return { success: true };
  }

  /**
   * Self-service account deletion (required by the Google Play data-safety rules).
   *
   * Deactivates immediately — the account stops working right away, since login
   * already refuses an inactive user — and the rows are erased for good by the
   * purge job after the retention window. Deliberately NOT behind
   * SubscriptionGuard: someone whose subscription lapsed must still be able to
   * delete their account.
   */
  @UseGuards(JwtAuthGuard)
  @Post('account/delete')
  async deleteAccount(
    @CurrentUser() user: AuthUser,
    @Body() body: { password?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body.password) {
      throw new BadRequestException('Confirme sua senha para excluir a conta');
    }

    // The super admin owns the platform; deleting it would orphan every account.
    if (user.email === SUPER_ADMIN_EMAIL) {
      throw new ForbiddenException('A conta de administrador da plataforma não pode ser excluída.');
    }

    const dbUser = await this.prisma.systemUser.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new UnauthorizedException('Usuário não encontrado');

    const valid = await bcrypt.compare(body.password, dbUser.passwordHash);
    if (!valid) throw new UnauthorizedException('Senha incorreta');

    // Stop the money first. If this failed silently the user would keep being
    // charged for an account they just deleted, which is the worst outcome here.
    if (dbUser.stripeSubscriptionId) {
      try {
        await this.stripe.client.subscriptions.cancel(dbUser.stripeSubscriptionId);
      } catch (err: unknown) {
        // Already cancelled or missing on Stripe's side is fine; anything else
        // is worth knowing about, but must not block the deletion.
        console.error(`[account/delete] falha ao cancelar assinatura de ${user.id}:`, err);
      }
    }

    await this.prisma.systemUser.update({
      where: { id: user.id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        subscriptionStatus: 'canceled',
        stripeSubscriptionId: null,
      },
    });

    res.clearCookie('cf_session', { path: '/' });

    return { success: true, purgeAfterDays: ACCOUNT_RETENTION_DAYS };
  }

  // Public self-service signup
  @Post('signup')
  async signup(@Body() body: { email?: string; name?: string; password?: string }) {
    const { email, name, password } = body;
    if (!email || !name || !password) {
      throw new BadRequestException('Todos os campos são obrigatórios');
    }
    if (password.length < 6) {
      throw new BadRequestException('A senha deve ter no mínimo 6 caracteres');
    }

    const existing = await this.prisma.systemUser.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true, subscriptionStatus: true, isActive: true },
    });
    if (existing) {
      return { exists: true, user: existing };
    }

    const hash = await bcrypt.hash(password, 12);
    const newUser = await this.prisma.systemUser.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        passwordHash: hash,
        role: 'CLIENT',
        mustChangePassword: false,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mustChangePassword: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    });

    return newUser;
  }

  // Public: request a password reset email. Always returns success to avoid
  // leaking whether an email is registered.
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email?: string }) {
    const email = body?.email?.trim();
    if (!email) {
      throw new BadRequestException('Informe o email');
    }

    const result = await this.auth.createPasswordResetToken(email);
    if (result) {
      const link = `${this.webBaseUrl()}/redefinir-senha?token=${result.token}`;
      const { subject, html, text } = buildPasswordResetEmail(result.user.name, link);
      try {
        await this.mail.send(result.user.email, subject, html, text);
      } catch {
        // Swallow send errors so the response stays uniform; the failure is logged in MailService.
      }
    }

    return { success: true };
  }

  // Public: complete a password reset using the emailed token.
  @Post('reset-password')
  async resetPassword(@Body() body: { token?: string; newPassword?: string }) {
    const { token, newPassword } = body;
    if (!token || !newPassword) {
      throw new BadRequestException('Token e nova senha são obrigatórios');
    }
    if (newPassword.length < 6) {
      throw new BadRequestException('A nova senha deve ter no mínimo 6 caracteres');
    }

    const ok = await this.auth.resetPasswordWithToken(token, newPassword);
    if (!ok) {
      throw new BadRequestException('Link inválido ou expirado. Solicite um novo.');
    }

    return { success: true };
  }

  // Admin-only user creation
  @UseGuards(JwtAuthGuard)
  @Post('register')
  async register(
    @CurrentUser() currentUser: AuthUser,
    @Body() body: { email?: string; name?: string; password?: string; role?: string },
  ) {
    if (currentUser.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem criar usuários');
    }

    const { email, name, password, role } = body;
    if (!email || !name || !password || !role) {
      throw new BadRequestException('Todos os campos são obrigatórios');
    }
    if (!['ADMIN', 'CLIENT'].includes(role)) {
      throw new BadRequestException('Role inválido');
    }
    if (password.length < 6) {
      throw new BadRequestException('A senha deve ter no mínimo 6 caracteres');
    }
    if (role === 'ADMIN' && currentUser.email !== SUPER_ADMIN_EMAIL) {
      throw new ForbiddenException('Apenas o administrador principal pode criar outros admins');
    }

    const existing = await this.prisma.systemUser.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Este email já está cadastrado');
    }

    const hash = await bcrypt.hash(password, 12);
    const newUser = await this.prisma.systemUser.create({
      data: {
        email,
        name,
        passwordHash: hash,
        role,
        mustChangePassword: true,
        isActive: true,
        createdBy: currentUser.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    return newUser;
  }
}
