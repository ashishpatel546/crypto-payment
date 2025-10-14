import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CdpClient } from '@coinbase/cdp-sdk';
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
import { ethers } from 'ethers';

@Injectable()
export class CoinbaseService implements IPaymentProvider {
  private readonly logger = new Logger(CoinbaseService.name);
  private cdpClient: CdpClient;
  private providers: Map<Chain, ethers.providers.JsonRpcProvider>;

  constructor(private configService: ConfigService) {
    this.initializeCoinbase();
    this.initializeProviders();
  }

  private initializeCoinbase() {
    try {
      const apiKeyId = this.configService.get<string>('CDP_API_KEY_ID');
      const apiKeySecret = this.configService.get<string>('CDP_API_KEY_SECRET');

      if (!apiKeyId || !apiKeySecret) {
        throw new Error('Coinbase CDP credentials not configured');
      }

      // Initialize CDP Client
      this.cdpClient = new CdpClient({
        apiKeyId: apiKeyId,
        apiKeySecret: apiKeySecret,
      });
      this.logger.log('Coinbase CDP initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Coinbase CDP', error);
      throw error;
    }
  }

  private initializeProviders() {
    this.providers = new Map();

    const rpcEthereum = this.configService.get<string>('RPC_ETHEREUM');
    const rpcPolygon = this.configService.get<string>('RPC_POLYGON');

    if (rpcEthereum) {
      this.providers.set(
        Chain.ETHEREUM,
        new ethers.providers.JsonRpcProvider(rpcEthereum),
      );
    }
    if (rpcPolygon) {
      this.providers.set(
        Chain.POLYGON,
        new ethers.providers.JsonRpcProvider(rpcPolygon),
      );
    }

    this.logger.log(
      `Initialized RPC providers for ${this.providers.size} chains`,
    );
  }

  private getProvider(chain: Chain): ethers.providers.JsonRpcProvider {
    const provider = this.providers.get(chain);
    if (!provider) {
      throw new Error(`RPC provider not configured for chain: ${chain}`);
    }
    return provider;
  }

  private validateAddress(address: string, chain: Chain): boolean {
    if (chain === Chain.SOLANA) {
      // Basic Solana address validation (base58, 32-44 chars)
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    } else {
      // EVM chains
      return ethers.utils.isAddress(address);
    }
  }

  async precheck(
    address: string,
    chain: Chain,
    amountUsd: number,
  ): Promise<PrecheckResult> {
    try {
      this.logger.log(`Precheck: ${address} on ${chain} for $${amountUsd}`);

      // Validate address format
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

      // For Solana, we'd need different logic - skip for now
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

      const provider = this.getProvider(chain);
      const usdcAddress = USDC_ADDRESSES[chain];
      const usdcDecimals = USDC_DECIMALS[chain];

      // USDC ERC20 ABI (balanceOf only)
      const usdcAbi = [
        'function balanceOf(address owner) view returns (uint256)',
      ];
      const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, provider);

      // Get USDC balance
      const usdcBalanceRaw = await usdcContract.balanceOf(address);
      const usdcBalance = ethers.utils.formatUnits(
        usdcBalanceRaw,
        usdcDecimals,
      );

      // Get native token balance
      const nativeBalanceRaw = await provider.getBalance(address);
      const nativeBalance = ethers.utils.formatEther(nativeBalanceRaw);

      // Conservative gas estimate
      const gasBuffer = GAS_BUFFERS[chain];
      const gasBufferWei = ethers.utils.parseEther(gasBuffer);

      // Check if user can pay
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

      this.logger.log(`Precheck result for ${address}: canPay=${canPay}`);
      return result;
    } catch (error) {
      this.logger.error('Precheck failed', error);
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
        `Creating Coinbase payment for session ${sessionId}, amount: $${amountUsd}`,
      );

      // Note: This is a placeholder implementation
      // Coinbase Commerce API would be used here for hosted checkout
      // For now, returning mock data structure

      const paymentId = `coinbase_${Date.now()}_${sessionId}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

      // In production, you would:
      // 1. Create a Coinbase Commerce charge via their API
      // 2. Store the charge_id in your database
      // 3. Return the hosted_url

      return {
        payment_id: paymentId,
        payment_url: `https://commerce.coinbase.com/charges/${paymentId}`, // Mock URL
        expires_at: expiresAt,
        provider_data: {
          charge_id: paymentId,
          chain,
          amount_usd: amountUsd,
          wallet_address: walletAddress,
          metadata: {
            user_id: userId,
            session_id: sessionId,
            ...metadata,
          },
        },
      };
    } catch (error) {
      this.logger.error('Failed to create Coinbase payment', error);
      throw error;
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    try {
      this.logger.log(`Getting payment status for ${paymentId}`);

      // In production, query Coinbase Commerce API: GET /charges/{charge_id}
      // For now, returning mock data

      return {
        payment_id: paymentId,
        status: 'pending',
        details: {
          provider: 'coinbase_cdp',
          message: 'Waiting for transaction confirmation',
        },
      };
    } catch (error) {
      this.logger.error('Failed to get payment status', error);
      throw error;
    }
  }

  verifyWebhook(signature: string, payload: any): boolean {
    try {
      // Implement X-CC-Webhook-Signature verification
      // Use HMAC SHA256 with your webhook secret

      this.logger.log('Verifying Coinbase webhook signature');

      // Placeholder implementation
      // In production:
      // const webhookSecret = this.configService.get<string>('COINBASE_WEBHOOK_SECRET');
      // const expectedSignature = crypto.createHmac('sha256', webhookSecret)
      //   .update(JSON.stringify(payload))
      //   .digest('hex');
      // return signature === expectedSignature;

      return true; // Mock verification
    } catch (error) {
      this.logger.error('Webhook verification failed', error);
      return false;
    }
  }
}
