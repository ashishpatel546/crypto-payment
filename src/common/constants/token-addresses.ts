import { Chain } from '../enums/chain.enum';

export const USDC_ADDRESSES: Record<Chain, string> = {
  // Mainnet
  [Chain.ETHEREUM]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  [Chain.POLYGON]: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  [Chain.ARBITRUM]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  [Chain.BASE]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [Chain.SOLANA]: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  // Testnets
  [Chain.ETHEREUM_SEPOLIA]: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
  [Chain.POLYGON_AMOY]: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582', // Amoy USDC
  [Chain.BASE_SEPOLIA]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
};

export const USDC_DECIMALS: Record<Chain, number> = {
  [Chain.ETHEREUM]: 6,
  [Chain.POLYGON]: 6,
  [Chain.ARBITRUM]: 6,
  [Chain.BASE]: 6,
  [Chain.SOLANA]: 6,
  [Chain.ETHEREUM_SEPOLIA]: 6,
  [Chain.POLYGON_AMOY]: 6,
  [Chain.BASE_SEPOLIA]: 6,
};

// Conservative gas buffers in native token (ETH/MATIC/SOL)
export const GAS_BUFFERS: Record<Chain, string> = {
  [Chain.ETHEREUM]: '0.002',
  [Chain.POLYGON]: '0.05',
  [Chain.ARBITRUM]: '0.001',
  [Chain.BASE]: '0.001',
  [Chain.SOLANA]: '0.001',
  [Chain.ETHEREUM_SEPOLIA]: '0.000', //by default Sepolia may have 0.02 but we kept it 0 for testing
  [Chain.POLYGON_AMOY]: '0.05',
  [Chain.BASE_SEPOLIA]: '0.001',
};
