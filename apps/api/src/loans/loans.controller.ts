import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { SubscriptionGuard } from '../common/subscription.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { LoansService, BillingOverridePatch } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.loans.list(userId);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateLoanDto) {
    return this.loans.create(userId, dto);
  }

  @Get(':id')
  get(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.loans.get(userId, id);
  }

  // Kept as DELETE for existing clients, but it only cancels — a contract's
  // installments and history are never erased.
  @Delete(':id')
  cancel(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.loans.cancel(userId, id);
  }

  @Post(':id/cancel')
  cancelExplicit(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.loans.cancel(userId, id);
  }

  @Post(':id/reactivate')
  reactivate(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.loans.reactivate(userId, id);
  }

  // Per-contract billing override + "do not charge"
  @Put(':id/billing')
  updateBilling(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: BillingOverridePatch,
  ) {
    return this.loans.updateBilling(userId, id, body);
  }
}
