import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/current-user.decorator';

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
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      subscriptionStatus: user.subscriptionStatus,
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
}
