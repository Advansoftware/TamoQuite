import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthUser } from './current-user.decorator';
import { SUPER_ADMIN_EMAIL } from './constants';

// Subscription statuses that grant access. `trialing` covers the 7-day free trial.
const ACCESS_STATUSES = ['active', 'trialing'];

/**
 * Server-side paywall. Runs AFTER JwtAuthGuard (which populates req.user with a
 * fresh-from-DB user), so it reflects the current subscription state, not stale
 * JWT claims. Admins always pass; everyone else must be active or in trial.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;
    if (!user) throw new UnauthorizedException('Não autenticado');

    // Admins / super admin bypass the paywall.
    if (user.role === 'ADMIN' || user.email === SUPER_ADMIN_EMAIL) return true;

    if (ACCESS_STATUSES.includes(user.subscriptionStatus || '')) return true;

    // Structured payload so the frontend can detect the paywall (code) and flip to
    // the block screen immediately, without waiting for the next /me refresh.
    throw new ForbiddenException({
      statusCode: 403,
      code: 'SUBSCRIPTION_INACTIVE',
      message: 'Assinatura inativa. Regularize o pagamento para continuar usando o TamoQuite.',
    });
  }
}
