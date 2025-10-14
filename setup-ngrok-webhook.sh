#!/bin/bash

# 🚀 Easy Stripe Webhook Setup Script
# This script helps you set up ngrok and provides the exact webhook URL for Stripe

echo "🔧 Stripe Webhook Setup Helper"
echo "==============================="
echo

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}❌ ngrok is not installed${NC}"
    echo "Please install ngrok first:"
    echo "  npm install -g ngrok"
    echo "  # OR"
    echo "  brew install ngrok"
    echo "  # OR download from: https://ngrok.com/download"
    exit 1
fi

echo -e "${GREEN}✅ ngrok is installed${NC}"

# Configure ngrok with authtoken
echo -e "${BLUE}🔑 Configuring ngrok authentication...${NC}"
ngrok config add-authtoken 342uwlWGC870ceilIjB1wd1z0IC_JzcCSsAwpyKW7GfYCwA7

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ ngrok authentication configured${NC}"
else
    echo -e "${YELLOW}⚠️  ngrok auth configuration may have failed, but continuing...${NC}"
fi

# Check if NestJS app is running
if ! curl -s http://localhost:3000/health-check > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  NestJS app doesn't seem to be running on port 3000${NC}"
    echo "Please start your app first:"
    echo "  npm run start:dev"
    echo
    echo "Press any key when your app is running, or Ctrl+C to exit..."
    read -n 1
    echo
fi

# Check if ngrok is already running
echo -e "${BLUE}🔍 Checking if ngrok is already running...${NC}"
EXISTING_NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o 'https://[^"]*\.ngrok[^"]*\.dev')

if [ ! -z "$EXISTING_NGROK_URL" ]; then
    echo -e "${GREEN}✅ Found existing ngrok tunnel: $EXISTING_NGROK_URL${NC}"
    NGROK_URL="$EXISTING_NGROK_URL"
    NGROK_PID=$(ps aux | grep "ngrok http 3000" | grep -v grep | awk '{print $2}')
    echo -e "${GREEN}✅ Using existing ngrok process (PID: $NGROK_PID)${NC}"
else
    # Start ngrok in background
    echo -e "${BLUE}🚀 Starting new ngrok tunnel...${NC}"
    nohup ngrok http 3000 > ngrok.log 2>&1 &
    NGROK_PID=$!

    # Wait for ngrok to start
    echo "Waiting for ngrok to initialize..."
    sleep 5

    # Get ngrok URL with retries
    for i in {1..10}; do
        NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o 'https://[^"]*\.ngrok[^"]*\.dev')
        if [ ! -z "$NGROK_URL" ]; then
            break
        fi
        echo "Attempt $i/10: Waiting for ngrok to start..."
        sleep 2
    done

    if [ -z "$NGROK_URL" ]; then
        echo -e "${RED}❌ Failed to get ngrok URL after 10 attempts${NC}"
        echo "Checking ngrok logs:"
        if [ -f "ngrok.log" ]; then
            tail -5 ngrok.log
        fi
        echo "Make sure ngrok started correctly and port 3000 is available"
        kill $NGROK_PID 2>/dev/null
        exit 1
    fi

    echo -e "${GREEN}✅ New ngrok tunnel created successfully!${NC}"
fi
echo

# Display webhook URL
WEBHOOK_URL="${NGROK_URL}/api/v1/stripe/webhook"
SUCCESS_URL="${NGROK_URL}/api/v1/stripe/success?session_id={CHECKOUT_SESSION_ID}"
CANCEL_URL="${NGROK_URL}/api/v1/stripe/cancel?session_id={CHECKOUT_SESSION_ID}"

echo "🔗 COPY THESE URLS FOR STRIPE SETUP:"
echo "======================================"
echo
echo -e "${YELLOW}Webhook URL (for Stripe Dashboard):${NC}"
echo "$WEBHOOK_URL"
echo
echo -e "${YELLOW}Success URL (optional):${NC}"
echo "$SUCCESS_URL"
echo
echo -e "${YELLOW}Cancel URL (optional):${NC}"
echo "$CANCEL_URL"
echo

echo "📋 NEXT STEPS:"
echo "=============="
echo "1. Go to: https://dashboard.stripe.com/webhooks"
echo "2. Click 'Add endpoint'"
echo "3. Paste webhook URL: $WEBHOOK_URL"
echo "4. Select these events:"
echo "   ✅ checkout.session.completed"
echo "   ✅ checkout.session.expired"
echo "   ✅ payment_intent.succeeded"
echo "   ✅ payment_intent.payment_failed"
echo "   ✅ charge.refunded"
echo "5. Save and copy the signing secret"
echo "6. Add to .env: STRIPE_WEBHOOK_SECRET=whsec_your_secret"
echo

echo "🧪 TEST YOUR SETUP:"
echo "==================="
echo "Test endpoints:"
echo "• Success page: ${NGROK_URL}/api/v1/stripe/success?session_id=test123"
echo "• Cancel page:  ${NGROK_URL}/api/v1/stripe/cancel?session_id=test123"
echo
echo "Or run: ./test-webhook-integration.sh"
echo

echo "⚠️  IMPORTANT:"
echo "=============="
echo "• Keep this terminal open to maintain ngrok tunnel"
echo "• ngrok URL changes each restart (unless you have paid plan)"
echo "• For production, use your actual domain instead of ngrok"
echo "• Current ngrok process PID: $NGROK_PID"
echo

echo -e "${GREEN}🎉 Setup helper complete! Your webhook endpoint is ready.${NC}"
echo
echo "📊 Monitor your webhook:"
echo "• ngrok dashboard: http://localhost:4040"
echo "• View tunnel activity and requests in real-time"
echo
echo "🛑 To stop ngrok later:"
echo "• Press Ctrl+C in this terminal"
echo "• Or run: kill $NGROK_PID"
echo
echo "Press Ctrl+C to stop ngrok when you're done testing..."

# Keep script running to maintain ngrok (only if we started it)
if [ "$EXISTING_NGROK_URL" = "" ]; then
    trap "echo; echo 'Stopping ngrok...'; kill $NGROK_PID 2>/dev/null; exit 0" INT
    wait $NGROK_PID
else
    echo
    echo -e "${BLUE}ℹ️  Using existing ngrok tunnel. This script will not stop ngrok when exited.${NC}"
    echo "To stop ngrok, run: kill $NGROK_PID"
    echo
fi