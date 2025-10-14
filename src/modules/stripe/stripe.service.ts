import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Alchemy, Network } from 'alchemy-sdk';
import { ethers } from 'ethers';
import { Chain } from '../../common/enums/chain.enum';
import {
  IPaymentProvider,
  PrecheckResult,
  CreatePaymentResult,
  PaymentStatusResult,
} from '../../common/interfaces/payment-provider.interface';
import {
  USDC_ADDRESSES,
  USDC_DECIMALS,
  GAS_BUFFERS,
} from '../../common/constants/token-addresses';
import moment from 'moment';

@Injectable()
export class StripeService implements IPaymentProvider {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;
  private alchemyClients: Map<Chain, Alchemy>;

  constructor(private configService: ConfigService) {
    this.initializeStripe();
    this.initializeAlchemy();
  }

  private initializeStripe() {
    try {
      const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');

      if (!apiKey) {
        throw new Error('Stripe API key not configured');
      }

      this.stripe = new Stripe(apiKey, {
        apiVersion: '2025-09-30.clover',
      });

      this.logger.log('Stripe initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Stripe', error);
      throw error;
    }
  }

  private initializeAlchemy() {
    this.alchemyClients = new Map();

    // Mainnet RPCs
    const rpcEthereum = this.configService.get<string>('RPC_ETHEREUM');
    const rpcPolygon = this.configService.get<string>('RPC_POLYGON');

    // Testnet RPCs
    const rpcSepoliaEth = this.configService.get<string>(
      'RPC_ETHEREUM_SEPOLIA',
    );
    const rpcAmoyPolygon = this.configService.get<string>('RPC_POLYGON_AMOY');
    const rpcSepoliaBase = this.configService.get<string>('RPC_BASE_SEPOLIA');

    // Extract Alchemy API key from RPC URL
    const extractApiKey = (url: string): string | null => {
      const match = url.match(/\/v2\/([^/]+)$/);
      return match ? match[1] : null;
    };

    // Mainnet configurations
    if (rpcEthereum) {
      const apiKey = extractApiKey(rpcEthereum);
      if (apiKey) {
        this.alchemyClients.set(
          Chain.ETHEREUM,
          new Alchemy({
            apiKey,
            network: Network.ETH_MAINNET,
          }),
        );
      }
    }

    if (rpcPolygon) {
      const apiKey = extractApiKey(rpcPolygon);
      if (apiKey) {
        this.alchemyClients.set(
          Chain.POLYGON,
          new Alchemy({
            apiKey,
            network: Network.MATIC_MAINNET,
          }),
        );
      }
    }

    // Testnet configurations
    if (rpcSepoliaEth) {
      const apiKey = extractApiKey(rpcSepoliaEth);
      if (apiKey) {
        this.alchemyClients.set(
          Chain.ETHEREUM_SEPOLIA,
          new Alchemy({
            apiKey,
            network: Network.ETH_SEPOLIA,
          }),
        );
      }
    }

    if (rpcAmoyPolygon) {
      const apiKey = extractApiKey(rpcAmoyPolygon);
      if (apiKey) {
        this.alchemyClients.set(
          Chain.POLYGON_AMOY,
          new Alchemy({
            apiKey,
            network: Network.MATIC_AMOY,
          }),
        );
      }
    }

    if (rpcSepoliaBase) {
      const apiKey = extractApiKey(rpcSepoliaBase);
      if (apiKey) {
        this.alchemyClients.set(
          Chain.BASE_SEPOLIA,
          new Alchemy({
            apiKey,
            network: Network.BASE_SEPOLIA,
          }),
        );
      }
    }

    this.logger.log(
      `Initialized Alchemy clients for ${this.alchemyClients.size} chains`,
    );
  }

  private getAlchemyClient(chain: Chain): Alchemy {
    const client = this.alchemyClients.get(chain);
    if (!client) {
      throw new Error(`Alchemy client not configured for chain: ${chain}`);
    }
    return client;
  }

  private validateAddress(address: string, chain: Chain): boolean {
    if (chain === Chain.SOLANA) {
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    } else {
      return ethers.utils.isAddress(address);
    }
  }

