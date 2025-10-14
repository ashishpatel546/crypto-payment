# ✅ ngrok Setup Complete - Your Webhook URLs

## 🎉 Success! ngrok is running with your authentication token.

### 🔗 Your ngrok URLs:

**Base URL**: `https://unsymphoniously-ramiform-phil.ngrok-free.dev`

### 📋 URLs for Stripe Dashboard:

**Webhook URL** (Main - Copy this to Stripe):

```
https://unsymphoniously-ramiform-phil.ngrok-free.dev/api/v1/stripe/webhook
```

**Success URL** (Optional):

```
https://unsymphoniously-ramiform-phil.ngrok-free.dev/api/v1/stripe/success?session_id={CHECKOUT_SESSION_ID}
```

**Cancel URL** (Optional):

```
https://unsymphoniously-ramiform-phil.ngrok-free.dev/api/v1/stripe/cancel?session_id={CHECKOUT_SESSION_ID}
```

## 🏗️ Stripe Dashboard Setup Steps:

1. **Go to**: [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. **Click**: "Add endpoint"
3. **Paste Webhook URL**: `https://unsymphoniously-ramiform-phil.ngrok-free.dev/api/v1/stripe/webhook`
4. **Select these 5 events**:
   - ✅ `checkout.session.completed`
   - ✅ `checkout.session.expired`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.refunded`
5. **Save** and copy the **signing secret**
6. **Add to .env**: `STRIPE_WEBHOOK_SECRET=whsec_your_secret_here`

## 🧪 Test Your Setup:

### Quick Test:

```bash
# Test success page
curl "https://unsymphoniously-ramiform-phil.ngrok-free.dev/api/v1/stripe/success?session_id=test123"

# Test webhook endpoint
curl -X POST "https://unsymphoniously-ramiform-phil.ngrok-free.dev/api/v1/stripe/webhook"

# Run full test suite
./test-webhook-integration.sh
```

### View ngrok Dashboard:

Open http://localhost:4040 in your browser to see real-time webhook traffic.

## ⚠️ Important Notes:

1. **Keep ngrok running**: Don't close the terminal with ngrok
2. **ngrok process**: Running in background (PID: check with `ps aux | grep ngrok`)
3. **URL persistence**: This URL will work until you restart ngrok
4. **Free plan**: URL changes each restart (upgrade to paid for static URLs)

## 🔧 Management Commands:

```bash
# Check if ngrok is running
curl -s http://localhost:4040/api/tunnels

# Stop ngrok
pkill ngrok

# Restart ngrok
nohup ngrok http 3000 > ngrok.log 2>&1 &

# View ngrok logs
tail -f ngrok.log
```

## ✅ Status Check:

- ✅ ngrok authenticated with your token
- ✅ Tunnel active: `https://unsymphoniously-ramiform-phil.ngrok-free.dev`
- ✅ NestJS app running on port 3000
- ✅ Webhook endpoint ready: `/api/v1/stripe/webhook`
- ✅ Success/Cancel pages ready

## 🎯 Next Steps:

1. **Copy the webhook URL** above to Stripe dashboard
2. **Configure the 5 webhook events** in Stripe
3. **Get the signing secret** from Stripe
4. **Add to .env**: `STRIPE_WEBHOOK_SECRET=whsec_your_secret`
5. **Test webhook delivery** in Stripe dashboard

---

**🚀 Your webhook integration is ready! Go to Stripe dashboard and add the webhook URL above.**
