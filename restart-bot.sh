#!/bin/bash

# Kill any existing bot processes
echo "Stopping existing bot instances..."
pkill -f "ts-node-dev.*src/index.ts" || pkill -f "node.*src/index.ts" || true

# Wait for processes to terminate
sleep 3

echo "Starting bot..."
cd /root/rbm-sms-bot
npm run dev
