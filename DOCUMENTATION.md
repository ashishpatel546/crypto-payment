# Crypto Payment POC - Complete Documentation

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Setup & Installation](#setup--installation)
4. [Environment Configuration](#environment-configuration)
5. [Database Schema](#database-schema)
6. [API Documentation](#api-documentation)
7. [Webhook Setup](#webhook-setup)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Deployment](#deployment)

---

## 🎯 Project Overview

This is a **NestJS-based Proof of Concept** for crypto payment processing using **Stripe** and **Coinbase CDP**. The application manages EV charging sessions and handles payment processing through multiple providers with comprehensive balance checking and session management.

### Key Features

- ✅ **Multi-provider Payment Support** (Stripe, Coinbase CDP)
- ✅ **Flexible Balance Checking** with optional precheck validation
- ✅ **User Session Management** with ownership validation
- ✅ **Stripe Webhook Integration** for payment confirmations
- ✅ **SQLite Database** for session and payment tracking
- ✅ **Comprehensive API** for charging session lifecycle
- ✅ **Test Suite** for all major functionalities

---

## 🏗️ Architecture

### Core Modules

```
src/
├── modules/
│   ├── coinbase/          # Coinbase CDP integration
│   ├── payment/           # Payment processing logic
│   ├── session/           # Charging session management
│   └── stripe/            # Stripe integration & webhooks
├── common/
│   ├── constants/         # Token addresses & constants
│   ├── dto/              # Data Transfer Objects
│   ├── enums/            # Chain enums
│   └── interfaces/       # Payment provider interfaces
└── main.ts               # Application entry point
```

### Database Entities

1. **ChargingSession** - Session lifecycle management
2. **PaymentLink** - Stripe payment tracking
3. **BalanceCheck** - User balance verification history

---

## 🚀 Setup & Installation

### Prerequisites

- **Node.js** (v18+)
- **npm** or **yarn**
- **ngrok** (for webhook testing)
- **Stripe Account** (test mode)
- **Coinbase Developer Platform** account

### Installation Steps

```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd crypto_payments
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# 3. Start the application
npm run start:dev

# 4. Set up webhooks (see Webhook Setup section)
./setup-ngrok-webhook.sh
```

---

## ⚙️ Environment Configuration

Create a `.env` file in the project root:

```env
# Application Configuration
NODE_ENV=development
SERVICE_PORT=3000

# Coinbase CDP Configuration
CDP_API_KEY_ID="your-cdp-api-key-id"
CDP_API_KEY_SECRET="your-cdp-api-secret"

# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
STRIPE_SUCCESS_URL="http://localhost:3000/api/v1/stripe/success?session_id={CHECKOUT_SESSION_ID}"
STRIPE_CANCEL_URL="http://localhost:3000/api/v1/stripe/cancel?session_id={CHECKOUT_SESSION_ID}"
STRIPE_ENABLE_CARD_PAYMENTS=true

# RPC Endpoints for Balance Checking
RPC_ETHEREUM="https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
RPC_POLYGON="https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
RPC_ETHEREUM_SEPOLIA="https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
RPC_POLYGON_AMOY="https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY"
RPC_BASE_SEPOLIA="https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
```

---

## 🗄️ Database Schema

The application uses **SQLite** with TypeORM. Database file: `crypto_payments.db`

### ChargingSession Entity

```typescript
{
  id: string(UUID);
  userId: string;
  chargerId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  finalCost: number;
  metadata: string(JSON);
  createdAt: Date;
  updatedAt: Date;
}
```

### PaymentLink Entity

```typescript
{
  id: string(UUID);
  sessionId: string(FK);
  stripeCheckoutSessionId: string;
  paymentUrl: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
  expiresAt: Date;
  stripePaymentIntentId: string;
  metadata: string(JSON);
  createdAt: Date;
  updatedAt: Date;
}
```

### BalanceCheck Entity

```typescript
{
  id: string(UUID);
  userId: string;
  walletAddress: string;
  chain: string;
  provider: string;
  requestedAmount: number;
  canPay: boolean;
  usdcBalance: string;
  nativeBalance: string;
  estimatedGas: string;
  requiredUsdc: string;
  createdAt: Date;
}
```

---

## 📡 API Documentation

### Base URL: `http://localhost:3000`

### 1. Balance Checking

#### Precheck Wallet Balance

```http
POST /api/v1/payment/precheck
Content-Type: application/json

{
  "provider": "STRIPE",
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "chain": "ETHEREUM",
  "amountUsd": 10.0,
  "userId": "user-123"
}
```

**Response:**

```json
{
  "canPay": true,
  "usdcBalance": "100.50",
  "nativeBalance": "0.5",
  "estimatedGas": "0.002",
  "requiredUsdc": "10.0"
}
```

### 2. Session Management

#### Start Charging Session (with balance check)

```http
POST /api/v1/session/start
Content-Type: application/json

{
  "userId": "user-123",
  "chargerId": "CHARGER-001",
  "checkBalance": true,
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "chain": "ETHEREUM",
  "expectedMaxCost": 10.0
}
```

#### Start Charging Session (skip balance check)

```http
POST /api/v1/session/start
Content-Type: application/json

{
  "userId": "user-123",
  "chargerId": "CHARGER-001",
  "checkBalance": false
}
```

#### Stop Charging Session

```http
POST /api/v1/session/stop
Content-Type: application/json

{
  "userId": "user-123",
  "sessionId": "session-uuid",
  "finalCost": 7.50
}
```

### 3. Payment Link Management

#### Get Payment Link for Session

```http
GET /api/v1/payment/link/{sessionId}
```

#### Recreate Expired Payment Link

```http
POST /api/v1/payment/recreate-link
Content-Type: application/json

{
  "sessionId": "session-uuid"
}
```

#### Process Refund

```http
POST /api/v1/payment/refund
Content-Type: application/json

{
  "sessionId": "session-uuid"
}
```

### 4. User History & Management

#### Get User Balance Check History

```http
GET /api/v1/user/{userId}/balance-checks
```

#### Get User Charging Sessions

```http
GET /api/v1/user/{userId}/sessions
```

#### Check Recent Balance Verification

```http
GET /api/v1/user/recent-balance-check/{userId}?walletAddress=0x...&chain=ETHEREUM&requestedAmount=10.0
```

---

## 🔗 Webhook Setup

### Quick Setup with ngrok

1. **Start your application:**

   ```bash
   npm run start:dev
   ```

2. **Run the setup script:**

   ```bash
   ./setup-ngrok-webhook.sh
   ```

3. **Copy the webhook URL** and add it to your Stripe Dashboard:
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://your-ngrok-url.ngrok.dev/api/v1/stripe/webhook`
   - Select events: `checkout.session.completed`, `payment_intent.succeeded`

### Manual ngrok Setup

```bash
# 1. Install ngrok
npm install -g ngrok

# 2. Authenticate (get token from ngrok.com)
ngrok config add-authtoken YOUR_NGROK_TOKEN

# 3. Start tunnel
ngrok http 3000

# 4. Use the HTTPS URL for webhooks
```

### Webhook Events Handled

- `checkout.session.completed` - Payment session completion
- `payment_intent.succeeded` - Payment confirmation
- Error handling for failed payments

---

## 🧪 Testing

### Manual API Testing

Use the comprehensive test script:

```bash
./test-apis.sh
```

This script tests:

- ✅ Balance precheck functionality
- ✅ Session start/stop workflow
- ✅ Payment link generation
- ✅ User history retrieval
- ✅ Error handling scenarios

### Individual Test Commands

```bash
# Test balance precheck
curl -X POST http://localhost:3000/api/v1/payment/precheck \
  -H "Content-Type: application/json" \
  -d '{"provider":"STRIPE","address":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","chain":"ETHEREUM","amountUsd":10.0,"userId":"user-123"}'

# Test session start
curl -X POST http://localhost:3000/api/v1/session/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-123","chargerId":"CHARGER-001","checkBalance":false}'
```

### Unit Tests

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "ngrok: command not found"

```bash
# Install ngrok
npm install -g ngrok
# OR
brew install ngrok
```

#### 2. "Webhook signature verification failed"

- Check `STRIPE_WEBHOOK_SECRET` in `.env`
- Ensure webhook endpoint is correctly configured in Stripe
- Verify ngrok URL is accessible

#### 3. "Database connection failed"

- Check if SQLite file has write permissions
- Verify TypeORM configuration in `app.module.ts`

#### 4. "Balance check failed"

- Verify RPC endpoints in `.env`
- Check Alchemy API key validity
- Ensure wallet address format is correct

#### 5. "Session validation failed"

- Verify `userId` matches session owner
- Check session exists and is not expired
- Ensure proper request body format

### Debug Mode

Enable detailed logging:

```bash
NODE_ENV=development npm run start:dev
```

---

## 🚀 Deployment

### Production Environment Variables

```env
NODE_ENV=production
SERVICE_PORT=3000

# Use production Stripe keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Production RPC endpoints
RPC_ETHEREUM=https://eth-mainnet.g.alchemy.com/v2/...
RPC_POLYGON=https://polygon-mainnet.g.alchemy.com/v2/...
```

### Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm run start:prod
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

---

## 📞 Support & Contributing

### Project Structure Guidelines

- Follow NestJS module pattern
- Use DTOs for request/response validation
- Implement proper error handling
- Add comprehensive tests for new features

### Environment Branches

- `main` - Production ready code
- `development` - Feature development
- `staging` - Pre-production testing

### Contact

For technical questions or support, refer to the API documentation or check the troubleshooting section above.

---

**Last Updated:** October 2024  
**Version:** 1.0.0  
**Framework:** NestJS v10+  
**Database:** SQLite with TypeORM  
**Payment Providers:** Stripe, Coinbase CDP
