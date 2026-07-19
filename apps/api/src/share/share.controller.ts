import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { SubscriptionGuard } from '../common/subscription.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ShareService } from './share.service';

/** Owner-side: create, inspect and revoke the link. Always scoped to the caller. */
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('loans/:id/share')
export class ShareController {
  constructor(private readonly share: ShareService) {}

  @Get()
  get(@CurrentUser('id') userId: string, @Param('id') loanId: string) {
    return this.share.get(userId, loanId);
  }

  @Post()
  enable(@CurrentUser('id') userId: string, @Param('id') loanId: string) {
    return this.share.enable(userId, loanId);
  }

  @Delete()
  revoke(@CurrentUser('id') userId: string, @Param('id') loanId: string) {
    return this.share.revoke(userId, loanId);
  }
}

/**
 * Public read. Deliberately has NO guards — the token is the credential.
 * Kept in its own controller so no auth decorator is ever added here by habit.
 */
@Controller('public/share')
export class PublicShareController {
  constructor(private readonly share: ShareService) {}

  @Get(':token')
  view(@Param('token') token: string) {
    return this.share.viewByToken(token);
  }
}
