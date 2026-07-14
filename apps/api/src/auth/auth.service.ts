import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/current-user.decorator';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private toAuthUser(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    mustChangePassword: boolean;
    subscriptionStatus: string | null;
    notifyBeforeSubExpiryDays: number;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      subscriptionStatus: user.subscriptionStatus,
      notifyBeforeSubExpiryDays: user.notifyBeforeSubExpiryDays,
    };
  }

  async verifyCredentials(email: string, password: string): Promise<AuthUser | null> {
    const user = await this.prisma.systemUser.findUnique({ where: { email } });
    if (!user || !user.isActive) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    return this.toAuthUser(user);
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.systemUser.findUnique({ where: { id } });
    if (!user || !user.isActive) return null;
    return this.toAuthUser(user);
  }

  async changePassword(userId: string, newPassword: string): Promise<boolean> {
    const hash = await bcrypt.hash(newPassword, 12);
    try {
      await this.prisma.systemUser.update({
        where: { id: userId },
        data: { passwordHash: hash, mustChangePassword: false },
      });
      return true;
    } catch {
      return false;
    }
  }

  signToken(userId: string): string {
    return this.jwt.sign({ sub: userId });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Creates a single-use password reset token for the given email.
   * Returns the raw token + user when the email maps to an active account,
   * or null otherwise (callers must not reveal which case happened).
   */
  async createPasswordResetToken(
    email: string,
  ): Promise<{ token: string; user: { id: string; email: string; name: string } } | null> {
    const user = await this.prisma.systemUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || !user.isActive) return null;

    // Invalidate any outstanding tokens for this user before issuing a new one.
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

    const token = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    return { token, user: { id: user.id, email: user.email, name: user.name } };
  }

  /** Consumes a reset token and sets the new password. Returns false if the token is invalid/expired/used. */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    if (!row || row.usedAt || row.expiresAt < new Date()) return false;

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.systemUser.update({
        where: { id: row.userId },
        data: { passwordHash: hash, mustChangePassword: false },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return true;
  }
}
