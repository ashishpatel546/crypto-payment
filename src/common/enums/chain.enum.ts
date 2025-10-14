export enum Chain {
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  ARBITRUM = 'arbitrum',
  BASE = 'base',
  SOLANA = 'solana',
  // Testnets
  ETHEREUM_SEPOLIA = 'ethereum-sepolia',
  POLYGON_AMOY = 'polygon-amoy',
  BASE_SEPOLIA = 'base-sepolia',
}

export enum PaymentProvider {
  COINBASE_CDP = 'coinbase_cdp',
  STRIPE = 'stripe',
}

export enum PaymentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  UNDERPAID = 'underpaid',
  OVERPAID = 'overpaid',
}