  async precheck(
    address: string,
    chain: Chain,
    amountUsd: number,
  ): Promise<PrecheckResult> {
    try {
      this.logger.log(
        `Stripe Precheck: ${address} on ${chain} for $${amountUsd}`,
      );

      if (!this.validateAddress(address, chain)) {
        return {
          canPay: false,
          usdcBalance: '0',
          nativeBalance: '0',
          estimatedGas: '0',
          requiredUsdc: amountUsd.toString(),
          error: `Invalid address format for ${chain}`,
        };
      }

      if (chain === Chain.SOLANA) {
        return {
          canPay: false,
          usdcBalance: '0',
          nativeBalance: '0',
          estimatedGas: '0',
          requiredUsdc: amountUsd.toString(),
          error: 'Solana precheck not implemented yet',
        };
      }

      const alchemy = this.getAlchemyClient(chain);
      const usdcAddress = USDC_ADDRESSES[chain];
      const usdcDecimals = USDC_DECIMALS[chain];

      // Get token balances using Alchemy
      const balances = await alchemy.core.getTokenBalances(address, [
        usdcAddress,
      ]);
      const usdcBalanceRaw = balances.tokenBalances[0]?.tokenBalance || '0x0';
      const usdcBalance = ethers.utils.formatUnits(
        ethers.BigNumber.from(usdcBalanceRaw),
        usdcDecimals,
      );

      // Get native balance
      const nativeBalanceRaw = await alchemy.core.getBalance(address);
      const nativeBalance = ethers.utils.formatEther(nativeBalanceRaw);

      // Gas estimation
      const gasBuffer = GAS_BUFFERS[chain];
      const gasBufferWei = ethers.utils.parseEther(gasBuffer);

      const requiredUsdc = amountUsd;
      const hasEnoughUsdc = parseFloat(usdcBalance) >= requiredUsdc;
      const hasEnoughGas = nativeBalanceRaw.gte(gasBufferWei);

      const canPay = hasEnoughUsdc && hasEnoughGas;

      const result: PrecheckResult = {
        canPay,
        usdcBalance,
        nativeBalance,
        estimatedGas: gasBuffer,
        requiredUsdc: requiredUsdc.toString(),
      };

      if (!canPay) {
        result.shortfall = {
          usdc: hasEnoughUsdc
            ? '0'
            : (requiredUsdc - parseFloat(usdcBalance)).toFixed(6),
          native: hasEnoughGas
            ? '0'
            : ethers.utils.formatEther(gasBufferWei.sub(nativeBalanceRaw)),
        };
      }

      this.logger.log(
        `Stripe precheck result for ${address}: canPay=${canPay}`,
      );
      return result;
    } catch (error) {
      this.logger.error('Stripe precheck failed', error);
      return {
        canPay: false,
        usdcBalance: '0',
        nativeBalance: '0',
        estimatedGas: '0',
        requiredUsdc: amountUsd.toString(),
        error: error.message,
      };
    }
  }

  async createPayment(
    userId: string,
    sessionId: string,
    amountUsd: number,
    chain: Chain,
    walletAddress: string,
    metadata?: Record<string, any>,
  ): Promise<CreatePaymentResult> {
    try {
      this.logger.log(
        `Creating Stripe crypto payment for session ${sessionId}, amount: $${amountUsd}`,
      );

      const successUrl =
        this.configService.get<string>('STRIPE_SUCCESS_URL') ||
        'http://localhost:3000/api/v1/stripe/success?session_id={CHECKOUT_SESSION_ID}';
      const cancelUrl =
        this.configService.get<string>('STRIPE_CANCEL_URL') ||
        'http://localhost:3000/api/v1/stripe/cancel?session_id={CHECKOUT_SESSION_ID}';

      const expires_at = Math.floor(Date.now() / 1000) + 30 * 60;

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['crypto', 'card'], // Support both crypto and card payments
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'EV Charging Session',
                description: `Session ID: ${sessionId}`,
              },
              unit_amount: Math.round(amountUsd * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        expires_at: expires_at, // 30 minutes
        metadata: {
          user_id: userId,
          session_id: sessionId,
          chain,
          wallet_address: walletAddress,
          ...metadata,
        },
      });

