#!/bin/bash

# Test script to verify crypto payment integration
# This script tests if crypto payment links are properly generated

BASE_URL="http://localhost:3000"

echo "🚀 Testing Crypto Payment Integration"
echo "======================================"

# Test 1: Start a session
echo "📋 Step 1: Starting a charging session..."
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/session/start" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-crypto-001",
    "chargerId": "CRYPTO-CHARGER-001",
    "checkBalance": false
  }')

echo "Session Response: $SESSION_RESPONSE"

# Extract session ID
SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.sessionId')

if [ "$SESSION_ID" = "null" ] || [ -z "$SESSION_ID" ]; then
  echo "❌ Failed to create session"
  exit 1
fi

echo "✅ Session created: $SESSION_ID"

# Test 2: Stop session and create payment link
echo ""
echo "💳 Step 2: Stopping session and creating payment link..."
PAYMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/session/stop" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"finalCost\": 5.0
  }")

echo "Payment Response: $PAYMENT_RESPONSE"

# Extract payment URL
PAYMENT_URL=$(echo $PAYMENT_RESPONSE | jq -r '.paymentUrl')

if [ "$PAYMENT_URL" = "null" ] || [ -z "$PAYMENT_URL" ]; then
  echo "❌ Failed to create payment link"
  exit 1
fi

echo "✅ Payment link created: $PAYMENT_URL"

# Test 3: Get payment link details
echo ""
echo "🔍 Step 3: Retrieving payment link details..."
LINK_RESPONSE=$(curl -s -X GET "$BASE_URL/api/v1/payment/link/$SESSION_ID")

echo "Link Details: $LINK_RESPONSE"

echo ""
echo "🎉 Test completed!"
echo "Payment URL: $PAYMENT_URL"
echo ""
echo "💡 To test crypto payments:"
echo "1. Open the payment URL in your browser"
echo "2. You should see a 'Pay with crypto' option"
echo "3. Select crypto to test the integration"
echo ""
echo "📝 If you don't see crypto option, check:"
echo "- Stripe dashboard crypto payment method is enabled"
echo "- Your Stripe account has crypto payments capability"
echo "- Check application logs for any errors"