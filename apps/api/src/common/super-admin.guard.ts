import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthUser } from './current-user.decorator';
import { SUPER_ADMIN_EMAIL } from './constants';

/**
 * Restricts a route to the single super-admin account. Runs after JwtAuthGuard,
 * which populates req.user. Centralizes the email check that was previously
 * repeated inline in every admin-billing handler.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;
    if (!user) throw new UnauthorizedException('Não autenticado');
    if (user.email !== SUPER_ADMIN_EMAIL) throw new ForbiddenException('Acesso restrito');
    return true;
  }
}
