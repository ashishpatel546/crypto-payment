import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeService } from '../stripe/stripe.service';
import { PaymentProvider, Chain } from '../../common/enums/chain.enum';
import {
  IPaymentProvider,
  PrecheckResult,
  CreatePaymentResult,
  PaymentStatusResult,
} from '../../common/interfaces/payment-provider.interface';
import {
  BalanceCheck,
  BalanceCheckStatus,
} from '../session/entities/balance-check.entity';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private providers: Map<PaymentProvider, IPaymentProvider>;

  constructor(
    private stripeService: StripeService,
    @InjectRepository(BalanceCheck)
    private balanceCheckRepository: Repository<BalanceCheck>,
  ) {
    this.providers = new Map();
    this.providers.set(PaymentProvider.STRIPE, this.stripeService);
  }

  private getProvider(provider: PaymentProvider): IPaymentProvider {
    const service = this.providers.get(provider);
    if (!service) {
      throw new BadRequestException(
        `Unsupported payment provider: ${provider}`,
      );
    }
    return service;
  }

  async precheck(
    provider: PaymentProvider,
    address: string,
    chain: Chain,
    amountUsd: number,
  ): Promise<PrecheckResult> {
    this.logger.log(
      `Precheck with ${provider}: ${address} on ${chain} for $${amountUsd}`,
    );
    const service = this.getProvider(provider);
    return service.precheck(address, chain, amountUsd);
  }

  async precheckWithBalanceCheck(
    provider: PaymentProvider,
    userId: string,
    address: string,
    chain: Chain,
    amountUsd: number,
    metadata?: Record<string, any>,
  ): Promise<{
    precheckResult: PrecheckResult;
    balanceCheckId: string;
    balanceStatus: BalanceCheckStatus;
  }> {
    this.logger.log(
      `Precheck with balance check for user ${userId}: ${address} on ${chain} for $${amountUsd}`,
    );

    let balanceCheck: BalanceCheck;
    let precheckResult: PrecheckResult;

    try {
      // Perform the actual precheck
      const service = this.getProvider(provider);
      precheckResult = await service.precheck(address, chain, amountUsd);

      const actualBalance = parseFloat(precheckResult.usdcBalance) || 0;
      const hasSufficientBalance = precheckResult.canPay;

      // Create balance check entry
      balanceCheck = this.balanceCheckRepository.create({
        userId,
        walletAddress: address,
        chain: chain.toString(),
        requestedAmount: amountUsd,
        actualBalance,
        status: hasSufficientBalance
          ? BalanceCheckStatus.SUFFICIENT
          : BalanceCheckStatus.INSUFFICIENT,
        provider: provider.toString(),
        metadata: metadata
          ? JSON.stringify({
              ...metadata,
              precheckDetails: precheckResult,
              source: 'precheck-api',
            })
          : JSON.stringify({
              precheckDetails: precheckResult,
              source: 'precheck-api',
            }),
      });
    } catch (error) {
      this.logger.error(`Balance check failed for user ${userId}:`, error);

      // Create error balance check entry
      balanceCheck = this.balanceCheckRepository.create({
        userId,
        walletAddress: address,
        chain: chain.toString(),
        requestedAmount: amountUsd,
        actualBalance: 0,
        status: BalanceCheckStatus.ERROR,
        provider: provider.toString(),
        errorMessage: error.message || 'Unknown error during balance check',
        metadata: metadata
          ? JSON.stringify({ ...metadata, source: 'precheck-api' })
          : JSON.stringify({ source: 'precheck-api' }),
      });

      // Still need to return some precheck result for the error case
      precheckResult = {
        canPay: false,
        usdcBalance: '0',
        nativeBalance: '0',
        estimatedGas: '0',
        requiredUsdc: amountUsd.toString(),
        error: error.message || 'Unknown error during balance check',
      };
    }

    const savedBalanceCheck =
      await this.balanceCheckRepository.save(balanceCheck);

    this.logger.log(
      `Balance check created with ID: ${savedBalanceCheck.id}, status: ${savedBalanceCheck.status}`,
    );

    return {
      precheckResult,
      balanceCheckId: savedBalanceCheck.id,
      balanceStatus: savedBalanceCheck.status,
    };
  }

  async createPayment(
    provider: PaymentProvider,
    userId: string,
    sessionId: string,
    amountUsd: number,
    chain: Chain,
    walletAddress: string,
    metadata?: Record<string, any>,
  ): Promise<CreatePaymentResult> {
    this.logger.log(
      `Creating payment with ${provider} for session ${sessionId}`,
    );
    const service = this.getProvider(provider);
    return service.createPayment(
      userId,
      sessionId,
      amountUsd,
      chain,
      walletAddress,
      metadata,
    );
  }

  async getPaymentStatus(
    provider: PaymentProvider,
    paymentId: string,
  ): Promise<PaymentStatusResult> {
    this.logger.log(`Getting payment status with ${provider}: ${paymentId}`);
    const service = this.getProvider(provider);
    return service.getPaymentStatus(paymentId);
  }

  verifyWebhook(
    provider: PaymentProvider,
    signature: string,
    payload: any,
  ): boolean {
    this.logger.log(`Verifying webhook with ${provider}`);
    const service = this.getProvider(provider);
    return service.verifyWebhook(signature, payload);
  }

  // Utility method to get all supported providers
  getSupportedProviders(): PaymentProvider[] {
    return Array.from(this.providers.keys());
  }

  // Utility method to check provider availability
  isProviderAvailable(provider: PaymentProvider): boolean {
    return this.providers.has(provider);
  }
}
