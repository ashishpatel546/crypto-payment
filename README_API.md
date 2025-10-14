# Crypto Payment Gateway - EV Charging

A modular NestJS application supporting crypto payments via **Coinbase CDP** and **Stripe** for EV charging sessions.

## 🏗️ Architecture

### Modular Design

```
src/
├── common/                    # Shared types, DTOs, enums
├── modules/
│   ├── coinbase/             # Coinbase CDP module (independent)
│   ├── stripe/               # Stripe module (independent)
│   └── payment/              # Payment orchestration module
```

### Key Features

- ✅ **Dual Provider Support**: Coinbase CDP & Stripe
- ✅ **Precheck Validation**: Balance & gas verification before payment
- ✅ **Multi-Chain Support**: Ethereum, Polygon, Arbitrum, Base, Solana
- ✅ **Swagger UI**: Interactive API documentation
- ✅ **Webhook Handlers**: For payment confirmations
- ✅ **Clean Architecture**: Provider-agnostic payment interface

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Edit `.env` file with your credentials:

```env
# Coinbase CDP
CDP_API_KEY_ID=your_cdp_key_id
CDP_API_KEY_SECRET=your_cdp_key_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Alchemy RPC
RPC_ETHEREUM=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
RPC_POLYGON=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### 3. Start the Application

```bash
npm run start:dev
```

Application runs on: `http://localhost:3000`
Swagger UI: `http://localhost:3000/api/docs`

## 📡 API Endpoints

### 1. Pre-check Balance

**POST** `/api/v1/payment/precheck?provider=coinbase_cdp`

Check if user has sufficient USDC and gas before starting a charging session.

> **💡 Note**: `user_id` is optional. It's your app's internal user identifier (from JWT/session). See [USER_ID_GUIDE.md](./USER_ID_GUIDE.md) for details.

```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "chain": "ethereum",
  "user_id": "user_123",
  "amount_usd": 25.5
}
```

**Response:**

```json
{
  "canPay": true,
  "usdcBalance": "100.50",
  "nativeBalance": "0.05",
  "estimatedGas": "0.002",
  "requiredUsdc": "25.50"
}
```

### 2. Create Payment

**POST** `/api/v1/payment/create`

Create a crypto payment session after EV charging is complete.

```json
{
  "provider": "coinbase_cdp",
  "user_id": "user_123",
  "session_id": "charging_session_456",
  "amount_usd": 25.5,
  "chain": "ethereum",
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "metadata": {
    "charger_id": "charger_789",
    "location": "NYC"
  }
}
```

**Response:**

```json
{
  "payment_id": "coinbase_1234567890_session_456",
  "payment_url": "https://commerce.coinbase.com/charges/...",
  "provider": "coinbase_cdp",
  "expires_at": "2025-10-09T12:30:00Z",
  "provider_data": { ... }
}
```

### 3. Get Payment Status

**GET** `/api/v1/payment/status/:payment_id?provider=coinbase_cdp`

Check the status of a payment.

**Response:**

```json
{
  "payment_id": "coinbase_1234567890_session_456",
  "status": "confirmed",
  "tx_hash": "0xabc123...",
  "amount_paid": "25.50",
  "from_address": "0x742d35...",
  "details": { ... }
}
```

### 4. Webhooks

- **POST** `/api/v1/payment/webhook/coinbase` - Coinbase webhooks
- **POST** `/api/v1/payment/webhook/stripe` - Stripe webhooks

### 5. Get Supported Providers

**GET** `/api/v1/payment/providers`

```json
{
  "providers": ["coinbase_cdp", "stripe"]
}
```

## 🔧 Supported Chains

| Chain    | Network ID | USDC Address                                 |
| -------- | ---------- | -------------------------------------------- |
| Ethereum | `ethereum` | 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48   |
| Polygon  | `polygon`  | 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174   |
| Arbitrum | `arbitrum` | 0xaf88d065e77c8cC2239327C5EDb3A432268e5831   |
| Base     | `base`     | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913   |
| Solana   | `solana`   | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v |

## 🏛️ Module Independence

### Coinbase Module (`src/modules/coinbase/`)

- Uses Coinbase CDP SDK
- RPC calls via ethers.js for precheck
- Implements `IPaymentProvider` interface

### Stripe Module (`src/modules/stripe/`)

- Uses Stripe SDK + Alchemy SDK
- Balance checks via Alchemy
- Implements `IPaymentProvider` interface

### Payment Module (`src/modules/payment/`)

- Orchestrates both providers
- Provider-agnostic API
- Shared validation logic

## 🧪 Testing with Swagger

1. Visit `http://localhost:3000/api/docs`
2. Expand any endpoint
3. Click **"Try it out"**
4. Fill in the parameters
5. Click **"Execute"**

## 📦 Payment Flow

```
┌─────────────┐
│  Mobile App │
└──────┬──────┘
       │
       │ 1. User selects "Pay with Crypto"
       ├──> POST /api/v1/payment/precheck
       │    (Check USDC + gas balance)
       │
       │ 2. If canPay = true → Start charging
       │
       │ 3. Session ends → Calculate cost
       ├──> POST /api/v1/payment/create
       │    (Create payment with selected provider)
       │
       │ 4. Open payment_url in browser
       │    User confirms in wallet
       │
       │ 5. Provider sends webhook
       ├──> POST /api/v1/payment/webhook/coinbase
       │    (Verify & update order)
       │
       │ 6. Notify user: Payment confirmed
       └──> GET /api/v1/payment/status/:id
```

## 🔐 Security

- ✅ Webhook signature verification
- ✅ Input validation (class-validator)
- ✅ Address format validation
- ✅ Environment variable encryption
- ⚠️ TODO: Add rate limiting
- ⚠️ TODO: Add API key authentication

## 🚧 Production Checklist

- [ ] Configure real Stripe API keys
- [ ] Set up Coinbase Commerce account
- [ ] Configure webhook endpoints (ngrok for testing)
- [ ] Set up database for payment tracking
- [ ] Implement proper error handling & retries
- [ ] Add monitoring & alerting
- [ ] Implement payment polling fallback
- [ ] Add AML/KYC compliance checks
- [ ] Set up proper logging (Winston/Pino)
- [ ] Add rate limiting (throttler)

## 📝 Notes

- Precheck uses RPC calls to validate balance **before** payment
- Both providers use the same interface for easy swapping
- Stripe settles in **USD**, Coinbase can settle in **USDC**
- Solana support is stubbed (needs implementation)

## 🛠️ Development

```bash
# Development mode
npm run start:dev

# Production build
npm run build
npm run start:prod

# Run tests
npm run test

# Linting
npm run lint
```

---

Built with ❤️ for EV Charging crypto payments
