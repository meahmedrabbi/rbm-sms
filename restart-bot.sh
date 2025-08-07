#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Restarting SMS Bot in Development Mode${NC}"
echo "========================================="

# Kill any existing bot processes (both dev and prod)
echo -e "${YELLOW}🛑 Stopping existing bot instances...${NC}"
pkill -f "ts-node-dev.*src/index.ts" || true
pkill -f "node.*dist/index.js" || true
pkill -f "node.*src/index.ts" || true

# Wait for processes to terminate
echo -e "${YELLOW}⏳ Waiting for processes to terminate...${NC}"
sleep 3

echo -e "${GREEN}🚀 Starting bot in development mode...${NC}"
echo -e "${BLUE}📁 Running from: src/index.ts${NC}"
echo -e "${BLUE}🌍 Environment: development${NC}"

cd /home/ahmedrabbi/rbm-sms
npm run dev
