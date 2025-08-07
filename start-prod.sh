#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting SMS Bot in Production Mode${NC}"
echo "======================================"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create a .env file with your configuration."
    exit 1
fi

# Check if built files exist
if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
    echo -e "${RED}❌ Built files not found!${NC}"
    echo -e "${YELLOW}💡 Run './build.sh' first to build the project${NC}"
    exit 1
fi

# Check if TELEGRAM_BOT_TOKEN is set
if ! grep -q "TELEGRAM_BOT_TOKEN=" .env || grep -q "TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here" .env; then
    echo -e "${YELLOW}⚠️  Warning: Please update TELEGRAM_BOT_TOKEN in .env file${NC}"
    echo "Get your token from @BotFather on Telegram"
fi

# Check if MySQL is running
if ! pgrep -x "mysqld" > /dev/null; then
    echo -e "${YELLOW}⚠️  MySQL doesn't seem to be running. Please start MySQL first.${NC}"
fi

# Set production environment
export NODE_ENV=production

echo -e "${GREEN}🚀 Starting bot in production mode...${NC}"
echo -e "${BLUE}📁 Running from: ./dist/index.js${NC}"
echo -e "${BLUE}🌍 Environment: production${NC}"

# Start the bot
npm start
