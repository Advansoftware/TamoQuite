import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { SubscriptionGuard } from '../common/subscription.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { BorrowersService } from './borrowers.service';
import { CreateBorrowerDto, UpdateBorrowerDto } from './dto/borrower.dto';

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('borrowers')
export class BorrowersController {
  constructor(private readonly borrowers: BorrowersService) {}

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query('status') status?: 'active' | 'inactive' | 'all',
  ) {
    return this.borrowers.list(userId, status ?? 'active');
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateBorrowerDto) {
    return this.borrowers.create(userId, dto);
  }

  @Get(':id')
  get(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.borrowers.get(userId, id);
  }

  @Put(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBorrowerDto,
  ) {
    return this.borrowers.update(userId, id, dto);
  }

  // Kept as DELETE for the existing clients, but it only deactivates —
  // no client record is ever erased.
  @Delete(':id')
  deactivate(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.borrowers.deactivate(userId, id);
  }

  @Post(':id/reactivate')
  reactivate(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.borrowers.reactivate(userId, id);
  }
}
