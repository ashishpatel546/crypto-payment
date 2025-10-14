#!/bin/bash

# 🔧 ngrok Management Script
# Easily start, stop, status, and get URLs for ngrok

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

case "$1" in
    "start")
        echo -e "${BLUE}🚀 Starting ngrok...${NC}"
        if ps aux | grep "ngrok http 3000" | grep -v grep > /dev/null; then
            echo -e "${YELLOW}⚠️  ngrok is already running${NC}"
            ./setup-ngrok-webhook.sh
            exit 0
        fi
        
        nohup ngrok http 3000 > ngrok.log 2>&1 &
        echo "Waiting for ngrok to start..."
        sleep 5
        
        URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o 'https://[^"]*\.ngrok[^"]*\.dev')
        if [ ! -z "$URL" ]; then
            echo -e "${GREEN}✅ ngrok started: $URL${NC}"
            echo "Webhook URL: $URL/api/v1/stripe/webhook"
        else
            echo -e "${RED}❌ Failed to start ngrok${NC}"
        fi
        ;;
        
    "stop")
        echo -e "${BLUE}🛑 Stopping ngrok...${NC}"
        pkill ngrok
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ ngrok stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  No ngrok process found${NC}"
        fi
        ;;
        
    "status")
        echo -e "${BLUE}📊 ngrok Status${NC}"
        if ps aux | grep "ngrok http 3000" | grep -v grep > /dev/null; then
            PID=$(ps aux | grep "ngrok http 3000" | grep -v grep | awk '{print $2}')
            URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o 'https://[^"]*\.ngrok[^"]*\.dev')
            echo -e "${GREEN}✅ Running (PID: $PID)${NC}"
            if [ ! -z "$URL" ]; then
                echo -e "${GREEN}🔗 URL: $URL${NC}"
                echo -e "${GREEN}🪝 Webhook: $URL/api/v1/stripe/webhook${NC}"
            fi
        else
            echo -e "${RED}❌ Not running${NC}"
        fi
        ;;
        
    "url")
        URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o 'https://[^"]*\.ngrok[^"]*\.dev')
        if [ ! -z "$URL" ]; then
            echo "$URL/api/v1/stripe/webhook"
        else
            echo -e "${RED}❌ ngrok not running or no URL available${NC}"
            exit 1
        fi
        ;;
        
    "restart")
        echo -e "${BLUE}🔄 Restarting ngrok...${NC}"
        $0 stop
        sleep 2
        $0 start
        ;;
        
    "logs")
        echo -e "${BLUE}📄 ngrok Logs${NC}"
        if [ -f "ngrok.log" ]; then
            tail -20 ngrok.log
        else
            echo -e "${YELLOW}⚠️  No log file found${NC}"
        fi
        ;;
        
    "dashboard")
        echo -e "${BLUE}📊 Opening ngrok dashboard...${NC}"
        if command -v open &> /dev/null; then
            open http://localhost:4040
        else
            echo "Dashboard available at: http://localhost:4040"
        fi
        ;;
        
    *)
        echo "🔧 ngrok Management Script"
        echo "=========================="
        echo
        echo "Usage: $0 {start|stop|status|url|restart|logs|dashboard}"
        echo
        echo "Commands:"
        echo "  start      - Start ngrok tunnel"
        echo "  stop       - Stop ngrok tunnel" 
        echo "  status     - Show ngrok status and URL"
        echo "  url        - Get webhook URL only"
        echo "  restart    - Restart ngrok tunnel"
        echo "  logs       - Show ngrok logs"
        echo "  dashboard  - Open ngrok dashboard"
        echo
        echo "Examples:"
        echo "  $0 start     # Start ngrok"
        echo "  $0 status    # Check if running"
        echo "  $0 url       # Get webhook URL"
        echo "  $0 stop      # Stop ngrok"
        ;;
esac