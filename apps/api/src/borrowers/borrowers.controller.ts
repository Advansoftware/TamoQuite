import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
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
  list(@CurrentUser('id') userId: string) {
    return this.borrowers.list(userId);
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

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.borrowers.remove(userId, id);
  }
}
