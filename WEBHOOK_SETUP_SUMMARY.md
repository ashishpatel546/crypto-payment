# 🎯 Stripe Webhook Setup - Complete Guide Summary

## 🚀 Quick Start (Choose Your Method)

### Method 1: Automated Setup (Recommended)

```bash
# Run the automated setup script
./setup-ngrok-webhook.sh

# This script will:
# ✅ Check if ngrok is installed
# ✅ Start ngrok automatically
# ✅ Provide exact URLs to copy into Stripe
# ✅ Keep tunnel running for testing
```

### Method 2: Manual Setup

```bash
# Terminal 1: Start your app
npm run start:dev

# Terminal 2: Start ngrok
ngrok http 3000

# Copy the https URL for webhook setup
```

### Method 3: Production Setup

```bash
# Use your production domain directly
https://yourdomain.com/api/v1/stripe/webhook
```

## 📋 Stripe Dashboard Setup Checklist

### 1. Access Webhooks

- [ ] Go to [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
- [ ] Ensure you're in **Test Mode** for development
- [ ] Click **"Add endpoint"**

### 2. Configure Endpoint

- [ ] **Endpoint URL**: `https://your-ngrok-url.ngrok.io/api/v1/stripe/webhook`
- [ ] **Description**: `EV Charging Payment Webhook Handler` (optional)

### 3. Select Events (CRITICAL - Must select all 5)

- [ ] `checkout.session.completed` - Payment successful
- [ ] `checkout.session.expired` - Payment session expired
- [ ] `payment_intent.succeeded` - Payment processing completed
- [ ] `payment_intent.payment_failed` - Payment failed
- [ ] `charge.refunded` - Refund processed

### 4. Save and Configure

- [ ] Click **"Add endpoint"** to save
- [ ] Click on your webhook endpoint
- [ ] Click **"Reveal"** next to "Signing secret"
- [ ] Copy the secret (starts with `whsec_`)
- [ ] Add to `.env`: `STRIPE_WEBHOOK_SECRET=whsec_your_secret_here`

## 🧪 Testing Your Setup

### Option 1: Automated Test

```bash
./test-webhook-integration.sh
```

### Option 2: Stripe Dashboard Test

1. Go to your webhook endpoint in Stripe dashboard
2. Click "Send test webhook"
3. Select "checkout.session.completed"
4. Click "Send test webhook"
5. Check your app logs

### Option 3: Stripe CLI Test

```bash
stripe listen --forward-to localhost:3000/api/v1/stripe/webhook
stripe trigger checkout.session.completed
```

## ✅ Success Indicators

You'll know it's working when you see:

### In Stripe Dashboard:

- ✅ Green checkmarks on webhook deliveries
- ✅ 200 HTTP response codes
- ✅ No delivery failures

### In Your Application Logs:

```
[Nest] LOG [StripeWebhookController] Received Stripe webhook
[Nest] LOG [StripeWebhookController] Processing event type: checkout.session.completed
[Nest] LOG [StripeWebhookController] Payment status updated to PAID for session: cs_test_...
```

### In Your Database:

Payment status automatically updates from `PENDING` to `PAID`, `EXPIRED`, etc.

## 🎛️ Your Webhook Endpoints

Once set up, your application will automatically handle:

| Event                           | What Happens                | Database Update    |
| ------------------------------- | --------------------------- | ------------------ |
| `checkout.session.completed`    | Payment successful          | Status → `PAID`    |
| `checkout.session.expired`      | Payment timed out           | Status → `EXPIRED` |
| `payment_intent.succeeded`      | Payment processing complete | Logged             |
| `payment_intent.payment_failed` | Payment failed              | Logged             |
| `charge.refunded`               | Refund processed            | Logged             |

## 🔗 Important URLs

Your webhook system exposes these endpoints:

- **Webhook Receiver**: `/api/v1/stripe/webhook`
- **Success Page**: `/api/v1/stripe/success?session_id={CHECKOUT_SESSION_ID}`
- **Cancel Page**: `/api/v1/stripe/cancel?session_id={CHECKOUT_SESSION_ID}`

## 📞 Support & Troubleshooting

### Common Issues:

1. **Webhook not receiving events** → Check ngrok is running and URL is correct
2. **Signature verification failed** → Verify webhook secret is correct
3. **Database not updating** → Check app logs for errors

### Debug Commands:

```bash
# Test webhook accessibility
curl -X POST https://your-ngrok-url.ngrok.io/api/v1/stripe/webhook

# Check ngrok status
curl http://localhost:4040/api/tunnels

# View Stripe events
stripe events list --limit 5
```

### Get Help:

- Run `./test-webhook-integration.sh` for diagnostics
- Check `STRIPE_PORTAL_WEBHOOK_SETUP.md` for detailed instructions
- Review `WEBHOOK_IMPLEMENTATION_SUMMARY.md` for technical details

---

## 🎉 You're All Set!

Once you complete the Stripe dashboard setup with the URLs from your chosen method above, your webhook integration will be fully functional. All payment events will automatically update your database in real-time!

**Next Steps After Setup:**

1. Test with a real payment flow
2. Monitor webhook deliveries in Stripe dashboard
3. Verify database updates are happening
4. Move to production when ready (update URLs to your domain)
