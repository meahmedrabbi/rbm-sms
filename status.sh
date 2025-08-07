#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}📊 SMS Bot Status & Management${NC}"
echo "================================"

# Check if bot is running
DEV_PROCESS=$(pgrep -f "ts-node-dev.*src/index.ts" 2>/dev/null)
PROD_PROCESS=$(pgrep -f "node.*dist/index.js" 2>/dev/null)

echo -e "${BLUE}🤖 Bot Status:${NC}"
if [ ! -z "$DEV_PROCESS" ]; then
    echo -e "  ${GREEN}✅ Development mode running${NC} (PID: $DEV_PROCESS)"
elif [ ! -z "$PROD_PROCESS" ]; then
    echo -e "  ${GREEN}✅ Production mode running${NC} (PID: $PROD_PROCESS)"
else
    echo -e "  ${RED}❌ Bot not running${NC}"
fi

echo ""
echo -e "${BLUE}📁 Build Status:${NC}"
if [ -d "dist" ] && [ -f "dist/index.js" ]; then
    BUILD_TIME=$(stat -c %y "dist/index.js" 2>/dev/null | cut -d'.' -f1)
    echo -e "  ${GREEN}✅ Production build available${NC} (Built: $BUILD_TIME)"
else
    echo -e "  ${YELLOW}⚠️  No production build found${NC}"
fi

echo ""
echo -e "${BLUE}🛠️  Available Commands:${NC}"
echo ""
echo -e "${CYAN}Development Mode:${NC}"
echo -e "  ${YELLOW}./restart-bot.sh${NC}     - Restart in development mode"
echo -e "  ${YELLOW}npm run dev${NC}          - Start development mode"
echo -e "  ${YELLOW}npm run restart:dev${NC}  - Restart development mode"

echo ""
echo -e "${CYAN}Production Mode:${NC}"
echo -e "  ${YELLOW}./build.sh${NC}           - Build for production"
echo -e "  ${YELLOW}./start-prod.sh${NC}      - Start production mode"
echo -e "  ${YELLOW}./restart-prod.sh${NC}    - Restart production mode"
echo -e "  ${YELLOW}npm run build:prod${NC}   - Build for production"
echo -e "  ${YELLOW}npm run start:prod${NC}   - Start production mode"
echo -e "  ${YELLOW}npm run restart:prod${NC} - Restart production mode"

echo ""
echo -e "${CYAN}Utility Commands:${NC}"
echo -e "  ${YELLOW}npm run build${NC}        - Basic TypeScript build"
echo -e "  ${YELLOW}npm start${NC}            - Start pre-built bot"
echo -e "  ${YELLOW}npm run lint${NC}         - Check code quality"
echo -e "  ${YELLOW}npm test${NC}             - Run tests"

echo ""
echo -e "${BLUE}💡 Quick Actions:${NC}"
if [ ! -z "$DEV_PROCESS" ] || [ ! -z "$PROD_PROCESS" ]; then
    echo -e "  To restart: ${GREEN}./restart-prod.sh${NC} or ${GREEN}./restart-bot.sh${NC}"
    echo -e "  To stop: ${RED}pkill -f 'node.*index.js'${NC}"
else
    echo -e "  To start dev: ${GREEN}./restart-bot.sh${NC}"
    echo -e "  To start prod: ${GREEN}./build.sh && ./start-prod.sh${NC}"
fi

echo ""
echo -e "${BLUE}📖 Documentation:${NC}"
echo -e "  ${YELLOW}cat SCRIPTS.md${NC}       - Full scripts documentation"
