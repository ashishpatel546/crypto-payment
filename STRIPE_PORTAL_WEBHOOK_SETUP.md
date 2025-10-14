# 🔗 Complete Stripe Webhook Setup Guide

This guide walks you through setting up webhooks in the Stripe portal to automatically handle payment events in your application.

## 📋 Prerequisites

- Stripe account (Test or Live mode)
- Your application running with webhook endpoint available
- For local development: ngrok or similar tunneling tool

## 🚀 Step 1: Prepare Your Webhook Endpoint

### For Local Development (using ngrok)

1. **Install ngrok** (if not already installed):

   ```bash
   # Using npm
   npm install -g ngrok

   # Using Homebrew (macOS)
   brew install ngrok

   # Using direct download
   # Visit: https://ngrok.com/download
   ```

2. **Start your NestJS application**:

   ```bash
   npm run start:dev
   ```

3. **Expose your local server**:

   ```bash
   # In a new terminal window
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** from ngrok output:

   ```
   Forwarding    https://abc123.ngrok.io -> http://localhost:3000
   ```

   Your webhook URL will be: `https://abc123.ngrok.io/api/v1/stripe/webhook`

### For Production

Use your production domain:

```
https://yourdomain.com/api/v1/stripe/webhook
```

## 🏗️ Step 2: Access Stripe Dashboard

1. **Login to Stripe Dashboard**:
   - Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
   - Choose your account (Test mode for development, Live mode for production)

2. **Navigate to Webhooks**:
   - In the left sidebar, click **"Developers"**
   - Click **"Webhooks"**

## ➕ Step 3: Create New Webhook Endpoint

1. **Click "Add endpoint"** button

2. **Configure Endpoint URL**:

   ```
   For local development:
   https://your-ngrok-url.ngrok.io/api/v1/stripe/webhook

   For production:
   https://yourdomain.com/api/v1/stripe/webhook
   ```

3. **Set Description** (optional):
   ```
   Blink Charging - EV Payment Webhook Handler
   ```

## 🎯 Step 4: Select Events to Send

**Click "Select events"** and choose these specific events:

### ✅ Essential Events (Required)

```
✅ checkout.session.completed
✅ checkout.session.expired
✅ payment_intent.succeeded
✅ payment_intent.payment_failed
✅ charge.refunded
```

### 📝 How to find these events:

1. **Search for events** in the search box
2. **Expand categories** to find specific events:
   - **Checkout** → `checkout.session.completed`, `checkout.session.expired`
   - **Payment Intents** → `payment_intent.succeeded`, `payment_intent.payment_failed`
   - **Charges** → `charge.refunded`

### 🔍 Event Descriptions:

- **`checkout.session.completed`**: Payment successful, update status to PAID
- **`checkout.session.expired`**: Payment session expired, update status to EXPIRED
- **`payment_intent.succeeded`**: Payment processing completed successfully
- **`payment_intent.payment_failed`**: Payment processing failed
- **`charge.refunded`**: Refund was processed

## ⚙️ Step 5: Configure Advanced Settings

1. **API Version**: Use latest stable version (should be auto-selected)

2. **Filter events** (if needed):
   - Leave empty to receive all selected events
   - Add filters if you want to limit to specific accounts/customers

3. **Click "Add endpoint"** to create the webhook

## 🔐 Step 6: Get Webhook Signing Secret

After creating the webhook:

1. **Click on your newly created webhook endpoint**

2. **Copy the Signing Secret**:
   - Look for **"Signing secret"**
   - Click **"Reveal"**
   - Copy the secret (starts with `whsec_`)

3. **Add to your environment variables**:

   ```bash
   # .env file
   STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...

   # Or export in terminal
   export STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
   ```

## 🧪 Step 7: Test Your Webhook

### Using Stripe Dashboard

1. **Go to your webhook endpoint details**
2. **Click "Send test webhook"**
3. **Select an event** (e.g., `checkout.session.completed`)
4. **Click "Send test webhook"**
5. **Check your application logs** for successful processing

### Using Stripe CLI (Advanced)

1. **Install Stripe CLI**:

   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Other platforms: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe**:

   ```bash
   stripe login
   ```

3. **Forward webhooks to local server**:

   ```bash
   stripe listen --forward-to localhost:3000/api/v1/stripe/webhook
   ```

