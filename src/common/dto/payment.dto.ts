import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsObject,
  IsOptional,
} from 'class-validator';
import { Chain, PaymentProvider } from '../enums/chain.enum';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Payment provider',
    enum: PaymentProvider,
    example: PaymentProvider.COINBASE_CDP,
  })
  @IsEnum(PaymentProvider)
  @IsNotEmpty()
  provider: PaymentProvider;

  @ApiPropertyOptional({
    description:
      'User ID from your authentication system (extracted from JWT/session). Used to link payment to user account and track payment history. Optional for anonymous payments.',
    example: 'user_123',
    required: false,
  })
  @IsString()
  @IsOptional()
  user_id?: string;

  @ApiProperty({
    description:
      'Charging session ID (unique identifier for the EV charging session)',
    example: 'session_456',
  })
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @ApiProperty({
    description: 'Payment amount in USD',
    example: 25.5,
  })
  @IsNumber()
  @Min(0.01)
  amount_usd: number;

  @ApiProperty({
    description: 'Blockchain network',
    enum: Chain,
    example: Chain.ETHEREUM,
  })
  @IsEnum(Chain)
  @IsNotEmpty()
  chain: Chain;

  @ApiProperty({
    description: 'User wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @IsString()
  @IsNotEmpty()
  wallet_address: string;

  @ApiProperty({
    description: 'Additional metadata',
    required: false,
    example: { charger_id: 'charger_789', location: 'NYC' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment ID' })
  payment_id: string;

  @ApiProperty({ description: 'Payment URL (hosted checkout)' })
  payment_url: string;

  @ApiProperty({ description: 'Payment provider used' })
  provider: PaymentProvider;

  @ApiProperty({ description: 'Expiration time (ISO 8601)' })
  expires_at: string;

  @ApiProperty({ description: 'Additional provider-specific data' })
  provider_data: Record<string, any>;
}

export class PaymentStatusDto {
  @ApiProperty({
    description: 'Payment ID',
    example: 'pay_123',
  })
  @IsString()
  @IsNotEmpty()
  payment_id: string;

  @ApiProperty({
    description: 'Payment provider',
    enum: PaymentProvider,
    example: PaymentProvider.COINBASE_CDP,
  })
  @IsEnum(PaymentProvider)
  @IsNotEmpty()
  provider: PaymentProvider;
}

export class PaymentStatusResponseDto {
  @ApiProperty({ description: 'Payment ID' })
  payment_id: string;

  @ApiProperty({ description: 'Payment status' })
  status: string;

  @ApiProperty({
    description: 'Transaction hash (if confirmed)',
    required: false,
  })
  tx_hash?: string;

  @ApiProperty({ description: 'Amount paid in USDC', required: false })
  amount_paid?: string;

  @ApiProperty({ description: 'Payer address', required: false })
  from_address?: string;

  @ApiProperty({ description: 'Provider-specific details' })
  details: Record<string, any>;
}
