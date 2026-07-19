import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { AccountPurgeCron } from './account-purge.cron';
import { MailModule } from '../mail/mail.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [
    MailModule,
    // Deleting an account cancels its subscription.
    StripeModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>('JWT_SECRET') ||
          config.get<string>('SESSION_SECRET') ||
          'tamoquite-super-secret-key-12345',
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AccountPurgeCron],
  exports: [AuthService],
})
export class AuthModule {}
