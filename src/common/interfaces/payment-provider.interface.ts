import { Chain } from '../enums/chain.enum';

export interface PrecheckResult {
  canPay: boolean;
  usdcBalance: string;
  nativeBalance: string;
  estimatedGas: string;
  requiredUsdc: string;
  shortfall?: {
    usdc: string;
    native: string;
  };
  error?: string;
}

export interface CreatePaymentResult {
  payment_id: string;
  payment_url: string;
  expires_at: string;
  provider_data: Record<string, any>;
}

export interface PaymentStatusResult {
  payment_id: string;
  status: string;
  tx_hash?: string;
  amount_paid?: string;
  from_address?: string;
  details: Record<string, any>;
}

export interface IPaymentProvider {
  precheck(
    address: string,
    chain: Chain,
    amountUsd: number,
  ): Promise<PrecheckResult>;

  createPayment(
    userId: string,
    sessionId: string,
    amountUsd: number,
    chain: Chain,
    walletAddress: string,
    metadata?: Record<string, any>,
  ): Promise<CreatePaymentResult>;

  getPaymentStatus(paymentId: string): Promise<PaymentStatusResult>;

  verifyWebhook(signature: string, payload: any): boolean;
}
