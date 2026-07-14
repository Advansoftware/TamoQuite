import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminBillingController } from './admin-billing.controller';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [StripeModule],
  controllers: [AdminController, AdminBillingController],
})
export class AdminModule {}
