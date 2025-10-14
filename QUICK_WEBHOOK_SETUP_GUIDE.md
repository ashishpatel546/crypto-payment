# 🎯 Quick Stripe Webhook Setup - Visual Guide

## 📸 Step-by-Step Screenshots Guide

### Step 1: Access Stripe Dashboard

```
1. Go to https://dashboard.stripe.com
2. Make sure you're in TEST MODE for development
3. Click "Developers" in left sidebar
4. Click "Webhooks"
```

### Step 2: Create Webhook Endpoint

```
1. Click "Add endpoint" button (blue button, top right)
2. In "Endpoint URL" field, enter:
   https://your-ngrok-url.ngrok.io/api/v1/stripe/webhook
3. Optional: Add description like "EV Charging Payment Handler"
```

### Step 3: Select Events (CRITICAL STEP)

```
1. Click "Select events" button
2. Search and select these 5 events:

   ✅ checkout.session.completed
   ✅ checkout.session.expired
   ✅ payment_intent.succeeded
   ✅ payment_intent.payment_failed
   ✅ charge.refunded

3. Click "Add events" button
```

### Step 4: Save and Get Secret

```
1. Click "Add endpoint" to save
2. Click on your newly created endpoint
3. Click "Reveal" next to "Signing secret"
4. Copy the secret (starts with whsec_)
5. Add to your .env file:
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

## 🚀 For Local Development (ngrok required)

### Terminal Commands:

```bash
# Terminal 1: Start your app
npm run start:dev

# Terminal 2: Start ngrok
ngrok http 3000

# Copy the https URL from ngrok output
# Example: https://abc123.ngrok.io
# Your webhook URL: https://abc123.ngrok.io/api/v1/stripe/webhook
```

## 🧪 Test Your Setup

### Option 1: Use Stripe Dashboard

```
1. Go to your webhook endpoint in dashboard
2. Click "Send test webhook"
3. Select "checkout.session.completed"
4. Click "Send test webhook"
5. Check your app logs for processing
```

### Option 2: Use Your Test Script

```bash
./test-webhook-integration.sh
```

### Option 3: Use Stripe CLI

```bash
# Install and login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/v1/stripe/webhook

# Trigger test event
stripe trigger checkout.session.completed
```

## ⚠️ Common Mistakes to Avoid

❌ **Wrong URL format**: Make sure to include `/api/v1/stripe/webhook`  
❌ **Missing events**: Must select all 5 events listed above  
❌ **HTTP instead of HTTPS**: Stripe requires HTTPS (use ngrok for local)  
❌ **Wrong secret**: Copy the signing secret, not the endpoint ID  
❌ **Test vs Live mode**: Make sure you're in the right mode

## ✅ Success Indicators

When everything is working correctly, you should see:

1. **In Stripe Dashboard**:
   - Green checkmarks on webhook deliveries
   - 200 response codes
   - No failed deliveries

2. **In Your App Logs**:

   ```
   [Nest] LOG [StripeWebhookController] Received Stripe webhook
   [Nest] LOG [StripeWebhookController] Processing event type: checkout.session.completed
   [Nest] LOG [StripeWebhookController] Payment status updated to PAID for session: cs_test_...
   ```

3. **In Your Database**:
   ```sql
   SELECT status FROM payment_links WHERE stripe_checkout_session_id = 'cs_test_...';
   -- Should show: PAID, EXPIRED, etc.
   ```

## 🔗 Quick Links

- **Stripe Webhooks Dashboard**: https://dashboard.stripe.com/webhooks
- **ngrok Download**: https://ngrok.com/download
- **Stripe CLI**: https://stripe.com/docs/stripe-cli
- **Test Your Endpoints**: http://localhost:3000/api/v1/stripe/success

## 🆘 Need Help?

Run this command to verify your setup:

```bash
./test-webhook-integration.sh
```

Your webhook endpoint should be accessible at:

- **Local**: http://localhost:3000/api/v1/stripe/webhook
- **ngrok**: https://your-ngrok-url.ngrok.io/api/v1/stripe/webhook
- **Production**: https://yourdomain.com/api/v1/stripe/webhook

---

**🎉 Once you see successful webhook deliveries in Stripe dashboard and payment status updates in your database, your integration is complete!**