4. **Trigger test events**:
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger checkout.session.expired
   stripe trigger payment_intent.succeeded
   ```

### Using Your Test Script

Run the included test script:

```bash
./test-webhook-integration.sh
```

## 📊 Step 8: Monitor Webhook Delivery

### In Stripe Dashboard:

1. **Go to your webhook endpoint**
2. **Check "Recent deliveries"**
3. **View delivery attempts, responses, and any failures**

### In Your Application:

1. **Check application logs** for webhook processing
2. **Verify database updates** after webhook events
3. **Monitor payment status changes**

## 🔧 Step 9: Environment Configuration

### Complete Environment Variables:

```bash
# .env file

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret_here

# Optional: Custom Success/Cancel URLs
STRIPE_SUCCESS_URL=https://yourdomain.com/api/v1/stripe/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=https://yourdomain.com/api/v1/stripe/cancel?session_id={CHECKOUT_SESSION_ID}

# Optional: Enable/disable card payments
STRIPE_ENABLE_CARD_PAYMENTS=true
```

## ✅ Step 10: Verify Integration

### Test Complete Payment Flow:

1. **Create a charging session**:

   ```bash
   curl -X POST http://localhost:3000/api/v1/session/stop \
     -H "Content-Type: application/json" \
     -d '{"sessionId": "test-session-123", "finalCost": 5.00}'
   ```

2. **Get payment link** and complete payment in Stripe

3. **Verify webhook received** in Stripe dashboard

4. **Check database** for payment status update:
   ```sql
   SELECT status, metadata FROM payment_links
   WHERE session_id = 'test-session-123';
   ```

## 🚨 Troubleshooting

### Common Issues:

#### 1. Webhook Not Receiving Events

- ✅ Verify URL is accessible from internet
- ✅ Check ngrok is running for local development
- ✅ Ensure endpoint returns 200 status code
- ✅ Check Stripe webhook logs for delivery attempts

#### 2. Signature Verification Failed

- ✅ Verify `STRIPE_WEBHOOK_SECRET` is correct
- ✅ Ensure raw body is being passed to webhook handler
- ✅ Check for any middleware modifying request body

#### 3. Database Not Updating

- ✅ Check application logs for errors
- ✅ Verify payment link exists in database
- ✅ Ensure database connection is active

#### 4. Events Not Being Sent

- ✅ Verify correct events are selected in Stripe dashboard
- ✅ Check if webhook endpoint is enabled
- ✅ Confirm you're testing in the correct mode (test vs live)

### Debug Commands:

```bash
# Test webhook endpoint accessibility
curl -X POST https://your-ngrok-url.ngrok.io/api/v1/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{"test": "webhook"}'

# Check webhook deliveries
stripe logs tail

# List recent webhook events
stripe events list --limit 10
```

## 🎯 Production Deployment

### Before Going Live:

1. **Switch to Live Mode** in Stripe dashboard
2. **Update webhook URL** to production domain
3. **Get new webhook secret** for live mode
4. **Update environment variables** with live credentials
5. **Test with real payment methods**
6. **Monitor webhook deliveries** closely

### Security Checklist:

- ✅ HTTPS enabled for webhook endpoint
- ✅ Webhook signature verification implemented
- ✅ Environment variables properly secured
- ✅ Database credentials encrypted
- ✅ Webhook endpoint rate limiting configured
- ✅ Error handling and logging in place

## 📈 Monitoring & Analytics

### Key Metrics to Track:

1. **Webhook Delivery Success Rate**
2. **Payment Status Update Accuracy**
3. **Response Time for Webhook Processing**
4. **Failed Webhook Deliveries**
5. **Database Update Success Rate**

### Stripe Dashboard Analytics:

- Monitor webhook endpoint health
- Track event delivery patterns
- Analyze failed deliveries
- Review response codes and timing

---

## 🎉 Success!

Your Stripe webhook integration is now complete and ready for production use. All payment events will automatically update your database, providing seamless synchronization between Stripe and your application.

### Quick Summary of What You've Set Up:

✅ **Webhook Endpoint**: Receives Stripe events automatically  
✅ **Event Handling**: Processes 5 key payment events  
✅ **Database Updates**: Automatic payment status synchronization  
✅ **Security**: Proper webhook signature verification  
✅ **Monitoring**: Complete logging and error handling  
✅ **Testing**: Comprehensive test suite available

For ongoing support, refer to:

- [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
- Your `WEBHOOK_IMPLEMENTATION_SUMMARY.md`
- Your `test-webhook-integration.sh` script
