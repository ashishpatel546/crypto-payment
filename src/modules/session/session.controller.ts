import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { SessionService } from './session.service';
import { StartSessionDto } from './dto/start-session.dto';
import { StopSessionDto } from './dto/stop-session.dto';
import { RecreatePaymentLinkDto } from './dto/recreate-payment-link.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { Chain } from '../../common/enums/chain.enum';

@ApiTags('Session Management')
@Controller('api/v1/session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start a new charging session with optional balance verification',
    description:
      'Creates a new charging session with optional balance verification. If checkBalance is true (default), performs balance check before starting session and logs the check in database. If false, assumes FE already verified balance using precheck API, avoiding redundant balance checks.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          example: 'user-123',
          description: 'Unique identifier for the user starting the session',
        },
        chargerId: {
          type: 'string',
          example: 'CHARGER-001',
          description: 'Unique identifier for the charger',
        },
        checkBalance: {
          type: 'boolean',
          example: true,
          default: true,
          description:
            'Whether to perform balance check. Set to false if FE already verified balance using precheck API',
        },
        walletAddress: {
          type: 'string',
          example: '0x742d35Cc6634C0532925a3b8D95B0E8b19a6bE6c',
          description: 'User wallet address (required if checkBalance is true)',
        },
        chain: {
          type: 'string',
          example: 'ethereum-sepolia',
          description: 'Blockchain chain (required if checkBalance is true)',
        },
        expectedMaxCost: {
          type: 'number',
          example: 10.0,
          description:
            'Expected maximum cost (required if checkBalance is true)',
        },
        metadata: {
          type: 'object',
          example: {
            location: 'Station A',
            connectorType: 'DCFC',
          },
          description: 'Optional metadata about the charger or session',
        },
      },
      required: ['userId', 'chargerId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Charging session started successfully',
    schema: {
      anyOf: [
        {
          title: 'With Balance Check',
          example: {
            success: true,
            sessionId: '123e4567-e89b-12d3-a456-426614174000',
            userId: 'user-123',
            chargerId: 'CHARGER-001',
            balanceCheckId: '456e7890-e89b-12d3-a456-426614174001',
            balanceStatus: 'SUFFICIENT',
            message:
              'Charging session started successfully with sufficient balance',
          },
        },
        {
          title: 'Without Balance Check',
          example: {
            success: true,
            sessionId: '123e4567-e89b-12d3-a456-426614174000',
            userId: 'user-123',
            chargerId: 'CHARGER-001',
            message:
              'Charging session started successfully (balance check skipped)',
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Insufficient balance, balance check failed, or missing required fields when checkBalance is true',
  })
  async startSession(@Body() dto: StartSessionDto) {
    return this.sessionService.startSession(
      dto.userId,
      dto.chargerId,
      dto.checkBalance ?? true,
      dto.walletAddress,
      dto.chain,
      dto.expectedMaxCost,
      dto.metadata,
    );
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stop charging session and create payment link',
    description:
      'Stops the charging session, calculates final cost, creates a Stripe payment link with expiry tracking, and stores all details in the database. The user is automatically identified from the session.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'Session ID to stop',
        },
        finalCost: {
          type: 'number',
          example: 5.5,
          description:
            'Final cost of the session (optional, defaults to $0.50 for POC)',
        },
      },
      required: ['sessionId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Session stopped and payment link created successfully',
    schema: {
      example: {
        success: true,
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        finalCost: 5.5,
        paymentUrl: 'https://checkout.stripe.com/c/pay/cs_test_...',
        amount: 5.5,
        paymentLinkId: '789e0123-e89b-12d3-a456-426614174002',
        expiresAt: '2025-10-14T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async stopSession(@Body() dto: StopSessionDto) {
    return this.sessionService.stopSession(dto.sessionId, dto.finalCost);
  }
}

@ApiTags('Payment Management')
@Controller('api/v1/payment')
export class PaymentManagementController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('link/:sessionId')
  @ApiOperation({
    summary: 'Get payment link for a session',
    description:
      'Retrieves the payment link associated with a charging session ID.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'The charging session ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment link retrieved successfully',
    schema: {
      example: {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        paymentUrl: 'https://checkout.stripe.com/c/pay/cs_test_...',
        amount: 0.5,
        status: 'PENDING',
        expiresAt: '2025-10-14T12:00:00.000Z',
        isExpired: false,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Payment link not found',
  })
  async getPaymentLink(@Param('sessionId') sessionId: string) {
    return this.sessionService.getPaymentLink(sessionId);
  }

  @Post('recreate-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recreate payment link',
    description:
      'Creates a new payment link for a session. Useful when the previous link has expired or needs to be regenerated.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
      required: ['sessionId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'New payment link created',
    schema: {
      example: {
        success: true,
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        paymentUrl: 'https://checkout.stripe.com/c/pay/cs_test_...',
        amount: 0.5,
        expiresAt: '2025-10-14T12:00:00.000Z',
      },
    },
  })
  async recreatePaymentLink(@Body() dto: RecreatePaymentLinkDto) {
    return this.sessionService.recreatePaymentLink(dto.sessionId);
  }

  @Post('refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refund a payment (Admin endpoint)',
    description:
      'Processes a refund for a paid charging session through Stripe.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
      required: ['sessionId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Refund processed successfully',
    schema: {
      example: {
        success: true,
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        refundId: 're_1234567890',
        amount: 0.5,
        message: 'Refund processed successfully',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No paid payment found for session',
  })
  async refundPayment(@Body() dto: RefundPaymentDto) {
    return this.sessionService.refundPayment(dto.sessionId);
  }
}

@ApiTags('Balance & User Management')
@Controller('api/v1/user')
export class UserManagementController {
  constructor(private readonly sessionService: SessionService) {}

  @Get(':userId/balance-checks')
  @ApiOperation({
    summary: 'Get balance check history for a user',
    description:
      'Retrieves the balance check history for a specific user, showing all balance verification attempts.',
  })
  @ApiParam({
    name: 'userId',
    description: 'The user ID to get balance checks for',
    example: 'user-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance check history retrieved successfully',
    schema: {
      example: [
        {
          id: '456e7890-e89b-12d3-a456-426614174001',
          userId: 'user-123',
          walletAddress: '0x742d35Cc6634C0532925a3b8D95B0E8b19a6bE6c',
          chain: 'ethereum-sepolia',
          requestedAmount: 10.0,
          actualBalance: 15.5,
          status: 'SUFFICIENT',
          provider: 'STRIPE',
          createdAt: '2025-10-13T10:30:00.000Z',
        },
      ],
    },
  })
  async getBalanceCheckHistory(@Param('userId') userId: string) {
    return this.sessionService.getBalanceCheckHistory(userId);
  }

  @Get(':userId/sessions')
  @ApiOperation({
    summary: 'Get charging sessions for a user',
    description:
      'Retrieves all charging sessions associated with a specific user, including payment link details.',
  })
  @ApiParam({
    name: 'userId',
    description: 'The user ID to get sessions for',
    example: 'user-123',
  })
  @ApiResponse({
    status: 200,
    description: 'User sessions retrieved successfully',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          userId: 'user-123',
          chargerId: 'CHARGER-001',
          status: 'COMPLETED',
          finalCost: 5.5,
          createdAt: '2025-10-13T09:00:00.000Z',
          paymentLinks: [
            {
              id: '789e0123-e89b-12d3-a456-426614174002',
              paymentUrl: 'https://checkout.stripe.com/c/pay/cs_test_...',
              amount: 5.5,
              status: 'PENDING',
              expiresAt: '2025-10-14T12:00:00.000Z',
            },
          ],
        },
      ],
    },
  })
  async getUserSessions(@Param('userId') userId: string) {
    return this.sessionService.getSessionsByUser(userId);
  }

  @Get('balance-check/:balanceCheckId')
  @ApiOperation({
    summary: 'Get balance check details by ID',
    description:
      'Retrieves detailed information about a specific balance check by its ID.',
  })
  @ApiParam({
    name: 'balanceCheckId',
    description: 'The balance check ID',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance check details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Balance check not found',
  })
  async getBalanceCheckDetails(
    @Param('balanceCheckId') balanceCheckId: string,
  ) {
    return this.sessionService.getBalanceCheckById(balanceCheckId);
  }

  @Get('recent-balance-check/:userId')
  @ApiOperation({
    summary: 'Check for recent balance verification',
    description:
      'Checks if a recent sufficient balance check exists for the user within specified time window. Helps FE determine if balance recheck is needed before starting session.',
  })
  @ApiParam({
    name: 'userId',
    description: 'The user ID to check recent balance for',
    example: 'user-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent balance check status',
    schema: {
      anyOf: [
        {
          title: 'Recent Check Found',
          example: {
            exists: true,
            balanceCheck: {
              id: '456e7890-e89b-12d3-a456-426614174001',
              userId: 'user-123',
              walletAddress: '0x742d35Cc6634C0532925a3b8D95B0E8b19a6bE6c',
              chain: 'ethereum-sepolia',
              requestedAmount: 10.0,
              actualBalance: 15.5,
              status: 'SUFFICIENT',
              createdAt: '2025-10-13T22:00:00.000Z',
            },
            message:
              'Recent sufficient balance check found from 2025-10-13T22:00:00.000Z',
          },
        },
        {
          title: 'No Recent Check',
          example: {
            exists: false,
            message:
              'No recent sufficient balance check found within 5 minutes',
          },
        },
      ],
    },
  })
  async checkRecentBalanceCheck(
    @Param('userId') userId: string,
    @Query('walletAddress') walletAddress: string,
    @Query('chain') chain: string,
    @Query('requestedAmount') requestedAmount: number,
    @Query('withinMinutes') withinMinutes?: number,
  ) {
    return this.sessionService.checkIfRecentBalanceCheckExists(
      userId,
      walletAddress,
      chain as Chain,
      requestedAmount,
      withinMinutes,
    );
  }
}
