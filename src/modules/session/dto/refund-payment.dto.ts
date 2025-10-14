import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefundPaymentDto {
  @ApiProperty({
    description: 'The charging session ID for which to process the refund',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
