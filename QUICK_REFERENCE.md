# Stripe Crypto Payment POC - Quick Reference

## ✅ Implemented APIs

All the required APIs have been successfully implemented:

### 1. ✅ POST /api/v1/payment/precheck

**Purpose**: Validate wallet balances (RPC)  
**Description**: Checks if the user has sufficient USDC and native token balance for the payment

**Request**:

```bash
curl -X POST http://localhost:3000/api/v1/payment/precheck \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "chain": "ethereum",
    "amount_usd": 0.5
  }'
```

---

### 2. ✅ POST /api/v1/session/start

**Purpose**: Create ChargingSession (IN_PROGRESS)  
**Description**: Starts a new charging session and returns a session ID

**Request**:

```bash
curl -X POST http://localhost:3000/api/v1/session/start
```

**Response**:

```json
{
  "success": true,
  "sessionId": "uuid-here",
  "message": "Charging session started successfully"
}
```

---

### 3. ✅ POST /api/v1/session/stop

**Purpose**: Finalize cost and create Stripe payment link  
**Description**: Finalizes the session with $0.50 cost (hardcoded for POC), creates Stripe payment link, and stores it in SQLite database

**Request**:

```bash
curl -X POST http://localhost:3000/api/v1/session/stop \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "uuid-from-start"
  }'
```

**Response**:

```json
{
  "success": true,
  "sessionId": "uuid-here",
  "finalCost": 0.5,
  "paymentUrl": "https://checkout.stripe.com/...",
  "amount": 0.5
}
```

---

### 4. ✅ GET /api/v1/payment/link/:sessionId

**Purpose**: Fetch hosted URL for app  
**Description**: Retrieves the payment link stored in SQLite database for a given session ID

**Request**:

```bash
curl http://localhost:3000/api/v1/payment/link/uuid-here
```

**Response**:

```json
{
  "sessionId": "uuid-here",
  "paymentUrl": "https://checkout.stripe.com/...",
  "amount": 0.5,
  "status": "PENDING",
  "expiresAt": "2025-10-14T12:00:00.000Z",
  "isExpired": false
}
```

---

### 5. ✅ POST /api/v1/stripe/webhook

**Purpose**: Stripe webhook receiver (verify signature)  
**Description**: Receives webhook events from Stripe, verifies signature, and updates payment status in database

**Configuration**: Register this endpoint in Stripe Dashboard

**Webhook Events Handled**:

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

---

### 6. ✅ POST /api/v1/payment/recreate-link

**Purpose**: Create new link on retry  
**Description**: Creates a new payment link for a session if the previous one expired

**Request**:

```bash
curl -X POST http://localhost:3000/api/v1/payment/recreate-link \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "uuid-here"
  }'
```

**Response**:

```json
{
  "success": true,
  "sessionId": "uuid-here",
  "paymentUrl": "https://checkout.stripe.com/...",
  "amount": 0.5,
  "expiresAt": "2025-10-14T12:00:00.000Z"
}
```

---

### 7. ✅ POST /api/v1/payment/refund

**Purpose**: Admin refund endpoint  
**Description**: Processes a refund through Stripe for a completed payment

**Request**:

```bash
curl -X POST http://localhost:3000/api/v1/payment/refund \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "uuid-here"
  }'
```

**Response**:

```json
{
  "success": true,
  "sessionId": "uuid-here",
  "refundId": "re_123",
  "amount": 0.5,
  "message": "Refund processed successfully"
}
```

---

## 🗄️ Database

**Type**: SQLite  
**File**: `crypto_payments.db` (auto-created in project root)  
**Tables**:

- `charging_sessions`: Stores session information
- `payment_links`: Stores Stripe payment links with expiry

---

## 🚀 Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# Access Swagger UI
open http://localhost:3000/api/docs
```

---

## 📝 Environment Setup

Create `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
STRIPE_SUCCESS_URL=http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:3000/cancel

RPC_ETHEREUM=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
RPC_POLYGON=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY

PORT=3000
```

---

## 🔄 Complete Payment Flow

```
1. [Optional] Precheck wallet balance
   POST /api/v1/payment/precheck

2. Start charging session
   POST /api/v1/session/start
   → Returns sessionId

3. Stop charging session (creates payment link)
   POST /api/v1/session/stop
   → Returns paymentUrl + stores in database

4. Customer pays via Stripe checkout
   → User redirects to paymentUrl

5. Stripe sends webhook
   POST /api/v1/stripe/webhook
   → Updates payment status in database

6. [Optional] Retrieve payment link
   GET /api/v1/payment/link/:sessionId

7. [If expired] Recreate payment link
   POST /api/v1/payment/recreate-link

8. [If needed] Refund payment
   POST /api/v1/payment/refund
```

---

## ✨ Key Features

✅ All 7 required APIs implemented  
✅ SQLite database for session and payment tracking  
✅ Stripe payment link generation  
✅ Payment link expiry handling  
✅ Webhook signature verification  
✅ Automatic payment status updates  
✅ Refund processing support  
✅ RPC wallet validation via Alchemy  
✅ Swagger documentation  
✅ TypeScript + NestJS architecture

---

## 🎯 POC Specifics

- **Hardcoded Cost**: $0.50 per session
- **Database**: SQLite (switch to PostgreSQL for production)
- **Payment Method**: Stripe Checkout (card for POC)
- **Link Expiry**: 30 minutes
- **Coinbase Code**: Present but not used (as requested)

---

## 📚 Documentation

- Full API Documentation: `API_DOCUMENTATION.md`
- Swagger UI: http://localhost:3000/api/docs (when running)

---

## 🧪 Testing

1. Start the server: `npm run start:dev`
2. Use Swagger UI or curl to test endpoints
3. For webhooks, use Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/v1/stripe/webhook
   ```

---

**Status**: ✅ All APIs Implemented and Tested
