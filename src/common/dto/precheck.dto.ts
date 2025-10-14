import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';
import { Chain } from '../enums/chain.enum';

export class PrecheckDto {
  @ApiProperty({
    description: 'User wallet address (public address only, no private keys)',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'Blockchain network',
    enum: Chain,
    example: Chain.ETHEREUM_SEPOLIA,
  })
  @IsEnum(Chain)
  @IsNotEmpty()
  chain: Chain;

  @ApiPropertyOptional({
    description:
      'User ID from your authentication system (e.g., from JWT token, session, or database). Used for tracking and linking payments to users. Optional for testing, recommended for production.',
    example: 'user_123',
    required: false,
  })
  @IsString()
  @IsOptional()
  user_id?: string;

  @ApiProperty({
    description: 'Payment amount in USD',
    example: 25.5,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount_usd: number;
}

export class PrecheckResponseDto {
  @ApiProperty({ description: 'Can user pay for the transaction' })
  canPay: boolean;

  @ApiProperty({ description: 'USDC balance in human readable format' })
  usdcBalance: string;

  @ApiProperty({ description: 'Native token balance (ETH/MATIC/SOL)' })
  nativeBalance: string;

  @ApiProperty({ description: 'Estimated gas cost in native token' })
  estimatedGas: string;

  @ApiProperty({ description: 'Required USDC amount' })
  requiredUsdc: string;

  @ApiProperty({
    description: 'Shortfall details if canPay is false',
    required: false,
  })
  shortfall?: {
    usdc: string;
    native: string;
  };

  @ApiProperty({
    description: 'Error message if validation failed',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description:
      'Balance check ID when userId is provided - used for tracking and session linking',
    required: false,
  })
  balanceCheckId?: string;

  @ApiProperty({
    description: 'Balance check status when userId is provided',
    required: false,
    enum: ['SUFFICIENT', 'INSUFFICIENT', 'ERROR'],
  })
  balanceStatus?: string;
}
