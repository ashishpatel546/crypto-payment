# Testing with Testnet USDC

## Issue

If you have USDC on a **testnet** (like Sepolia, Mumbai/Amoy), the balance won't show up when using mainnet RPC endpoints.

## Solution - Configure Testnet Support

### Step 1: Add Testnet RPC to .env

Add the appropriate testnet RPC endpoint to your `.env` file:

**For Ethereum Sepolia:**

```env
RPC_ETHEREUM_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

**For Polygon Amoy (new Mumbai):**

```env
RPC_POLYGON_AMOY=https://polygon-amoy.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

**For Base Sepolia:**

```env
RPC_BASE_SEPOLIA=https://base-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

### Step 2: Get Alchemy API Key for Testnet

1. Go to [Alchemy Dashboard](https://dashboard.alchemy.com/)
2. Click "Create App"
3. Select **TESTNET** network (Sepolia, Amoy, etc.)
4. Copy the API key from the app URL

### Step 3: Test with Correct Chain Parameter

When calling the precheck API, use the testnet chain name:

**For Sepolia:**

```bash
curl -X POST http://localhost:3000/api/v1/payment/precheck \
  -H "Content-Type: application/json" \
  -d '{
    "address": "YOUR_WALLET_ADDRESS",
    "chain": "ethereum-sepolia",
    "amount_usd": 0.5
  }'
```

**For Polygon Amoy:**

```bash
curl -X POST http://localhost:3000/api/v1/payment/precheck \
  -H "Content-Type: application/json" \
  -d '{
    "address": "YOUR_WALLET_ADDRESS",
    "chain": "polygon-amoy",
    "amount_usd": 0.5
  }'
```

**For Base Sepolia:**

```bash
curl -X POST http://localhost:3000/api/v1/payment/precheck \
  -H "Content-Type: application/json" \
  -d '{
    "address": "YOUR_WALLET_ADDRESS",
    "chain": "base-sepolia",
    "amount_usd": 0.5
  }'
```

## Supported Chains

### Mainnet (Production)

- `ethereum` - Ethereum Mainnet
- `polygon` - Polygon Mainnet
- `arbitrum` - Arbitrum One
- `base` - Base Mainnet

### Testnet (Testing)

- `ethereum-sepolia` - Ethereum Sepolia
- `polygon-amoy` - Polygon Amoy (replacement for Mumbai)
- `base-sepolia` - Base Sepolia

## Get Testnet USDC

If you need testnet USDC:

### Ethereum Sepolia USDC

1. Get Sepolia ETH from [Alchemy Faucet](https://sepoliafaucet.com/)
2. Get USDC from [Circle Faucet](https://faucet.circle.com/)
   - Or swap on Uniswap Sepolia

### Polygon Amoy USDC

1. Get MATIC from [Polygon Faucet](https://faucet.polygon.technology/)
2. Bridge or get USDC from testnet faucets

### Base Sepolia USDC

1. Get ETH from [Base Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
2. Get USDC from Circle or swap

## Testnet USDC Contract Addresses

Already configured in the app:

- **Ethereum Sepolia**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **Polygon Amoy**: `0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582`
- **Base Sepolia**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

## Troubleshooting

### Balance shows 0 but I have USDC

**Check these:**

1. **Correct chain parameter?**
   - Use `ethereum-sepolia` not `ethereum` for testnet
2. **RPC configured in .env?**
   - Add `RPC_ETHEREUM_SEPOLIA=...` to your `.env` file
3. **Restart the server?**
   - After updating `.env`, restart: `npm run start:dev`
4. **Check your wallet address on block explorer:**
   - Sepolia: https://sepolia.etherscan.io/address/YOUR_ADDRESS
   - Amoy: https://amoy.polygonscan.com/address/YOUR_ADDRESS
   - Verify USDC balance shows there

5. **Verify USDC contract address:**
   - Make sure you have the correct USDC token (not a different stablecoin)

## Example Response

When configured correctly, you'll see your actual testnet balance:

```json
{
  "canPay": true,
  "usdcBalance": "100.50", // Your actual testnet USDC
  "nativeBalance": "0.5", // Your testnet ETH/MATIC
  "estimatedGas": "0.002",
  "requiredUsdc": "0.5"
}
```

## Quick Test Script

```bash
# Set your details
WALLET_ADDRESS="0xYourAddress"
CHAIN="ethereum-sepolia"  # or polygon-amoy, base-sepolia

# Test precheck
curl -X POST http://localhost:3000/api/v1/payment/precheck \
  -H "Content-Type: application/json" \
  -d "{
    \"address\": \"$WALLET_ADDRESS\",
    \"chain\": \"$CHAIN\",
    \"amount_usd\": 0.5
  }" | jq .
```

---

**Need Help?**

1. Check which testnet your USDC is on (Sepolia, Amoy, etc.)
2. Configure the matching RPC in `.env`
3. Use the correct chain name in API calls
4. Restart the server after .env changes
