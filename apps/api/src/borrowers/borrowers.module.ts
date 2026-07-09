import { Module } from '@nestjs/common';
import { BorrowersController } from './borrowers.controller';

@Module({
  controllers: [BorrowersController],
})
export class BorrowersModule {}
