# Crypto Payment POC API Documentation

This is a NestJS-based POC for crypto payment processing using Stripe. The application manages EV charging sessions and handles payment processing through Stripe's checkout system.

## Database

The application uses **SQLite** for storing charging sessions and payment links. The database file `crypto_payments.db` is created automatically in the project root.

### Entities

1. **ChargingSession**: Stores charging session information
   - id (UUID)
   - status (IN_PROGRESS, COMPLETED, CANCELLED)
   - finalCost (decimal)
   - metadata (JSON string)
   - createdAt, updatedAt

2. **PaymentLink**: Stores Stripe payment links associated with sessions
   - id (UUID)
   - sessionId (FK to ChargingSession)
   - stripeCheckoutSessionId (unique)
   - paymentUrl
   - amount (decimal)
   - status (PENDING, PAID, FAILED, EXPIRED, REFUNDED)
   - expiresAt (datetime)
   - stripePaymentIntentId
   - metadata (JSON string)
   - createdAt, updatedAt

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_SUCCESS_URL=http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:3000/cancel

# RPC Endpoints (for wallet validation)
RPC_ETHEREUM=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
RPC_POLYGON=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Server Configuration
PORT=3000
```

## API Endpoints

### 1. Precheck Wallet Balance

**Endpoint**: `POST /api/v1/payment/precheck`

**Description**: Validates wallet balances using RPC calls to ensure the user has sufficient USDC and native tokens for gas fees.

**Request Body**:

```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "chain": "ethereum",
  "amount_usd": 0.5,
  "user_id": "user_123"
}
```

**Response**:

```json
{
  "canPay": true,
  "usdcBalance": "100.50",
  "nativeBalance": "0.5",
  "estimatedGas": "0.002",
  "requiredUsdc": "0.5"
}
```

---

### 2. Start Charging Session

**Endpoint**: `POST /api/v1/session/start`

**Description**: Creates a new charging session with IN_PROGRESS status. Returns session ID for tracking.

**Request Body**: None

**Response**:

```json
{
  "success": true,
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Charging session started successfully"
}
```

---

### 3. Stop Charging Session

**Endpoint**: `POST /api/v1/session/stop`

**Description**: Finalizes the charging session with a hardcoded cost of $0.50 (POC), creates a Stripe payment link, and stores it in the database.

**Request Body**:

```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Response**:

```json
{
  "success": true,
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "finalCost": 0.5,
  "paymentUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "amount": 0.5
}
```

---

### 4. Get Payment Link

**Endpoint**: `GET /api/v1/payment/link/:sessionId`

**Description**: Retrieves the payment link associated with a charging session ID.

**Parameters**:

- `sessionId` (path parameter): The charging session ID

**Response**:

```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "paymentUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "amount": 0.5,
  "status": "PENDING",
  "expiresAt": "2025-10-14T12:00:00.000Z",
  "isExpired": false
}
```

---

### 5. Stripe Webhook

**Endpoint**: `POST /api/v1/stripe/webhook`

**Description**: Receives and processes webhook events from Stripe. Verifies the webhook signature and updates payment status accordingly.

**Headers**:

- `stripe-signature`: Stripe webhook signature

**Request Body**: Stripe event payload (raw body required for signature verification)

**Handled Events**:

- `checkout.session.completed`: Payment completed successfully
- `checkout.session.expired`: Checkout session expired
- `payment_intent.succeeded`: Payment intent succeeded
- `payment_intent.payment_failed`: Payment failed
- `charge.refunded`: Charge refunded

**Response**:

```json
{
  "received": true
}
```

---

### 6. Recreate Payment Link

**Endpoint**: `POST /api/v1/payment/recreate-link`

**Description**: Creates a new payment link for a session. Useful when the previous link has expired or needs to be regenerated.

**Request Body**:

```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Response**:

```json
{
  "success": true,
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "paymentUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "amount": 0.5,
  "expiresAt": "2025-10-14T12:00:00.000Z"
}
```

---

### 7. Refund Payment

**Endpoint**: `POST /api/v1/payment/refund`

**Description**: Processes a refund for a paid charging session through Stripe. (Admin endpoint)

**Request Body**:

```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Response**:

```json
{
  "success": true,
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "refundId": "re_1234567890",
  "amount": 0.5,
  "message": "Refund processed successfully"
}
```

---

## Payment Flow

1. **Precheck** (Optional): Validate user's wallet balance before starting session

   ```
   POST /api/v1/payment/precheck
   ```

2. **Start Session**: Create a new charging session

   ```
   POST /api/v1/session/start
   → Returns sessionId
   ```

3. **Stop Session**: Finalize the session and create payment link

   ```
   POST /api/v1/session/stop
   → Returns payment URL
   ```

4. **Customer Payment**: Customer completes payment through Stripe hosted checkout

5. **Webhook**: Stripe sends webhook event to update payment status

   ```
   POST /api/v1/stripe/webhook
   → Automatically updates payment status in database
   ```

6. **Get Payment Link** (Optional): Retrieve payment link for a session

   ```
   GET /api/v1/payment/link/:sessionId
   ```

7. **Recreate Link** (If needed): Generate new link if expired

   ```
   POST /api/v1/payment/recreate-link
   ```

8. **Refund** (If needed): Process refund for completed payment
   ```
   POST /api/v1/payment/refund
   ```

---

## Running the Application

### Installation

```bash
npm install
```

### Development

```bash
npm run start:dev
```

The server will start on `http://localhost:3000`

### Swagger Documentation

Once the application is running, you can access the interactive API documentation at:

```
http://localhost:3000/api
```

---

## Setting Up Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-domain.com/api/v1/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the webhook signing secret and add it to `.env` as `STRIPE_WEBHOOK_SECRET`

### Testing Webhooks Locally

Use Stripe CLI to forward webhooks to your local development server:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/v1/stripe/webhook
```

The CLI will provide a webhook signing secret that you can use for testing.

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "statusCode": 404,
  "message": "Session 123 not found",
  "error": "Not Found"
}
```

Common status codes:

- `200`: Success
- `400`: Bad Request
- `404`: Not Found
- `500`: Internal Server Error

---

## Notes for POC

- **Hardcoded Cost**: The final charging cost is hardcoded to $0.50 for POC purposes
- **Payment Link Expiry**: Stripe checkout sessions expire after 30 minutes
- **Database**: Using SQLite for simplicity; switch to PostgreSQL/MySQL for production
- **Coinbase Code**: Coinbase integration code is present but not used in this POC
- **RPC Validation**: Wallet validation uses Alchemy RPC endpoints for Ethereum and Polygon chains

---

## Future Enhancements

1. **Dynamic Pricing**: Calculate actual charging costs based on time and energy consumed
2. **User Authentication**: Add JWT-based authentication for user endpoints
3. **Admin Dashboard**: Build admin interface for managing sessions and refunds
4. **Multiple Payment Methods**: Support actual Stripe crypto payments when available
5. **Webhook Events**: Add more sophisticated webhook event handling and retry logic
6. **Database Migrations**: Use TypeORM migrations instead of auto-sync
7. **Logging**: Implement structured logging with Winston or Pino
8. **Monitoring**: Add health checks and monitoring endpoints

---

## Support

For issues or questions, please contact the development team.
