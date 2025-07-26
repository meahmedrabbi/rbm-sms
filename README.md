# Telegram Bot with Node.js and MySQL

A professional Telegram bot built with Node.js, TypeScript, and MySQL using Sequelize ORM.

## Features

- 🤖 Full-featured Telegram bot
- 💾 MySQL database integration with Sequelize ORM
- 📝 Message logging and statistics
- 🎯 Command handling system
- 📊 User analytics
- 🔒 Professional error handling and logging
- 🏗️ Clean architecture with services and controllers
- ✅ TypeScript for type safety
- 🧪 Jest testing framework setup
- 📋 ESLint and Prettier for code quality

## Prerequisites

- Node.js (v16 or higher)
- MySQL Server
- Telegram Bot Token (from @BotFather)

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure your environment:**
   - Copy `.env` file and update with your settings
   - Get your Telegram Bot Token from [@BotFather](https://t.me/botfather)
   - Update database credentials

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=telegram_bot_db
DB_USERNAME=root
DB_PASSWORD=your_password

# Other configurations
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

## Available Commands

- `/start` - Start the bot and show welcome message
- `/help` - Show help message with all commands
- `/stats` - Show user statistics
- `/info` - Show user profile information
- `/echo <message>` - Echo back your message

## Project Structure

```
src/
├── bot/             # Bot main class
├── config/          # Configuration management
├── controllers/     # Request controllers
├── models/          # Database models
├── services/        # Business logic services
├── utils/           # Utility classes
└── index.ts         # Application entry point
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the project
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm test` - Run tests

## Database Schema

### Users Table
- `id` - Primary key
- `telegram_id` - Unique Telegram user ID
- `username` - Telegram username
- `first_name` - User's first name
- `last_name` - User's last name
- `language_code` - User's language
- `is_active` - Account status
- `created_at` - Registration date
- `updated_at` - Last update

### Messages Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `telegram_message_id` - Telegram message ID
- `type` - Message type (text, photo, video, etc.)
- `content` - Message content
- `metadata` - Additional message data (JSON)
- `created_at` - Message timestamp
- `updated_at` - Last update

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details.
# rbm-sms
