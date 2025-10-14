import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import {
  PrecheckDto,
  PrecheckResponseDto,
} from '../../common/dto/precheck.dto';
import { PaymentProvider } from '../../common/enums/chain.enum';

@ApiTags('Payment Validation')
@Controller('api/v1/payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('precheck')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pre-check user wallet balance and gas before payment',
    description:
      'Validates wallet balances using RPC calls to ensure the user has sufficient USDC and native tokens for gas fees. Uses Stripe payment provider for RPC validation. When user_id is provided, creates a balance check entry in database for tracking and session linking.',
  })
  @ApiResponse({
    status: 200,
    description: 'Precheck completed',
    type: PrecheckResponseDto,
  })
  @ApiBody({ type: PrecheckDto })
  async precheck(@Body() dto: PrecheckDto): Promise<PrecheckResponseDto> {
    // Check if userId is provided for balance check tracking
    if (dto.user_id) {
      // Use the enhanced method that creates balance check entries
      const result = await this.paymentService.precheckWithBalanceCheck(
        PaymentProvider.STRIPE,
        dto.user_id,
        dto.address,
        dto.chain,
        dto.amount_usd,
        {
          source: 'precheck-api',
          timestamp: new Date().toISOString(),
        },
      );

      return {
        ...result.precheckResult,
        balanceCheckId: result.balanceCheckId,
        balanceStatus: result.balanceStatus,
      };
    } else {
      // Use the original method without balance check tracking
      const result = await this.paymentService.precheck(
        PaymentProvider.STRIPE,
        dto.address,
        dto.chain,
        dto.amount_usd,
      );
      return result;
    }
  }
}
