import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaymentModule } from './modules/payment/payment.module';
import { StripeModule } from './modules/stripe/stripe.module';
import { SessionModule } from './modules/session/session.module';
import { ChargingSession } from './modules/session/entities/charging-session.entity';
import { PaymentLink } from './modules/session/entities/payment-link.entity';
import { BalanceCheck } from './modules/session/entities/balance-check.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'crypto_payments.db',
      entities: [ChargingSession, PaymentLink, BalanceCheck],
      synchronize: true, // Auto-create tables (use migrations in production)
      logging: false,
    }),
    PaymentModule,
    StripeModule,
    SessionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
