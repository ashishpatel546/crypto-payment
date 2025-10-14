#!/bin/bash

# Stripe Webhook Integration Test Script
# This script demonstrates the webhook integration and tests the endpoints

echo "🔧 Stripe Webhook Integration Test"
echo "=================================="
echo

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base URL for API
BASE_URL="http://localhost:3000"

echo -e "${BLUE}Testing Success and Cancel URLs${NC}"
echo "----------------------------------------"

# Test success endpoint
echo -n "Testing success page... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/stripe/success?session_id=cs_test_123")
if [ "$RESPONSE" -eq "200" ]; then
    echo -e "${GREEN}✅ Success page working${NC}"
else
    echo -e "${RED}❌ Success page failed (HTTP $RESPONSE)${NC}"
fi

# Test cancel endpoint  
echo -n "Testing cancel page... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/stripe/cancel?session_id=cs_test_123")
if [ "$RESPONSE" -eq "200" ]; then
    echo -e "${GREEN}✅ Cancel page working${NC}"
else
    echo -e "${RED}❌ Cancel page failed (HTTP $RESPONSE)${NC}"
fi

echo
echo -e "${BLUE}Testing Webhook Endpoint${NC}"
echo "----------------------------------------"

# Test webhook endpoint accessibility
echo -n "Testing webhook endpoint... "
RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/stripe/webhook" \
    -H "Content-Type: application/json" \
    -H "stripe-signature: test_signature" \
    -d '{"test": "webhook"}' \
    2>/dev/null | grep -q "Missing raw body")

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Webhook endpoint accessible (correctly requires raw body)${NC}"
else
    echo -e "${RED}❌ Webhook endpoint not responding correctly${NC}"
fi

echo
echo -e "${BLUE}API Endpoints Summary${NC}"
echo "----------------------------------------"
echo -e "${YELLOW}Success URL:${NC} $BASE_URL/api/v1/stripe/success?session_id={CHECKOUT_SESSION_ID}"
echo -e "${YELLOW}Cancel URL:${NC}  $BASE_URL/api/v1/stripe/cancel?session_id={CHECKOUT_SESSION_ID}"
echo -e "${YELLOW}Webhook URL:${NC} $BASE_URL/api/v1/stripe/webhook"

echo
echo -e "${BLUE}Next Steps for Production${NC}"
echo "----------------------------------------"
echo "1. Set up ngrok for local webhook testing:"
echo "   ngrok http 3000"
echo
echo "2. Configure Stripe webhook endpoint:"
echo "   https://your-ngrok-url.ngrok.io/api/v1/stripe/webhook"
echo
echo "3. Set environment variables:"
echo "   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret"
echo "   STRIPE_SUCCESS_URL=https://yourdomain.com/api/v1/stripe/success?session_id={CHECKOUT_SESSION_ID}"
echo "   STRIPE_CANCEL_URL=https://yourdomain.com/api/v1/stripe/cancel?session_id={CHECKOUT_SESSION_ID}"
echo
echo "4. Subscribe to these Stripe events:"
echo "   - checkout.session.completed"
echo "   - checkout.session.expired"
echo "   - payment_intent.succeeded"
echo "   - payment_intent.payment_failed"
echo "   - charge.refunded"
echo
echo -e "${GREEN}✅ Webhook integration setup complete!${NC}"
echo
echo "📚 For detailed setup instructions, see: STRIPE_WEBHOOK_INTEGRATION.md"