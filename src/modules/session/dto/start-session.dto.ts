import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsNumber,
  IsEnum,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { Chain } from '../../../common/enums/chain.enum';

export class StartSessionDto {
  @ApiProperty({
    description: 'Unique identifier for the user starting the session',
    example: 'user-123',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Unique identifier for the charger',
    example: 'CHARGER-001',
  })
  @IsString()
  @IsNotEmpty()
  chargerId: string;

  @ApiPropertyOptional({
    description:
      'Whether to perform balance check during session start. Set to false if FE already verified balance using precheck API.',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  checkBalance?: boolean = true;

  @ApiPropertyOptional({
    description:
      'User wallet address for balance check (required if checkBalance is true)',
    example: '0x742d35Cc6634C0532925a3b8D95B0E8b19a6bE6c',
  })
  @ValidateIf((o) => o.checkBalance !== false)
  @IsString()
  @IsNotEmpty()
  walletAddress?: string;

  @ApiPropertyOptional({
    description:
      'Blockchain chain for balance check (required if checkBalance is true)',
    example: Chain.ETHEREUM_SEPOLIA,
    enum: Chain,
  })
  @ValidateIf((o) => o.checkBalance !== false)
  @IsEnum(Chain)
  chain?: Chain;

  @ApiPropertyOptional({
    description:
      'Expected maximum cost to check balance against (required if checkBalance is true)',
    example: 10.0,
  })
  @ValidateIf((o) => o.checkBalance !== false)
  @IsNumber()
  expectedMaxCost?: number;

  @ApiPropertyOptional({
    description: 'Optional metadata about the charger or session',
    example: {
      location: 'Station A',
      connectorType: 'DCFC',
      maxPower: '150kW',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
