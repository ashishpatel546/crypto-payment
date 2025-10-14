import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import {
  ChargingSession,
  ChargingSessionStatus,
} from './entities/charging-session.entity';
import { PaymentLink, PaymentStatus } from './entities/payment-link.entity';
import {
  BalanceCheck,
  BalanceCheckStatus,
} from './entities/balance-check.entity';
import { StripeService } from '../stripe/stripe.service';
import { PaymentService } from '../payment/payment.service';
import { Chain, PaymentProvider } from '../../common/enums/chain.enum';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(ChargingSession)
    private chargingSessionRepository: Repository<ChargingSession>,
    @InjectRepository(PaymentLink)
    private paymentLinkRepository: Repository<PaymentLink>,
    @InjectRepository(BalanceCheck)
    private balanceCheckRepository: Repository<BalanceCheck>,
    private stripeService: StripeService,
    private paymentService: PaymentService,
  ) {}

  async startSession(
    userId: string,
    chargerId: string,
    checkBalance: boolean = true,
    walletAddress?: string,
    chain?: Chain,
    expectedMaxCost?: number,
    metadata?: Record<string, any>,
  ): Promise<{
    success: boolean;
    sessionId: string;
    userId: string;
    chargerId: string;
    balanceCheckId?: string;
    balanceStatus?: BalanceCheckStatus;
    message: string;
  }> {
    this.logger.log(
      `Starting new charging session for user: ${userId}, charger: ${chargerId}, checkBalance: ${checkBalance}`,
    );

    let balanceCheckResult: BalanceCheck | null = null;

    if (checkBalance) {
      // Validate required fields for balance check
      if (!walletAddress || !chain || expectedMaxCost === undefined) {
        throw new BadRequestException(
          'walletAddress, chain, and expectedMaxCost are required when checkBalance is true',
        );
      }

      // Perform balance check
      balanceCheckResult = await this.performBalanceCheck(
        userId,
        walletAddress,
        chain,
        expectedMaxCost,
        PaymentProvider.STRIPE,
        metadata,
      );

      // If balance is insufficient, don't start the session
      if (balanceCheckResult.status === BalanceCheckStatus.INSUFFICIENT) {
        throw new BadRequestException(
          `Insufficient balance. Required: $${expectedMaxCost}, Available: $${balanceCheckResult.actualBalance}`,
        );
      }

      // If balance check failed with error, don't start the session
      if (balanceCheckResult.status === BalanceCheckStatus.ERROR) {
        throw new BadRequestException(
          `Balance check failed: ${balanceCheckResult.errorMessage}`,
        );
      }
    } else {
      this.logger.log(
        `Skipping balance check for user: ${userId} - assumed already verified by FE`,
      );
    }

    // Create the charging session with user association
    const sessionMetadata = {
      ...metadata,
      balanceCheckSkipped: !checkBalance,
      ...(balanceCheckResult && {
        balanceCheckId: balanceCheckResult.id,
        walletAddress,
        chain,
      }),
    };

    const session = this.chargingSessionRepository.create({
      userId,
      chargerId,
      status: ChargingSessionStatus.IN_PROGRESS,
      finalCost: 0,
      metadata: JSON.stringify(sessionMetadata),
    });

    const savedSession = await this.chargingSessionRepository.save(session);

    return {
      success: true,
      sessionId: savedSession.id,
      userId: savedSession.userId,
      chargerId: savedSession.chargerId,
      ...(balanceCheckResult && {
        balanceCheckId: balanceCheckResult.id,
        balanceStatus: balanceCheckResult.status,
      }),
      message: checkBalance
        ? 'Charging session started successfully with sufficient balance'
        : 'Charging session started successfully (balance check skipped)',
    };
  }

  private async performBalanceCheck(
    userId: string,
    walletAddress: string,
    chain: Chain,
    requestedAmount: number,
    provider: PaymentProvider,
    metadata?: Record<string, any>,
  ): Promise<BalanceCheck> {
    this.logger.log(
      `Performing balance check for user: ${userId}, wallet: ${walletAddress}, amount: $${requestedAmount}`,
    );

    let balanceCheck: BalanceCheck;

    try {
      // Use payment service to check balance
      const precheckResult = await this.paymentService.precheck(
        provider,
        walletAddress,
        chain,
        requestedAmount,
      );

      const actualBalance = parseFloat(precheckResult.usdcBalance) || 0;
      const hasSufficientBalance = precheckResult.canPay;

      balanceCheck = this.balanceCheckRepository.create({
        userId,
        walletAddress,
        chain: chain.toString(),
        requestedAmount,
        actualBalance,
        status: hasSufficientBalance
          ? BalanceCheckStatus.SUFFICIENT
          : BalanceCheckStatus.INSUFFICIENT,
        provider: provider.toString(),
        metadata: metadata
          ? JSON.stringify({
              ...metadata,
              precheckDetails: precheckResult,
            })
          : JSON.stringify({ precheckDetails: precheckResult }),
      });
    } catch (error) {
      this.logger.error(`Balance check failed for user ${userId}:`, error);

      balanceCheck = this.balanceCheckRepository.create({
        userId,
        walletAddress,
        chain: chain.toString(),
        requestedAmount,
        actualBalance: 0,
        status: BalanceCheckStatus.ERROR,
        provider: provider.toString(),
        errorMessage: error.message || 'Unknown error during balance check',
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      });
    }

    return await this.balanceCheckRepository.save(balanceCheck);
  }

  async stopSession(
    sessionId: string,
    finalCost?: number,
  ): Promise<{
    success: boolean;
    sessionId: string;
    userId: string;
    finalCost: number;
    paymentUrl: string;
    amount: number;
    paymentLinkId: string;
    expiresAt: Date;
  }> {
    this.logger.log(`Stopping charging session: ${sessionId}`);

    const session = await this.chargingSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Get userId from the session - no need for external validation
    const userId = session.userId;
    this.logger.log(`Session ${sessionId} belongs to user: ${userId}`);

    if (session.status !== ChargingSessionStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Session ${sessionId} is not in progress. Current status: ${session.status}`,
      );
    }

    // Use provided final cost or default to $0.50 for POC
    const calculatedFinalCost = finalCost ?? 0.5;

    // Update session with final cost
    session.finalCost = calculatedFinalCost;
    session.status = ChargingSessionStatus.COMPLETED;
    await this.chargingSessionRepository.save(session);

    // Create Stripe payment link with 24-hour expiry
    const stripeCheckoutSession =
      await this.stripeService.createCryptoPaymentLink(
        sessionId,
        calculatedFinalCost,
        {
          expiresInMinutes: 24 * 60, // 24 hours
          cryptoOnly: false, // Allow both crypto and card payments for better UX
          metadata: {
            userId,
            finalCost: calculatedFinalCost.toString(),
            createdBy: 'stopSession',
          },
        },
      );

    // Store payment link in database with expiry tracking
    const paymentLink = this.paymentLinkRepository.create({
      sessionId: session.id,
      stripeCheckoutSessionId: stripeCheckoutSession.id,
      paymentUrl: stripeCheckoutSession.url || '',
      amount: calculatedFinalCost,
      status: PaymentStatus.PENDING,
      expiresAt: new Date(stripeCheckoutSession.expires_at * 1000),
      stripePaymentIntentId: stripeCheckoutSession.payment_intent as string,
      metadata: JSON.stringify({
        userId,
        createdBy: 'stopSession',
        expiryHours: 24,
        stripeExpiresAt: stripeCheckoutSession.expires_at,
        chargerId: session.chargerId,
        sessionFinalCost: calculatedFinalCost,
        createdAt: new Date().toISOString(),
      }),
    });

    const savedPaymentLink = await this.paymentLinkRepository.save(paymentLink);

    this.logger.log(
      `Payment link created for session ${sessionId}: ${savedPaymentLink.id}, expires at: ${savedPaymentLink.expiresAt}`,
    );

    return {
      success: true,
      sessionId: session.id,
      userId: session.userId,
      finalCost: calculatedFinalCost,
      paymentUrl: stripeCheckoutSession.url || '',
      amount: calculatedFinalCost,
      paymentLinkId: savedPaymentLink.id,
      expiresAt: savedPaymentLink.expiresAt,
    };
  }

  async getPaymentLink(sessionId: string): Promise<{
    sessionId: string;
    paymentUrl: string;
    amount: number;
    status: PaymentStatus;
    expiresAt: Date;
    isExpired: boolean;
  }> {
    this.logger.log(`Fetching payment link for session: ${sessionId}`);

    const paymentLink = await this.paymentLinkRepository.findOne({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });

    if (!paymentLink) {
      throw new NotFoundException(
        `No payment link found for session ${sessionId}`,
      );
    }

    const isExpired = new Date() > paymentLink.expiresAt;

    return {
      sessionId: paymentLink.sessionId,
      paymentUrl: paymentLink.paymentUrl,
      amount: Number(paymentLink.amount),
      status: paymentLink.status,
      expiresAt: paymentLink.expiresAt,
      isExpired,
    };
  }

  async recreatePaymentLink(sessionId: string): Promise<{
    success: boolean;
    sessionId: string;
    userId: string;
    paymentUrl: string;
    amount: number;
    paymentLinkId: string;
    expiresAt: Date;
    previousLinkExpired: boolean;
  }> {
    this.logger.log(`Recreating payment link for session: ${sessionId}`);

    const session = await this.chargingSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Check if there's an existing unpaid link
    const existingLink = await this.paymentLinkRepository.findOne({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });

    if (existingLink && existingLink.status === PaymentStatus.PAID) {
      throw new BadRequestException(
        `Session ${sessionId} has already been paid`,
      );
    }

    // Create new Stripe payment link with 24-hour expiry
    const amount = Number(session.finalCost) || 0.5;
    const stripeCheckoutSession =
      await this.stripeService.createCryptoPaymentLink(sessionId, amount, {
        expiresInMinutes: 24 * 60, // 24 hours
        cryptoOnly: false, // Allow both crypto and card payments for better UX
        metadata: {
          userId: session.userId,
          createdBy: 'recreatePaymentLink',
          amount: amount.toString(),
        },
      });

    let previousLinkExpired = false;
    // Mark old links as expired if they exist
    if (existingLink) {
      existingLink.status = PaymentStatus.EXPIRED;
      await this.paymentLinkRepository.save(existingLink);
      previousLinkExpired = true;
      this.logger.log(
        `Expired previous payment link: ${existingLink.id} for session: ${sessionId}`,
      );
    }

    // Create new payment link with enhanced metadata
    const newPaymentLink = this.paymentLinkRepository.create({
      sessionId: session.id,
      stripeCheckoutSessionId: stripeCheckoutSession.id,
      paymentUrl: stripeCheckoutSession.url || '',
      amount,
      status: PaymentStatus.PENDING,
      expiresAt: new Date(stripeCheckoutSession.expires_at * 1000),
      stripePaymentIntentId: stripeCheckoutSession.payment_intent as string,
      metadata: JSON.stringify({
        userId: session.userId,
        createdBy: 'recreatePaymentLink',
        previousLinkId: existingLink?.id,
        recreatedAt: new Date().toISOString(),
        stripeExpiresAt: stripeCheckoutSession.expires_at,
        expiryHours: 24,
        chargerId: session.chargerId,
        sessionFinalCost: amount,
      }),
    });

    const savedLink = await this.paymentLinkRepository.save(newPaymentLink);

    this.logger.log(
      `New payment link created for session ${sessionId}: ${savedLink.id}, expires at: ${savedLink.expiresAt}`,
    );

    return {
      success: true,
      sessionId: session.id,
      userId: session.userId,
      paymentUrl: savedLink.paymentUrl,
      amount: Number(savedLink.amount),
      paymentLinkId: savedLink.id,
      expiresAt: savedLink.expiresAt,
      previousLinkExpired,
    };
  }

  async updatePaymentStatus(
    checkoutSessionId: string,
    status: PaymentStatus,
    metadata?: any,
  ): Promise<void> {
    this.logger.log(
      `Updating payment status for checkout session: ${checkoutSessionId} to ${status}`,
    );

    const paymentLink = await this.paymentLinkRepository.findOne({
      where: { stripeCheckoutSessionId: checkoutSessionId },
    });

    if (!paymentLink) {
      this.logger.warn(
        `Payment link not found for checkout session: ${checkoutSessionId}`,
      );
      return;
    }

    paymentLink.status = status;
    if (metadata) {
      paymentLink.metadata = JSON.stringify(metadata);
    }

    await this.paymentLinkRepository.save(paymentLink);
    this.logger.log(`Payment status updated successfully`);
  }

  async refundPayment(sessionId: string): Promise<{
    success: boolean;
    sessionId: string;
    refundId: string;
    amount: number;
    message: string;
  }> {
    this.logger.log(`Processing refund for session: ${sessionId}`);

    const paymentLink = await this.paymentLinkRepository.findOne({
      where: { sessionId, status: PaymentStatus.PAID },
      order: { createdAt: 'DESC' },
    });

    if (!paymentLink) {
      throw new NotFoundException(
        `No paid payment found for session ${sessionId}`,
      );
    }

    if (!paymentLink.stripePaymentIntentId) {
      throw new BadRequestException(
        `No payment intent found for session ${sessionId}`,
      );
    }

    // Process refund through Stripe
    const refund = await this.stripeService.refundPayment(
      paymentLink.stripePaymentIntentId,
    );

    // Update payment link status
    paymentLink.status = PaymentStatus.REFUNDED;
    await this.paymentLinkRepository.save(paymentLink);

    return {
      success: true,
      sessionId,
      refundId: refund.id,
      amount: refund.amount / 100, // Convert from cents to dollars
      message: 'Refund processed successfully',
    };
  }

  // Additional utility methods for balance check tracking
  async getBalanceCheckHistory(
    userId: string,
    limit: number = 10,
  ): Promise<BalanceCheck[]> {
    this.logger.log(`Getting balance check history for user: ${userId}`);

    return this.balanceCheckRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getSessionsByUser(
    userId: string,
    limit: number = 10,
  ): Promise<ChargingSession[]> {
    this.logger.log(`Getting sessions for user: ${userId}`);

    return this.chargingSessionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['paymentLinks'],
    });
  }

  async getBalanceCheckById(balanceCheckId: string): Promise<BalanceCheck> {
    const balanceCheck = await this.balanceCheckRepository.findOne({
      where: { id: balanceCheckId },
    });

    if (!balanceCheck) {
      throw new NotFoundException(`Balance check ${balanceCheckId} not found`);
    }

    return balanceCheck;
  }

  async getRecentBalanceCheck(
    userId: string,
    walletAddress: string,
    chain: Chain,
    requestedAmount: number,
    withinMinutes: number = 5,
  ): Promise<BalanceCheck | null> {
    const cutoffTime = new Date(Date.now() - withinMinutes * 60 * 1000);

    return this.balanceCheckRepository.findOne({
      where: {
        userId,
        walletAddress,
        chain: chain.toString(),
        requestedAmount,
        status: BalanceCheckStatus.SUFFICIENT,
        createdAt: MoreThan(cutoffTime),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async checkIfRecentBalanceCheckExists(
    userId: string,
    walletAddress: string,
    chain: Chain,
    requestedAmount: number,
    withinMinutes: number = 5,
  ): Promise<{
    exists: boolean;
    balanceCheck?: BalanceCheck;
    message: string;
  }> {
    const recentCheck = await this.getRecentBalanceCheck(
      userId,
      walletAddress,
      chain,
      requestedAmount,
      withinMinutes,
    );

    if (recentCheck) {
      return {
        exists: true,
        balanceCheck: recentCheck,
        message: `Recent sufficient balance check found from ${recentCheck.createdAt}`,
      };
    }

    return {
      exists: false,
      message: `No recent sufficient balance check found within ${withinMinutes} minutes`,
    };
  }
}
