#!/bin/bash

# Crypto Payment Diagnostic Script
# This script helps diagnose common issues with crypto payments in Stripe

echo "🔍 Crypto Payment Integration Diagnostic"
echo "========================================"

# Check if the server is running
echo "1. Checking if server is running..."
if curl -s "http://localhost:3000" > /dev/null; then
    echo "✅ Server is running on port 3000"
else
    echo "❌ Server is not responding on port 3000"
    echo "   Please make sure to run: npm run start:dev"
    exit 1
fi

# Test payment link creation with different configurations
echo ""
echo "2. Testing payment link creation..."

# Test crypto-only payment
echo "   Testing crypto-only payment link..."
CRYPTO_ONLY_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/session/start" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-crypto-only",
    "chargerId": "TEST-CHARGER",
    "checkBalance": false
  }')

CRYPTO_SESSION_ID=$(echo $CRYPTO_ONLY_RESPONSE | jq -r '.sessionId')

if [ "$CRYPTO_SESSION_ID" != "null" ] && [ -n "$CRYPTO_SESSION_ID" ]; then
    STOP_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/session/stop" \
      -H "Content-Type: application/json" \
      -d "{
        \"sessionId\": \"$CRYPTO_SESSION_ID\",
        \"finalCost\": 1.0
      }")
    
    PAYMENT_URL=$(echo $STOP_RESPONSE | jq -r '.paymentUrl')
    
    if [ "$PAYMENT_URL" != "null" ] && [ -n "$PAYMENT_URL" ]; then
        echo "✅ Payment link created successfully"
        echo "   Payment URL: $PAYMENT_URL"
    else
        echo "❌ Failed to create payment link"
        echo "   Response: $STOP_RESPONSE"
    fi
else
    echo "❌ Failed to create session"
    echo "   Response: $CRYPTO_ONLY_RESPONSE"
fi

echo ""
echo "3. Environment Configuration Check..."

# Check for required environment variables
echo "   Checking STRIPE_SECRET_KEY..."
if [ -n "$STRIPE_SECRET_KEY" ]; then
    echo "✅ STRIPE_SECRET_KEY is set"
else
    echo "⚠️  STRIPE_SECRET_KEY environment variable not set in this shell"
    echo "   (It might be set in the application's .env file)"
fi

echo ""
echo "4. Common Issues and Solutions:"
echo "   ⚠️  If crypto option doesn't appear in Stripe checkout:"
echo ""
echo "   📋 Checklist:"
echo "   □ Crypto payment method is enabled in Stripe Dashboard"
echo "   □ Your Stripe account has crypto payments capability"
echo "   □ You're using a US-based Stripe account"
echo "   □ Payment amount is in USD currency"
echo ""
echo "   🔧 Troubleshooting steps:"
echo "   1. Go to Stripe Dashboard > Settings > Payment methods"
echo "   2. Check if 'Crypto' is listed and enabled"
echo "   3. If not available, contact Stripe support to request access"
echo "   4. Crypto payments are currently limited to US businesses"
echo ""
echo "   💡 Code changes made:"
echo "   - Updated payment_method_types to include 'crypto'"
echo "   - Set currency to 'usd' (required for crypto)"
echo "   - Added both 'crypto' and 'card' payment methods for better UX"
echo ""

# Check application logs for errors
echo "5. Checking for recent application errors..."
echo "   (You can manually check the terminal where you ran 'npm run start:dev')"
echo ""

echo "🎯 Next Steps:"
echo "1. Open the payment URL in your browser"
echo "2. Look for 'Pay with crypto' option alongside card payment"
echo "3. If option is missing, verify Stripe account crypto capability"
echo "4. Test with a small amount ($1-5) first"
echo ""
echo "Payment URL from test: $PAYMENT_URL"