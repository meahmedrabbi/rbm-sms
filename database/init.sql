-- Create database for Telegram Bot
CREATE DATABASE IF NOT EXISTS telegram_bot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant privileges to root user (if needed)
GRANT ALL PRIVILEGES ON telegram_bot_db.* TO 'root'@'localhost';
FLUSH PRIVILEGES;

-- Use the database
USE telegram_bot_db;

-- Users table will be created automatically by Sequelize
-- Messages table will be created automatically by Sequelize

-- Show tables after creation (for verification)
SHOW TABLES;
