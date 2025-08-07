# SMS Bot Scripts Guide

This project includes several scripts to manage the SMS bot in both development and production environments.

## 📜 Available Scripts

### Development Mode
- `./restart-bot.sh` or `npm run restart:dev` - Restart bot in development mode with hot-reload
- `npm run dev` - Start bot in development mode with TypeScript compilation on-the-fly

### Production Mode  
- `./build.sh` or `npm run build:prod` - Build the project for production
- `./start-prod.sh` or `npm run start:prod` - Start bot in production mode
- `./restart-prod.sh` or `npm run restart:prod` - Restart bot in production mode

### Basic Commands
- `npm run build` - Compile TypeScript to JavaScript (basic build)
- `npm start` - Start the pre-built bot from dist/ folder
- `npm run lint` - Check code quality
- `npm test` - Run tests

## 🔧 Usage Examples

### For Development
```bash
# Start development mode with hot-reload
./restart-bot.sh

# Or using npm
npm run restart:dev
```

### For Production
```bash
# First time setup - build the project
./build.sh

# Start in production mode
./start-prod.sh

# Or restart in production mode (includes build if needed)
./restart-prod.sh

# Using npm commands
npm run build:prod
npm run start:prod
npm run restart:prod
```

## 🚀 Production vs Development

### Development Mode
- ✅ Hot-reload on code changes
- ✅ TypeScript compilation on-the-fly
- ✅ Detailed error messages
- ❌ Slower startup
- ❌ Higher memory usage

### Production Mode  
- ✅ Faster startup and execution
- ✅ Lower memory usage
- ✅ Optimized for performance
- ✅ Built JavaScript files
- ❌ No hot-reload
- ❌ Requires build step

## 📁 File Structure

```
rbm-sms/
├── src/                    # TypeScript source files
├── dist/                   # Built JavaScript files (production)
├── build.sh               # Production build script
├── start-prod.sh          # Production start script  
├── restart-prod.sh        # Production restart script
├── restart-bot.sh         # Development restart script
└── start.sh               # Legacy start script
```

## 🔐 Environment Variables

Make sure your `.env` file is configured with:
```env
NODE_ENV=production  # Set automatically by production scripts
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_MONITORING_CHANNEL_ID=your_channel_id
# ... other environment variables
```

## 🛠️ Troubleshooting

### Build Issues
```bash
# Clean and rebuild
rm -rf dist/ node_modules/
npm install
./build.sh
```

### Process Issues
```bash
# Kill all bot processes manually
pkill -f "node.*index.js"
pkill -f "ts-node"

# Then restart
./restart-prod.sh  # or ./restart-bot.sh for dev
```

### Permission Issues
```bash
# Make scripts executable
chmod +x *.sh
```
