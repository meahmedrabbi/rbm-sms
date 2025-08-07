# SMS Monitoring Feature

## Overview
The SMS monitoring feature automatically sends notifications to a private Telegram channel whenever users successfully retrieve SMS messages. This helps administrators monitor system usage and track SMS retrieval activity.

## Setup

### 1. Environment Variable
Add the following environment variable to your `.env` file:

```bash
TELEGRAM_MONITORING_CHANNEL_ID=-1001234567890
```

**How to get the Channel ID:**
1. Create a private Telegram channel
2. Add your bot as an administrator to the channel
3. Send a message in the channel
4. Use the Telegram Bot API to get updates and find the channel ID
5. Channel IDs for channels start with `-100`

### 2. Bot Permissions
Ensure your bot has the following permissions in the monitoring channel:
- Send Messages
- Use Inline Keyboards (optional, for future features)

## Monitoring Message Format

When a user successfully retrieves SMS, the monitoring channel will receive a message like:

```
🔔 SMS Retrieved

👤 User: @username (ID: 12345)
📱 Phone: +1234567890
🖥️ Server: server2
📊 SMS Count: 5 messages found
💰 Balance: $49.50
⏰ Time: 2025-08-07 15:30:45
```

## Features

### Current Features
- ✅ Real-time SMS retrieval notifications
- ✅ User identification (username and ID)
- ✅ Phone number tracking
- ✅ Server type (server1/server2)
- ✅ SMS message count
- ✅ User balance after transaction
- ✅ Timestamp of retrieval

### Planned Features
- 📊 Daily/weekly usage statistics
- 🚨 Alert for high-volume users
- 📈 Revenue tracking
- 🕒 Peak usage time analysis

## Technical Implementation

### Services Involved
- `MonitoringService`: Handles sending notifications to the monitoring channel
- `EnhancedSmsService`: Triggers monitoring when SMS is successfully retrieved
- `UserService`: Provides user information for monitoring
- `Config`: Manages monitoring channel configuration

### Error Handling
- If monitoring channel is not configured, monitoring is silently skipped
- If monitoring message fails to send, it doesn't affect the main SMS retrieval operation
- All monitoring errors are logged for debugging

### Privacy Considerations
- Only successful SMS retrievals are logged
- Failed attempts are not monitored to avoid spam
- User personal information is limited to username and user ID
- Phone numbers are included for administrative purposes

## Troubleshooting

### Common Issues

1. **Bot not sending to monitoring channel**
   - Verify `TELEGRAM_MONITORING_CHANNEL_ID` is correctly set
   - Ensure bot is added as admin to the channel
   - Check bot has message sending permissions

2. **Monitoring messages not appearing**
   - Check application logs for monitoring errors
   - Verify channel ID format (should start with `-100` for channels)
   - Test bot permissions manually

3. **Wrong channel ID format**
   - Use tools like `@userinfobot` to get correct channel ID
   - Channel IDs are negative numbers for channels
   - Private channel IDs start with `-100`

### Debug Mode
Enable debug logging to see monitoring attempts:

```bash
LOG_LEVEL=debug
```

This will show monitoring service activities in the application logs.
