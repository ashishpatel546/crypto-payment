import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeModule } from '../stripe/stripe.module';
import { PaymentModule } from '../payment/payment.module';
import { ChargingSession } from './entities/charging-session.entity';
import { PaymentLink } from './entities/payment-link.entity';
import { BalanceCheck } from './entities/balance-check.entity';
import {
  PaymentManagementController,
  SessionController,
  UserManagementController,
} from './session.controller';
import { SessionService } from './session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChargingSession, PaymentLink, BalanceCheck]),
    StripeModule,
    PaymentModule,
  ],
  controllers: [
    SessionController,
    PaymentManagementController,
    UserManagementController,
  ],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
