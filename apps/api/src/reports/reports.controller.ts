import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { SubscriptionGuard } from '../common/subscription.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  summary(@CurrentUser('id') userId: string, @Query('months') months?: string) {
    return this.reports.summary(userId, months ? Number(months) : 6);
  }
}