      return {
        payment_id: session.id,
        payment_url: session.url || '',
        expires_at: moment()
          .add(expires_at, 'minute')
          .format('YYYY-MM-DD HH:mm:ss'),
        provider_data: {
          session_id: session.id,
          payment_intent: session.payment_intent,
          chain,
          amount_usd: amountUsd,
          wallet_address: walletAddress,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe payment', error);
      throw error;
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    try {
      this.logger.log(`Getting Stripe payment status for ${paymentId}`);

      const session = await this.stripe.checkout.sessions.retrieve(paymentId);

      return {
        payment_id: paymentId,
        status: session.payment_status,
        details: {
          provider: 'stripe',
          payment_status: session.payment_status,
          customer_email: session.customer_email,
          amount_total: session.amount_total,
          currency: session.currency,
          metadata: session.metadata,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get Stripe payment status', error);
      throw error;
    }
  }

  verifyWebhook(signature: string, payload: any): boolean {
    try {
      const webhookSecret = this.configService.get<string>(
        'STRIPE_WEBHOOK_SECRET',
      );

      if (!webhookSecret) {
        this.logger.warn('Stripe webhook secret not configured');
        return false;
      }

      // Stripe webhook verification
      // In production, use: stripe.webhooks.constructEvent(payload, signature, webhookSecret)
      this.logger.log('Verifying Stripe webhook signature');

      return true; // Mock verification
    } catch (error) {
      this.logger.error('Stripe webhook verification failed', error);
      return false;
    }
  }

  /**
   * Create a Stripe crypto payment link for a charging session
   * @param sessionId - The charging session ID
   * @param amountUsd - Amount in USD
   * @param options - Additional options including expiry and metadata
   * @param cryptoOnly - If true, only enable crypto payments; if false, enable both crypto and card
   */
  async createCryptoPaymentLink(
    sessionId: string,
    amountUsd: number,
    options?: {
      expiresInMinutes?: number;
      metadata?: Record<string, string>;
      cryptoOnly?: boolean;
    },
  ): Promise<Stripe.Checkout.Session> {
    try {
      this.logger.log(
        `Creating Stripe crypto payment link for session ${sessionId}, amount: $${amountUsd}, cryptoOnly: ${options?.cryptoOnly ?? false}`,
      );

      const successUrl =
        this.configService.get<string>('STRIPE_SUCCESS_URL') ||
        'http://localhost:3000/api/v1/stripe/success?session_id={CHECKOUT_SESSION_ID}';
      const cancelUrl =
        this.configService.get<string>('STRIPE_CANCEL_URL') ||
        'http://localhost:3000/api/v1/stripe/cancel?session_id={CHECKOUT_SESSION_ID}';

      const expiryMinutes = options?.expiresInMinutes || 30;
      const expiresAt = Math.floor(Date.now() / 1000) + expiryMinutes * 60;

      // Configure payment methods based on cryptoOnly flag and environment config
      const enableCardPayments =
        this.configService.get<string>('STRIPE_ENABLE_CARD_PAYMENTS') !==
        'false';
      const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
        options?.cryptoOnly
          ? ['crypto'] // Crypto payments only
          : enableCardPayments
            ? ['crypto', 'card'] // Both crypto and card payments
            : ['crypto']; // Crypto only if card payments disabled

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: paymentMethodTypes,
        line_items: [
          {
            price_data: {
              currency: 'usd', // Required for crypto payments
              product_data: {
                name: 'EV Charging Session',
                description: `Charging Session ID: ${sessionId}`,
              },
              unit_amount: Math.round(amountUsd * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          session_id: sessionId,
          type: 'ev_charging',
          payment_methods: paymentMethodTypes.join(','),
          ...(options?.metadata || {}),
        },
        expires_at: expiresAt,
      });

      this.logger.log(
        `Payment link created successfully: ${session.id} with payment methods: ${paymentMethodTypes.join(', ')}`,
      );
      return session;
    } catch (error) {
      this.logger.error('Failed to create Stripe payment link', error);
      throw error;
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentIntentId: string): Promise<Stripe.Refund> {
    try {
      this.logger.log(
        `Processing refund for payment intent: ${paymentIntentId}`,
      );

      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
      });

      this.logger.log(`Refund created successfully: ${refund.id}`);
      return refund;
    } catch (error) {
      this.logger.error('Failed to create refund', error);
      throw error;
    }
  }

  /**
   * Construct webhook event from raw body
   */
  constructWebhookEvent(
    payload: Buffer | string,
    signature: string,
  ): Stripe.Event {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }
}
