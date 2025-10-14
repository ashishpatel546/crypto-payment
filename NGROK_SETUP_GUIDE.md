# 🔧 ngrok Authentication & Setup Guide

## 🚀 Quick Setup with Your Token

### Method 1: Automated (Recommended)

```bash
# Run the updated script that includes your token
./setup-ngrok-webhook.sh
```

### Method 2: Manual Configuration

```bash
# Step 1: Authenticate ngrok with your token
ngrok config add-authtoken 342uwlWGC870ceilIjB1wd1z0IC_JzcCSsAwpyKW7GfYCwA7

# Step 2: Start your NestJS app
npm run start:dev

# Step 3: Start ngrok in a new terminal
ngrok http 3000

# Step 4: Copy the HTTPS URL from ngrok output
```

## 🔍 Troubleshooting Common Issues

### Issue 1: "ngrok: command not found"

```bash
# Install ngrok
npm install -g ngrok
# OR
brew install ngrok
# OR download from: https://ngrok.com/download
```

### Issue 2: "ngrok tunnel failed"

```bash
# Make sure your app is running first
npm run start:dev

# Then start ngrok in another terminal
ngrok http 3000
```

### Issue 3: "authentication failed"

```bash
# Re-authenticate with your token
ngrok config add-authtoken 342uwlWGC870ceilIjB1wd1z0IC_JzcCSsAwpyKW7GfYCwA7

# Verify authentication
ngrok config check
```

### Issue 4: "tunnel expired" or "connection refused"

```bash
# Kill any existing ngrok processes
pkill ngrok

# Wait a moment, then restart
ngrok http 3000
```

## 📋 Complete Setup Checklist

### ✅ Pre-requisites

- [ ] ngrok installed
- [ ] ngrok authenticated with your token
- [ ] NestJS app running on port 3000

### ✅ ngrok Setup

- [ ] Run `ngrok http 3000`
- [ ] Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
- [ ] Keep ngrok terminal open

### ✅ Stripe Dashboard Setup

- [ ] Go to https://dashboard.stripe.com/webhooks
- [ ] Click "Add endpoint"
- [ ] Paste: `https://your-ngrok-url.ngrok.io/api/v1/stripe/webhook`
- [ ] Select these events:
  - [ ] `checkout.session.completed`
  - [ ] `checkout.session.expired`
  - [ ] `payment_intent.succeeded`
  - [ ] `payment_intent.payment_failed`
  - [ ] `charge.refunded`
- [ ] Save and copy the signing secret
- [ ] Add to .env: `STRIPE_WEBHOOK_SECRET=whsec_your_secret`

### ✅ Testing

- [ ] Run `./test-webhook-integration.sh`
- [ ] Test webhook delivery in Stripe dashboard
- [ ] Verify payment status updates in database

## 🚀 Quick Commands

```bash
# Full setup sequence
npm run start:dev                    # Terminal 1
ngrok http 3000                      # Terminal 2
./test-webhook-integration.sh        # Terminal 3 (for testing)
```

## 🎯 Expected Output

When ngrok starts successfully, you should see:

```
ngrok

Session Status                online
Account                      your-account (Plan: Free)
Version                      3.x.x
Region                       United States (us)
Latency                      -
Web Interface                http://127.0.0.1:4040
Forwarding                   https://abc123.ngrok.io -> http://localhost:3000

Connections                  ttl     opn     rt1     rt5     p50     p90
                             0       0       0.00    0.00    0.00    0.00
```

Your webhook URL will be: `https://abc123.ngrok.io/api/v1/stripe/webhook`

## ⚠️ Important Notes

1. **Keep ngrok running**: The tunnel only works while ngrok is active
2. **URL changes**: Free ngrok URLs change each restart
3. **Update Stripe**: If ngrok URL changes, update it in Stripe dashboard
4. **Production**: Use your real domain for production, not ngrok

## 🆘 Need Help?

If you're still having issues:

1. **Check ngrok status**:

   ```bash
   curl http://localhost:4040/api/tunnels
   ```

2. **Verify app is running**:

   ```bash
   curl http://localhost:3000/health-check
   ```

3. **Test webhook endpoint**:

   ```bash
   curl https://your-ngrok-url.ngrok.io/api/v1/stripe/webhook
   ```

4. **Check ngrok logs**:
   - Open http://localhost:4040 in your browser
   - View tunnel activity and requests

---

**🎉 Once ngrok is running with your token, use the HTTPS URL in Stripe dashboard and you're ready to receive webhooks!**
