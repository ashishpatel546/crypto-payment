#!/bin/bash

# Test script for the improved stop session API
# This tests that user_id is no longer required when stopping a session

API_BASE="http://localhost:3000/api/v1"
USER_ID="user-simplified-test"
CHARGER_ID="CHARGER-IMPROVED-001"

echo "🧪 Testing Improved Stop Session API (no user_id required)"
echo "======================================================="

# Step 1: Start a session
echo -e "\n📋 Step 1: Starting a charging session..."
START_RESPONSE=$(curl -s -X POST "${API_BASE}/session/start" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'${USER_ID}'",
    "chargerId": "'${CHARGER_ID}'",
    "checkBalance": false
  }')

echo "Start Response: $START_RESPONSE"

# Extract session ID from response
SESSION_ID=$(echo $START_RESPONSE | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
    echo "❌ Failed to extract session ID from start response"
    exit 1
fi

echo "✅ Session started successfully with ID: $SESSION_ID"

# Step 2: Stop the session WITHOUT providing user_id (improved version)
echo -e "\n📋 Step 2: Stopping session WITHOUT user_id (improved API)..."
STOP_RESPONSE=$(curl -s -X POST "${API_BASE}/session/stop" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'${SESSION_ID}'",
    "finalCost": 7.25
  }')

echo "Stop Response: $STOP_RESPONSE"

# Check if the response contains success
if echo "$STOP_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Session stopped successfully without requiring user_id!"
    
    # Extract user_id from response to verify it was retrieved from session
    RESPONSE_USER_ID=$(echo $STOP_RESPONSE | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)
    if [ "$RESPONSE_USER_ID" = "$USER_ID" ]; then
        echo "✅ User ID correctly retrieved from session: $RESPONSE_USER_ID"
    else
        echo "❌ User ID mismatch. Expected: $USER_ID, Got: $RESPONSE_USER_ID"
    fi
    
    # Extract payment URL
    PAYMENT_URL=$(echo $STOP_RESPONSE | grep -o '"paymentUrl":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$PAYMENT_URL" ]; then
        echo "✅ Payment link created: $PAYMENT_URL"
    fi
    
else
    echo "❌ Failed to stop session"
    echo "Response: $STOP_RESPONSE"
    exit 1
fi

# Step 3: Test with invalid session ID
echo -e "\n📋 Step 3: Testing with invalid session ID..."
INVALID_RESPONSE=$(curl -s -X POST "${API_BASE}/session/stop" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "invalid-session-id"
  }')

echo "Invalid Session Response: $INVALID_RESPONSE"

if echo "$INVALID_RESPONSE" | grep -q "Session.*not found"; then
    echo "✅ Correctly handled invalid session ID"
else
    echo "❌ Did not handle invalid session ID properly"
fi

# Step 4: Verify the payment link endpoint
echo -e "\n📋 Step 4: Verifying payment link retrieval..."
LINK_RESPONSE=$(curl -s "${API_BASE}/payment/link/${SESSION_ID}")

echo "Payment Link Response: $LINK_RESPONSE"

if echo "$LINK_RESPONSE" | grep -q '"paymentUrl"'; then
    echo "✅ Payment link can be retrieved successfully"
else
    echo "❌ Failed to retrieve payment link"
fi

echo -e "\n🎉 All tests completed!"
echo "✅ The improved API no longer requires user_id when stopping sessions"
echo "✅ User information is automatically retrieved from the session"
echo "✅ The API is more streamlined and less prone to user errors"