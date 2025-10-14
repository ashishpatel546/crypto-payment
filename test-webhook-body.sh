#!/bin/bash

echo "Testing Stripe webhook endpoint with raw body..."

# Test payload that mimics a Stripe webhook
TEST_PAYLOAD='{"id":"evt_test_webhook","object":"event","api_version":"2025-09-30.clover","created":1234567890,"data":{"object":{"id":"cs_test_123","object":"checkout.session","amount_total":1000,"currency":"usd","customer_email":"test@example.com","payment_status":"paid"}},"livemode":false,"pending_webhooks":1,"request":{"id":"req_test"},"type":"checkout.session.completed"}'

# Create a test signature (this won't be valid, but we can test the body handling)
curl -X POST http://localhost:3000/api/v1/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=1234567890,v1=test_signature" \
  -d "$TEST_PAYLOAD" \
  -v

echo -e "\n\nNote: This test will fail signature verification (expected), but should show that raw body is now available."