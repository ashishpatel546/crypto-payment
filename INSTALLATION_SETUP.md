# 🚀 Installation & Ngrok Setup Guide

A comprehensive guide for setting up the Crypto Payment POC application with ngrok for webhook testing.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Installation](#project-installation)
3. [Ngrok Installation & Setup](#ngrok-installation--setup)
4. [Environment Configuration](#environment-configuration)
5. [Starting the Application](#starting-the-application)
6. [Webhook Configuration](#webhook-configuration)
7. [Testing Your Setup](#testing-your-setup)
8. [Troubleshooting](#troubleshooting)
9. [Scripts Reference](#scripts-reference)

---

## 🔧 Prerequisites

Before starting, ensure you have the following installed:

### Required Software

- **Node.js** (v18.0.0 or higher)

  ```bash
  node --version  # Should be v18+
  ```

- **npm** (comes with Node.js)

  ```bash
  npm --version
  ```

- **Git** (for cloning the repository)
  ```bash
  git --version
  ```

### Required Accounts & API Keys

You'll need accounts and API keys from:

1. **Stripe** (for payment processing)
   - Create account at [stripe.com](https://stripe.com)
   - Get your test API keys from the dashboard

2. **Coinbase Developer Platform** (for crypto payments)
   - Create account at [cdp.coinbase.com](https://cdp.coinbase.com)
   - Generate API credentials

3. **Ngrok** (for webhook tunneling)
   - Create account at [ngrok.com](https://ngrok.com)
   - Get your authentication token

---

## 📦 Project Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd cryto_payments
```

### 2. Install Dependencies

```bash
# Install all project dependencies
npm install

# Verify installation
npm list --depth=0
```

### 3. Verify Project Structure

Your project should have this structure:

```
cryto_payments/
├── src/
│   ├── modules/
│   │   ├── coinbase/
│   │   ├── payment/
│   │   ├── session/
│   │   └── stripe/
│   └── main.ts
├── package.json
├── setup-ngrok-webhook.sh
├── ngrok-manager.sh
└── test-apis.sh
```

---

## 🌐 Ngrok Installation & Setup

Ngrok creates secure tunnels to your localhost, essential for testing webhooks during development.

### Installation Options

#### Option 1: Using npm (Recommended)

```bash
npm install -g ngrok
```

#### Option 2: Using Homebrew (macOS)

```bash
brew install ngrok
```

#### Option 3: Direct Download

1. Visit [ngrok.com/download](https://ngrok.com/download)
2. Download for your operating system
3. Extract and add to your PATH

### Verify Installation

```bash
ngrok version
# Should output version information
```

### Configure Ngrok Authentication

1. **Get your authtoken** from [ngrok.com/dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)

2. **Configure ngrok** with your token:

   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
   ```

3. **Verify configuration**:
   ```bash
   ngrok config check
   ```

---

## ⚙️ Environment Configuration

### 1. Create Environment File

```bash
# Copy the example environment file
cp .env.example .env
```

### 2. Configure Your .env File

Edit the `.env` file with your actual API keys:

```env
# Application Configuration
NODE_ENV=development
SERVICE_PORT=3000

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=crypto_payments

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Coinbase CDP Configuration
COINBASE_API_KEY=your_coinbase_api_key_here
COINBASE_PRIVATE_KEY=your_coinbase_private_key_here

# Alchemy Configuration (for blockchain interactions)
ALCHEMY_API_KEY=your_alchemy_api_key_here
ALCHEMY_BASE_URL=https://eth-mainnet.g.alchemy.com/v2/

# Ngrok Configuration (optional - can be set in script)
NGROK_AUTH_TOKEN=your_ngrok_auth_token_here
```

### 3. Environment Variables Explanation

| Variable                | Description                         | Required |
| ----------------------- | ----------------------------------- | -------- |
| `STRIPE_SECRET_KEY`     | Your Stripe secret key (test mode)  | ✅       |
| `STRIPE_WEBHOOK_SECRET` | Webhook endpoint secret from Stripe | ✅       |
| `COINBASE_API_KEY`      | Coinbase CDP API key                | ✅       |
| `COINBASE_PRIVATE_KEY`  | Coinbase CDP private key            | ✅       |
| `ALCHEMY_API_KEY`       | Alchemy API key for blockchain data | ✅       |
| `NGROK_AUTH_TOKEN`      | Ngrok authentication token          | ⚠️       |

---

## 🚀 Starting the Application

### 1. Start the NestJS Application

```bash
# Development mode with hot reload
npm run start:dev

# Or using the alias
npm run dev
```

You should see output similar to:

```
[Nest] 12345  - 01/01/2024, 10:00:00 AM     LOG [NestApplication] Nest application successfully started +2ms
[Nest] 12345  - 01/01/2024, 10:00:00 AM     LOG [AppService] Application running on: http://localhost:3000
```

### 2. Verify Application is Running

Open a new terminal and test:

```bash
# Check if the app is responding
curl http://localhost:3000/health-check

# Should return health status
```

---

## 🔗 Webhook Configuration

### Automated Setup (Recommended)

Use our convenient setup script:

```bash
# Make the script executable (if needed)
chmod +x setup-ngrok-webhook.sh

# Run the setup script
./setup-ngrok-webhook.sh
```

This script will:

1. ✅ Check if ngrok is installed
2. ✅ Configure ngrok authentication
3. ✅ Start ngrok tunnel to localhost:3000
4. ✅ Display your webhook URL
5. ✅ Provide Stripe configuration instructions

### Manual Setup

If you prefer manual setup:

#### 1. Start Ngrok Tunnel

```bash
ngrok http 3000
```

#### 2. Get Your Webhook URL

From the ngrok output, copy the HTTPS URL:

```
https://abc123.ngrok.dev -> http://localhost:3000
```

Your webhook URL will be:

```
https://abc123.ngrok.dev/api/v1/stripe/webhook
```

#### 3. Configure Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://abc123.ngrok.dev/api/v1/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Add the endpoint
6. Copy the webhook signing secret and add it to your `.env` file

---

## 🧪 Testing Your Setup

### 1. Test API Endpoints

Use our test script:

```bash
# Make the script executable (if needed)
chmod +x test-apis.sh

# Run all API tests
./test-apis.sh
```

### 2. Manual API Testing

Test individual endpoints:

```bash
# Test health check
curl http://localhost:3000/health-check

# Test start session
curl -X POST http://localhost:3000/api/v1/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "stationId": "station-456",
    "paymentProvider": "stripe"
  }'

# Test balance check
curl -X POST http://localhost:3000/api/v1/payment/check-balance \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6637C0532c2Dee9b9eee4b7A5c6e5623",
    "chain": "ethereum",
    "tokenAddress": "0xA0b86a33E6827e9a5E3EC2cC4DbB85d9B63Dac71",
    "requiredAmount": "1000000"
  }'
```

### 3. Test Webhook Delivery

1. Create a test payment in Stripe Dashboard
2. Check your application logs for webhook events
3. Verify webhook endpoint responds with 200 status

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### Ngrok Issues

**Problem**: `ngrok: command not found`

```bash
# Solution: Install ngrok
npm install -g ngrok
# Or: brew install ngrok
```

**Problem**: `ngrok tunnel not working`

```bash
# Solution: Check authentication
ngrok config check
ngrok config add-authtoken YOUR_TOKEN
```

**Problem**: `tunnel already in use`

```bash
# Solution: Stop existing tunnels
pkill ngrok
./ngrok-manager.sh stop
```

#### Application Issues

**Problem**: `Port 3000 already in use`

```bash
# Solution: Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in .env
SERVICE_PORT=3001
```

**Problem**: `Environment variables not loaded`

```bash
# Solution: Check .env file exists and is in project root
ls -la .env
cat .env
```

**Problem**: `Database connection failed`

```bash
# Solution: Check database configuration
# For SQLite (default), ensure write permissions
mkdir -p data
chmod 755 data
```

#### Webhook Issues

**Problem**: `Webhook signature verification failed`

```bash
# Solution: Update webhook secret in .env
# Get from Stripe Dashboard → Webhooks → Select endpoint → Signing secret
```

**Problem**: `Webhook not receiving events`

```bash
# Solution: Check ngrok tunnel and Stripe configuration
curl https://your-ngrok-url.ngrok.dev/api/v1/stripe/webhook
# Should return method not allowed (but proves tunnel works)
```

### Debug Commands

```bash
# Check ngrok status
./ngrok-manager.sh status

# Check application logs
npm run start:dev  # Watch logs in real-time

# Check ngrok logs
cat ngrok.log

# Test webhook URL
curl -X POST https://your-ngrok-url.ngrok.dev/api/v1/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Environment Variables Validation

Create a simple test script:

```bash
# Create test-env.js
cat > test-env.js << 'EOF'
require('dotenv').config();

const required = [
  'STRIPE_SECRET_KEY',
  'COINBASE_API_KEY',
  'ALCHEMY_API_KEY'
];

required.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ Missing: ${key}`);
  } else {
    console.log(`✅ Found: ${key}`);
  }
});
EOF

# Run validation
node test-env.js
```

---

## 📚 Scripts Reference

### Provided Scripts

| Script          | Command              | Description            |
| --------------- | -------------------- | ---------------------- |
| **Development** | `npm run start:dev`  | Start with hot reload  |
| **Production**  | `npm run start:prod` | Start production build |
| **Build**       | `npm run build`      | Build for production   |
| **Test**        | `npm run test`       | Run unit tests         |
| **E2E Test**    | `npm run test:e2e`   | Run end-to-end tests   |

### Ngrok Management Scripts

| Script            | Command                     | Description            |
| ----------------- | --------------------------- | ---------------------- |
| **Setup Webhook** | `./setup-ngrok-webhook.sh`  | Complete webhook setup |
| **Start Ngrok**   | `./ngrok-manager.sh start`  | Start ngrok tunnel     |
| **Stop Ngrok**    | `./ngrok-manager.sh stop`   | Stop ngrok tunnel      |
| **Ngrok Status**  | `./ngrok-manager.sh status` | Check ngrok status     |
| **Get URL**       | `./ngrok-manager.sh url`    | Get current tunnel URL |

### Testing Scripts

| Script           | Command                            | Description        |
| ---------------- | ---------------------------------- | ------------------ |
| **Test APIs**    | `./test-apis.sh`                   | Test all endpoints |
| **Health Check** | `curl localhost:3000/health-check` | Basic health test  |

### Make Scripts Executable

```bash
chmod +x setup-ngrok-webhook.sh
chmod +x ngrok-manager.sh
chmod +x test-apis.sh
```

---

## 🎯 Next Steps

After successful setup:

1. **Explore the API** using the test scripts
2. **Review the Documentation** in `DOCUMENTATION.md`
3. **Customize the application** for your specific needs
4. **Set up production deployment** following the deployment guide

---

## 🆘 Getting Help

If you encounter issues:

1. **Check the logs** in your terminal
2. **Review this troubleshooting section**
3. **Verify environment variables** are correct
4. **Test ngrok tunnel** independently
5. **Check Stripe webhook configuration**

For additional support, refer to:

- [NestJS Documentation](https://docs.nestjs.com/)
- [Stripe Webhook Guide](https://stripe.com/docs/webhooks)
- [Ngrok Documentation](https://ngrok.com/docs)
- [Coinbase CDP Docs](https://docs.cdp.coinbase.com/)

---

_Happy coding! 🚀_
