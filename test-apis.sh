#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"
SESSION_ID=""

echo "=========================================="
echo "Testing Crypto Payment POC APIs"
echo "=========================================="
echo ""

# Test 1: Precheck
echo -e "${YELLOW}Test 1: Precheck Wallet Balance${NC}"
echo "POST /api/v1/payment/precheck"
curl -X POST $BASE_URL/api/v1/payment/precheck \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "chain": "ethereum",
    "amount_usd": 0.5
  }' | jq .
echo -e "\n${GREEN}✓ Test 1 Complete${NC}\n"
sleep 2

# Test 2: Start Session
echo -e "${YELLOW}Test 2: Start Charging Session${NC}"
echo "POST /api/v1/session/start"
RESPONSE=$(curl -s -X POST $BASE_URL/api/v1/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "chargerId": "CHARGER-001",
    "metadata": {
      "location": "Station A, Bay 3",
      "connectorType": "CCS",
      "maxPower": "150kW"
    }
  }')
echo $RESPONSE | jq .
SESSION_ID=$(echo $RESPONSE | jq -r '.sessionId')
echo -e "Session ID: ${GREEN}$SESSION_ID${NC}"
echo -e "\n${GREEN}✓ Test 2 Complete${NC}\n"
sleep 2

# Test 3: Stop Session
echo -e "${YELLOW}Test 3: Stop Session and Create Payment Link${NC}"
echo "POST /api/v1/session/stop"
curl -X POST $BASE_URL/api/v1/session/stop \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\"
  }" | jq .
echo -e "\n${GREEN}✓ Test 3 Complete${NC}\n"
sleep 2

# Test 4: Get Payment Link
echo -e "${YELLOW}Test 4: Get Payment Link${NC}"
echo "GET /api/v1/payment/link/$SESSION_ID"
curl -s $BASE_URL/api/v1/payment/link/$SESSION_ID | jq .
echo -e "\n${GREEN}✓ Test 4 Complete${NC}\n"
sleep 2

# Test 5: Recreate Payment Link
echo -e "${YELLOW}Test 5: Recreate Payment Link${NC}"
echo "POST /api/v1/payment/recreate-link"
curl -X POST $BASE_URL/api/v1/payment/recreate-link \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\"
  }" | jq .
echo -e "\n${GREEN}✓ Test 5 Complete${NC}\n"
sleep 2

# Test 6: Webhook (mock call)
echo -e "${YELLOW}Test 6: Stripe Webhook (Mock)${NC}"
echo "POST /api/v1/stripe/webhook"
echo -e "${YELLOW}Note: This requires actual Stripe webhook signature for production${NC}"
curl -X POST $BASE_URL/api/v1/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: mock_signature" \
  -d '{
    "type": "checkout.session.completed"
  }' | jq .
echo -e "\n${GREEN}✓ Test 6 Complete${NC}\n"
sleep 2

# Test 7: Refund (will fail if not paid)
echo -e "${YELLOW}Test 7: Refund Payment${NC}"
echo "POST /api/v1/payment/refund"
echo -e "${YELLOW}Note: This will fail unless the payment was actually completed${NC}"
curl -X POST $BASE_URL/api/v1/payment/refund \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\"
  }" | jq .
echo -e "\n${GREEN}✓ Test 7 Complete${NC}\n"

echo "=========================================="
echo -e "${GREEN}All Tests Completed!${NC}"
echo "=========================================="
echo ""
echo "Tested Session ID: $SESSION_ID"
echo "View Swagger UI: http://localhost:3000/api/docs"
