# 🔋 Crypto Payment POC

A **NestJS-based Proof of Concept** for crypto payment processing using **Stripe** and **Coinbase CDP** for EV charging sessions.

## ✨ Features

- 🔗 **Multi-provider Payment Support** (Stripe, Coinbase CDP)
- ⚡ **Flexible Balance Checking** with optional precheck validation
- 👤 **User Session Management** with ownership validation
- 🎣 **Stripe Webhook Integration** for payment confirmations
- 🗄️ **SQLite Database** for session and payment tracking
- 🔧 **Comprehensive API** for charging session lifecycle

## � Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# 3. Start the application
npm run start:dev

# 4. Set up webhooks for testing
./setup-ngrok-webhook.sh

# 5. Test the APIs
./test-apis.sh
```

## 🛠️ Available Scripts

| Script                     | Description                              |
| -------------------------- | ---------------------------------------- |
| `npm run start:dev`        | Start development server with hot reload |
| `npm run build`            | Build for production                     |
| `npm run start:prod`       | Start production server                  |
| `npm run test`             | Run unit tests                           |
| `npm run test:e2e`         | Run end-to-end tests                     |
| `./setup-ngrok-webhook.sh` | Set up ngrok tunnel and webhook          |
| `./test-apis.sh`           | Test all API endpoints                   |
| `./ngrok-manager.sh start` | Start ngrok tunnel                       |
| `./ngrok-manager.sh stop`  | Stop ngrok tunnel                        |

## 🏗️ Project Structure

```
src/
├── modules/
│   ├── coinbase/          # Coinbase CDP integration
│   ├── payment/           # Payment processing logic
│   ├── session/           # Charging session management
│   └── stripe/            # Stripe integration & webhooks
├── common/                # Shared DTOs, enums, interfaces
└── main.ts               # Application entry point
```

## 📊 Database

- **SQLite** database with TypeORM
- **ChargingSession** - Session lifecycle management
- **PaymentLink** - Stripe payment tracking
- **BalanceCheck** - User balance verification history

## 🔗 Key API Endpoints

- `POST /api/v1/payment/precheck` - Check wallet balance
- `POST /api/v1/session/start` - Start charging session
- `POST /api/v1/session/stop` - Stop charging session
- `GET /api/v1/payment/link/{sessionId}` - Get payment link
- `GET /api/v1/user/{userId}/sessions` - Get user sessions

## 🎯 Environment Variables

Key environment variables needed in `.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Coinbase CDP Configuration
CDP_API_KEY_ID=your-api-key-id
CDP_API_KEY_SECRET=your-api-secret

# RPC Endpoints
RPC_ETHEREUM=https://eth-mainnet.g.alchemy.com/v2/...
RPC_POLYGON=https://polygon-mainnet.g.alchemy.com/v2/...
```

---

**For detailed setup instructions, API documentation, and troubleshooting → [DOCUMENTATION.md](./DOCUMENTATION.md)**
