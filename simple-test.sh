#!/bin/bash

# Simple test to check server status
echo "🔍 Checking if server is running..."

# Test basic connectivity
if curl -s --connect-timeout 5 http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Server is running on localhost:3000"
    
    echo ""
    echo "🧪 Testing enhanced session start API..."
    
    # Test session start with new parameters
    response=$(curl -s -X POST "http://localhost:3000/api/v1/session/start" \
      -H "Content-Type: application/json" \
      -d '{
        "userId": "test-user-123",
        "chargerId": "CHARGER-001", 
        "walletAddress": "0x742d35Cc6634C0532925a3b8D95B0E8b19a6bE6c",
        "chain": "ETHEREUM",
        "expectedMaxCost": 10.0,
        "metadata": {
          "location": "Test Station",
          "testRun": true
        }
      }')
    
    echo "Response:"
    echo "$response" | jq . 2>/dev/null || echo "$response"
    
    # Extract session ID if successful
    sessionId=$(echo "$response" | jq -r '.sessionId // empty' 2>/dev/null)
    
    if [ ! -z "$sessionId" ] && [ "$sessionId" != "null" ]; then
        echo ""
        echo "✅ Session created successfully: $sessionId"
        
        echo ""
        echo "🧪 Testing session stop..."
        
        stop_response=$(curl -s -X POST "http://localhost:3000/api/v1/session/stop" \
          -H "Content-Type: application/json" \
          -d "{
            \"userId\": \"test-user-123\",
            \"sessionId\": \"$sessionId\",
            \"finalCost\": 7.50
          }")
        
        echo "Stop Response:"
        echo "$stop_response" | jq . 2>/dev/null || echo "$stop_response"
        
        echo ""
        echo "🧪 Testing user balance checks endpoint..."
        
        curl -s -X GET "http://localhost:3000/api/v1/user/test-user-123/balance-checks" | jq . 2>/dev/null || echo "Balance checks endpoint test"
        
        echo ""
        echo "🧪 Testing user sessions endpoint..."
        
        curl -s -X GET "http://localhost:3000/api/v1/user/test-user-123/sessions" | jq . 2>/dev/null || echo "User sessions endpoint test"
        
        echo ""
        echo "✅ All tests completed!"
    else
        echo "❌ Session creation failed"
    fi
    
else
    echo "❌ Server is not running on localhost:3000"
    echo "Please start the server with: npm run start:dev"
fi