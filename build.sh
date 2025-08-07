#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔨 Building SMS Bot for Production${NC}"
echo "=================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create a .env file with your configuration."
    exit 1
fi

# Install dependencies if node_modules doesn't exist or package.json is newer
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing/updating dependencies...${NC}"
    npm ci --omit=dev
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install dependencies!${NC}"
        exit 1
    fi
fi

# Install dev dependencies for build
echo -e "${YELLOW}📦 Installing build dependencies...${NC}"
npm install --include=dev
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dev dependencies!${NC}"
    exit 1
fi

# Clean previous build
echo -e "${YELLOW}🧹 Cleaning previous build...${NC}"
rm -rf dist/

# Build the project
echo -e "${YELLOW}🔨 Building TypeScript project...${NC}"
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
    echo -e "${GREEN}📁 Built files are in ./dist/${NC}"
    
    # Remove dev dependencies after build
    echo -e "${YELLOW}🧹 Removing dev dependencies...${NC}"
    npm ci --omit=dev
    
    echo -e "${GREEN}🎉 Production build complete!${NC}"
    echo -e "${BLUE}💡 Use './start-prod.sh' to start in production mode${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
