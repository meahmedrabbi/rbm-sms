#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Restarting SMS Bot in Production Mode${NC}"
echo "========================================"

# Kill any existing bot processes (both dev and prod)
echo -e "${YELLOW}🛑 Stopping existing bot instances...${NC}"
pkill -f "ts-node-dev.*src/index.ts" || true
pkill -f "node.*dist/index.js" || true
pkill -f "node.*src/index.ts" || true

# Wait for processes to terminate
echo -e "${YELLOW}⏳ Waiting for processes to terminate...${NC}"
sleep 3

# Check if built files exist, if not build first
if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
    echo -e "${YELLOW}🔨 Built files not found, building first...${NC}"
    ./build.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Build failed! Cannot start in production mode.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}🚀 Starting bot in production mode...${NC}"
./start-prod.sh
