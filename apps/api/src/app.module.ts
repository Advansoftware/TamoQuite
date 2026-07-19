import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BorrowersModule } from './borrowers/borrowers.module';
import { LoansModule } from './loans/loans.module';
import { InstallmentsModule } from './installments/installments.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminModule } from './admin/admin.module';
import { StripeModule } from './stripe/stripe.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { GlobalWhatsappModule } from './global-whatsapp/global-whatsapp.module';
import { OutboundModule } from './outbound/outbound.module';
import { BillingModule } from './billing/billing.module';
import { WebhookModule } from './webhook/webhook.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    BorrowersModule,
    LoansModule,
    InstallmentsModule,
    DashboardModule,
    AdminModule,
    StripeModule,
    WhatsappModule,
    GlobalWhatsappModule,
    OutboundModule,
    BillingModule,
    WebhookModule,
    ReportsModule,
  ],
})
export class AppModule {}
