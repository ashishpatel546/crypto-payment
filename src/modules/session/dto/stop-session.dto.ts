import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class StopSessionDto {
  @ApiProperty({
    description: 'The charging session ID to stop',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({
    description:
      'Final cost of the charging session (optional, will be calculated if not provided)',
    example: 5.5,
  })
  @IsOptional()
  @IsNumber()
  finalCost?: number;
}
