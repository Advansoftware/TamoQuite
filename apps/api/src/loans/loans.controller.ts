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

  // Soft delete: the contract, its parcelas and its cobranças disappear from the
  // app for good. The rows are kept in the database only for auditing, and there
  // is deliberately no route to bring one back.
  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.loans.remove(userId, id);
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
