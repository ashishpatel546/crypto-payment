# Example API Requests

## Using cURL

### 1. Precheck with Coinbase

```bash
curl -X POST http://localhost:3000/api/v1/payment/precheck?provider=coinbase_cdp \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "chain": "ethereum",
    "user_id": "user_123",
    "amount_usd": 25.50
  }'
```

### 2. Precheck with Stripe

```bash
curl -X POST http://localhost:3000/api/v1/payment/precheck?provider=stripe \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "chain": "polygon",
    "user_id": "user_456",
    "amount_usd": 15.00
  }'
```

### 3. Create Payment with Coinbase

```bash
curl -X POST http://localhost:3000/api/v1/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "coinbase_cdp",
    "user_id": "user_123",
    "session_id": "charging_session_789",
    "amount_usd": 25.50,
    "chain": "ethereum",
    "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "metadata": {
      "charger_id": "charger_001",
      "location": "NYC Manhattan",
      "kwh_charged": 25.5
    }
  }'
```

### 4. Create Payment with Stripe

```bash
curl -X POST http://localhost:3000/api/v1/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "stripe",
    "user_id": "user_456",
    "session_id": "charging_session_790",
    "amount_usd": 15.00,
    "chain": "polygon",
    "wallet_address": "0x8f6a5c3c2c1d9e8f7b6a5d4c3b2a1f0e9d8c7b6a",
    "metadata": {
      "charger_id": "charger_002",
      "location": "SF Bay Area"
    }
  }'
```

### 5. Get Payment Status

```bash
# Coinbase payment status
curl -X GET "http://localhost:3000/api/v1/payment/status/coinbase_1234567890_session_789?provider=coinbase_cdp"

# Stripe payment status
curl -X GET "http://localhost:3000/api/v1/payment/status/cs_test_a1b2c3d4e5?provider=stripe"
```

### 6. Get Supported Providers

```bash
curl -X GET http://localhost:3000/api/v1/payment/providers
```

## Using HTTPie

### Precheck

```bash
http POST localhost:3000/api/v1/payment/precheck provider==coinbase_cdp \
  address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
  chain="ethereum" \
  user_id="user_123" \
  amount_usd:=25.50
```

### Create Payment

```bash
http POST localhost:3000/api/v1/payment/create \
  provider="coinbase_cdp" \
  user_id="user_123" \
  session_id="charging_session_789" \
  amount_usd:=25.50 \
  chain="ethereum" \
  wallet_address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
  metadata:='{"charger_id": "charger_001"}'
```

## Response Examples

### Successful Precheck (canPay = true)

```json
{
  "canPay": true,
  "usdcBalance": "100.500000",
  "nativeBalance": "0.05",
  "estimatedGas": "0.002",
  "requiredUsdc": "25.5"
}
```

### Failed Precheck (insufficient funds)

```json
{
  "canPay": false,
  "usdcBalance": "10.000000",
  "nativeBalance": "0.001",
  "estimatedGas": "0.002",
  "requiredUsdc": "25.5",
  "shortfall": {
    "usdc": "15.500000",
    "native": "0.001"
  }
}
```

### Payment Created

```json
{
  "payment_id": "coinbase_1728567890123_charging_session_789",
  "payment_url": "https://commerce.coinbase.com/charges/ABC123XYZ",
  "provider": "coinbase_cdp",
  "expires_at": "2025-10-09T12:45:00.000Z",
  "provider_data": {
    "charge_id": "coinbase_1728567890123_charging_session_789",
    "chain": "ethereum",
    "amount_usd": 25.5,
    "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "metadata": {
      "user_id": "user_123",
      "session_id": "charging_session_789",
      "charger_id": "charger_001"
    }
  }
}
```

### Payment Status

```json
{
  "payment_id": "coinbase_1728567890123_charging_session_789",
  "status": "confirmed",
  "tx_hash": "0xabc123def456...",
  "amount_paid": "25.50",
  "from_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "details": {
    "provider": "coinbase_cdp",
    "confirmations": 12,
    "block_height": 18123456
  }
}
```
