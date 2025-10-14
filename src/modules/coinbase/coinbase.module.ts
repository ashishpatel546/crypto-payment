import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoinbaseService } from './coinbase.service';

@Module({
  imports: [ConfigModule],
  providers: [CoinbaseService],
  exports: [CoinbaseService],
})
export class CoinbaseModule {}
