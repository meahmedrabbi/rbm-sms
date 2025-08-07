import TelegramBot from 'node-telegram-bot-api';
import { UserService } from '../services/UserService';
import { MessageService } from '../services/MessageService';
import { SmsService } from '../services/SmsService';
import { NumberRequestService } from '../services/NumberRequestService';
import { PhoneNumberDetector } from '../services/PhoneNumberDetector';
import { Logger } from '../utils/Logger';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { MessageFormatter } from '../utils/MessageFormatter';

/**
 * Controller for handling bot commands
 */
export class CommandController {
  private logger = Logger.getInstance();
  private authMiddleware: AuthMiddleware;
  private smsService: SmsService;
  private numberRequestService: NumberRequestService;

  constructor(
    private bot: TelegramBot,
    private userService: UserService,
    private messageService: MessageService
  ) {
    this.authMiddleware = new AuthMiddleware(bot);
    this.smsService = new SmsService();
    this.numberRequestService = new NumberRequestService();
  }

  /**
   * Handle incoming commands
   */
  public async handleCommand(msg: any, command: string): Promise<void> {
    try {
      const user = await this.userService.findOrCreateUser(msg.from);
      this.logger.info(`Command received: /${command} from ${user.getDisplayName()}`);

      // Split command and arguments
      const [cmd, ...args] = command.split(' ');

      // Check access permission using middleware
      const hasAccess = await this.authMiddleware.checkAccess(msg, cmd, user);
      if (!hasAccess) {
        return; // Access denied message already sent by middleware
      }

      switch (cmd.toLowerCase()) {
        case 'start':
          await this.handleStartCommand(msg, user);
          break;
        case 'info':
          await this.handleInfoCommand(msg, user);
          break;
        case 'balance':
          await this.handleBalanceCommand(msg, user);
          break;
        case 'profile':
          await this.handleProfileCommand(msg, user);
          break;
        case 'authorize':
          await this.handleAuthorizeCommand(msg, user, args);
          break;
        case 'ban':
          await this.handleBanCommand(msg, user, args);
          break;
        case 'savecookie':
          await this.handleSaveCookieCommand(msg, user, args);
          break;
        case 'sms':
          await this.handleSmsCommand(msg, user, args);
          break;
        case 'mysms':
          await this.handleMySmsCommand(msg, user);
          break;
        default:
          await this.handleUnknownCommand(msg, cmd);
      }
    } catch (error: any) {
      this.logger.error('Error handling command:', error);
      
      // Handle transaction rollback errors gracefully
      if (error.message && error.message.includes('Transaction cannot be committed')) {
        // Wait a moment and retry once
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
          const user = await this.userService.findOrCreateUser(msg.from);
          this.logger.info(`Command retry successful for: ${user.getDisplayName()}`);
          return;
        } catch (retryError) {
          this.logger.error('Command retry failed:', retryError);
        }
      }
      
      await this.bot.sendMessage(msg.chat.id, 'Sorry, an error occurred while processing your command. Please try again.');
    }
  }

  /**
   * Handle /start command
   */
  private async handleStartCommand(msg: any, user: any): Promise<void> {
    const adminContact = this.authMiddleware.getAdminContact();
    
    let welcomeMessage = `🎉 Welcome to the Bot, ${user.getDisplayName()}!\n\n`;

    // Add different messages based on authorization status
    if (user.isAuthorized && !user.isBanned) {
      welcomeMessage += `✅ **Account Status:** Authorized\n`;
      welcomeMessage += `💎 **Balance:** ${user.getFormattedBalance()}\n\n`;
      welcomeMessage += `🚀 **Available Services:**\n`;
      welcomeMessage += `• 📱 Get phone numbers from 111+ countries\n`;
      welcomeMessage += `• 💬 Receive SMS messages instantly\n`;
      welcomeMessage += `• 📊 Track your requests and usage\n\n`;
      welcomeMessage += `💡 **Quick Start:** Use the buttons below or send a phone number directly!`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📱 Get Number', callback_data: 'get_number' },
            { text: '📋 My Numbers', callback_data: 'my_numbers' }
          ],
          [
            { text: '📊 Account Info', callback_data: 'account_info' },
            { text: '💎 Balance', callback_data: 'check_balance' }
          ]
        ]
      };

      await this.bot.sendMessage(msg.chat.id, welcomeMessage.trim(), {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } else {
      welcomeMessage += `⚠️ **Account Status:** ${user.isBanned ? 'Banned' : 'Unauthorized'}\n\n`;
      welcomeMessage += `**Full Features Available After Authorization:**\n`;
      welcomeMessage += `• 📱 Phone numbers from 111+ countries\n`;
      welcomeMessage += `• 💬 SMS retrieval service\n`;
      welcomeMessage += `• 📊 Balance management\n`;
      welcomeMessage += `• 📋 Request tracking\n\n`;
      welcomeMessage += `📞 **Contact Admin:** ${adminContact}`;

      await this.bot.sendMessage(msg.chat.id, welcomeMessage.trim(), {
        parse_mode: 'Markdown'
      });
    }
  }

  /**
   * Handle /info command
   */
  private async handleInfoCommand(msg: any, user: any): Promise<void> {
    const adminContact = this.authMiddleware.getAdminContact();
    
    const infoMessage = `
ℹ️ Your Profile Information:

👤 Basic Info:
• Name: ${user.getDisplayName()}
• Username: ${user.username || 'Not set'}
• Language: ${user.languageCode || 'Not set'}

💰 Account Details:
• Balance: ${user.getFormattedBalance()}
• Status: ${user.getStatusBadge()}



💡 Need Help?
${!user.isAuthorized || user.isBanned ? `Contact admin for assistance: ${adminContact}` : 'Contact admin for support: ' + adminContact}
    `.trim();

    await this.bot.sendMessage(msg.chat.id, infoMessage);
  }

  /**
   * Handle /balance command
   */
  private async handleBalanceCommand(msg: any, user: any): Promise<void> {
    const balanceMessage = `
💰 Your Balance Information:

Current Balance: ${user.getFormattedBalance()}
Account Status: ${user.getStatusBadge()}

💡 Note: Contact admin to add balance or get authorized for more features.
    `.trim();

    await this.bot.sendMessage(msg.chat.id, balanceMessage);
  }

  /**
   * Handle /profile command
   */
  private async handleProfileCommand(msg: any, user: any): Promise<void> {
    const profileMessage = `
👤 Your Profile:

• Name: ${user.getDisplayName()}
• Balance: ${user.getFormattedBalance()}
• Status: ${user.getStatusBadge()}
• Role: ${user.getRoleBadge()}
• Telegram ID: ${user.telegramId}
• Member Since: ${user.createdAt.toDateString()}
• Last Activity: ${user.lastActivity ? user.lastActivity.toDateString() : 'Never'}

${!user.isAuthorized ? '⚠️ Note: Contact admin to get authorized for full access!' : ''}
    `.trim();

    await this.bot.sendMessage(msg.chat.id, profileMessage);
  }

  /**
   * Handle /authorize command (admin only)
   */
  private async handleAuthorizeCommand(msg: any, user: any, args: string[]): Promise<void> {
    // Check if user is admin
    if (user.username !== 'itsahrabbix' && user.role !== 'admin' && user.role !== 'super_admin') {
      await this.bot.sendMessage(msg.chat.id, '❌ Access denied. Only admin can use this command.');
      return;
    }

    if (args.length === 0) {
      await this.bot.sendMessage(msg.chat.id, 'Usage: /authorize <telegram_id_or_username>');
      return;
    }

    const identifier = args[0];
    
    try {
      let targetUser;
      
      // Check if it's a numeric ID
      if (/^\d+$/.test(identifier)) {
        const telegramId = parseInt(identifier);
        targetUser = await this.userService.getUserByTelegramId(telegramId);
      } else {
        // For username lookup, we'll search manually since there's no username method
        const username = identifier.replace('@', '');
        // This is a simplified approach - ideally we'd add a method to UserService
        await this.bot.sendMessage(msg.chat.id, `❌ Username lookup not implemented yet. Please use Telegram ID instead.`);
        return;
      }

      if (!targetUser) {
        await this.bot.sendMessage(msg.chat.id, `❌ User not found: ${identifier}`);
        return;
      }

      if (targetUser.isAuthorized) {
        await this.bot.sendMessage(msg.chat.id, `✅ User ${targetUser.getDisplayName()} is already authorized.`);
        return;
      }

      await this.userService.authorizeUser(targetUser.id);
      
      const successMessage = `✅ User ${targetUser.getDisplayName()} has been authorized successfully!`;
      await this.bot.sendMessage(msg.chat.id, successMessage);
      
      // Notify the authorized user
      try {
        const notificationMessage = `🎉 Congratulations! Your account has been authorized by the admin.

You now have access to all bot features:
• /balance - Check your account balance
• /profile - View your profile information

Welcome to the full experience! 🚀`;
        
        await this.bot.sendMessage(targetUser.telegramId, notificationMessage);
      } catch (notifyError) {
        this.logger.warn(`Could not notify user ${targetUser.getDisplayName()}: ${notifyError}`);
      }
      
    } catch (error) {
      this.logger.error('Error authorizing user:', error);
      await this.bot.sendMessage(msg.chat.id, '❌ Error occurred while authorizing user.');
    }
  }

  /**
   * Handle /sms command - Request SMS for a phone number
   */
  private async handleSmsCommand(msg: any, user: any, args: string[]): Promise<void> {
    if (args.length === 0) {
      const helpMessage = MessageFormatter.formatSmsHelp();
      await this.bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
      return;
    }

    const phoneNumberText = args.join(' ');
    const phoneNumbers = PhoneNumberDetector.detectPhoneNumbers(phoneNumberText);

    if (phoneNumbers.length === 0) {
      const errorMessage = MessageFormatter.formatError('Invalid phone number format. Please check and try again.\n\nExample: `/sms +1234567890`');
      await this.bot.sendMessage(msg.chat.id, errorMessage, { parse_mode: 'Markdown' });
      return;
    }

    if (phoneNumbers.length > 1) {
      const errorMessage = MessageFormatter.formatError('Please provide only one phone number at a time.');
      await this.bot.sendMessage(msg.chat.id, errorMessage, { parse_mode: 'Markdown' });
      return;
    }

    // Check user balance (mock check)
    if (user.balance < 0.50) {
      const adminContact = this.authMiddleware.getAdminContact();
      const balanceMessage = MessageFormatter.formatInsufficientBalance('$0.50', adminContact);
      await this.bot.sendMessage(msg.chat.id, balanceMessage, { parse_mode: 'Markdown' });
      return;
    }

    const phoneNumber = phoneNumbers[0];
    const formattedNumber = PhoneNumberDetector.formatPhoneNumber(phoneNumber);

    try {
      // Request SMS
      const smsRequest = await this.smsService.requestSms(user.id, phoneNumber, msg.message_id);
      
      // Deduct balance (mock)
      // await this.userService.deductBalance(user.id, 0.50);

      const successMessage = MessageFormatter.formatSmsInitiated(smsRequest);
      await this.bot.sendMessage(msg.chat.id, successMessage, { parse_mode: 'Markdown' });
      
      this.logger.info(`SMS requested by ${user.getDisplayName()} for ${formattedNumber}`);

    } catch (error) {
      this.logger.error('Error processing SMS request:', error);
      const errorMessage = MessageFormatter.formatError('Failed to process SMS request. Please try again.');
      await this.bot.sendMessage(msg.chat.id, errorMessage, { parse_mode: 'Markdown' });
    }
  }

  /**
   * Handle /mysms command - Show user's SMS requests
   */
  private async handleMySmsCommand(msg: any, user: any): Promise<void> {
    try {
      const activeRequests = await this.smsService.getUserActiveSmsRequests(user.id);
      const message = MessageFormatter.formatUserSmsRequests(activeRequests);
      await this.bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });

    } catch (error) {
      this.logger.error('Error getting user SMS requests:', error);
      const errorMessage = MessageFormatter.formatError('Error retrieving SMS requests.');
      await this.bot.sendMessage(msg.chat.id, errorMessage, { parse_mode: 'Markdown' });
    }
  }

  /**
   * Get SMS status emoji
   */
  private getSmsStatusEmoji(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return '⏳';
      case 'received': return '✅';
      case 'expired': return '⏰';
      case 'cancelled': return '❌';
      default: return '❓';
    }
  }

  /**
   * Handle /ban command (admin only)
   */
  private async handleBanCommand(msg: any, user: any, args: string[]): Promise<void> {
    // Check if user is admin
    if (user.username !== 'itsahrabbix' && user.role !== 'admin' && user.role !== 'super_admin') {
      await this.bot.sendMessage(msg.chat.id, '❌ Access denied. Only admin can use this command.');
      return;
    }

    if (args.length < 2) {
      await this.bot.sendMessage(msg.chat.id, 'Usage: /ban <telegram_id> <reason>');
      return;
    }

    const telegramId = parseInt(args[0]);
    const reason = args.slice(1).join(' ');
    
    if (isNaN(telegramId)) {
      await this.bot.sendMessage(msg.chat.id, '❌ Invalid Telegram ID. Please provide a numeric ID.');
      return;
    }

    try {
      const targetUser = await this.userService.getUserByTelegramId(telegramId);

      if (!targetUser) {
        await this.bot.sendMessage(msg.chat.id, `❌ User not found with ID: ${telegramId}`);
        return;
      }

      if (targetUser.isBanned) {
        await this.bot.sendMessage(msg.chat.id, `✅ User ${targetUser.getDisplayName()} is already banned.`);
        return;
      }

      await this.userService.banUser(targetUser.id, reason, user.id);
      
      const successMessage = `✅ User ${targetUser.getDisplayName()} has been banned successfully!\nReason: ${reason}`;
      await this.bot.sendMessage(msg.chat.id, successMessage);
      
      // Notify the banned user
      try {
        const notificationMessage = `🚫 Your account has been banned by the admin.

Reason: ${reason}

You now have limited access to the bot:
• /start - Welcome message
• /info - View your account information

For assistance, contact admin: @itsahrabbix`;
        
        await this.bot.sendMessage(targetUser.telegramId, notificationMessage);
      } catch (notifyError) {
        this.logger.warn(`Could not notify banned user ${targetUser.getDisplayName()}: ${notifyError}`);
      }
      
    } catch (error) {
      this.logger.error('Error banning user:', error);
      await this.bot.sendMessage(msg.chat.id, '❌ Error occurred while banning user.');
    }
  }

  /**
   * Handle /savecookie command (admin only)
   */
  private async handleSaveCookieCommand(msg: any, user: any, args: string[]): Promise<void> {
    // Check if user is admin
    if (user.username !== 'itsahrabbix' && user.role !== 'admin' && user.role !== 'super_admin') {
      await this.bot.sendMessage(msg.chat.id, '❌ Access denied. Only admin can use this command.');
      return;
    }

    if (args.length === 0) {
      await this.bot.sendMessage(msg.chat.id, `📖 **Save Cookie Command Usage:**

Usage: \`/savecookie <cookie_string> [expiry_days]\`

**Examples:**
\`/savecookie "session_id=abc123; auth_token=def456"\`
\`/savecookie "session_id=abc123; auth_token=def456" 30\`

**Parameters:**
• \`cookie_string\` - The complete cookie string from browser
• \`expiry_days\` - Optional, days until expiry (default: 30)

**How to get cookies:**
1. Go to beta.full-sms.com and log in
2. Open Developer Tools (F12)  
3. Go to Application/Storage > Cookies
4. Copy the cookie values

**Note:** Cookies are used for Server 2 (Outbound SMS) SMS retrieval.`, { parse_mode: 'Markdown' });
      return;
    }

    const cookieString = args[0];
    let expiryDays = 30; // Default 30 days

    // Check if expiry days is provided
    if (args.length > 1) {
      const providedDays = parseInt(args[1]);
      if (!isNaN(providedDays) && providedDays > 0) {
        expiryDays = providedDays;
      }
    }

    try {
      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      // Save cookies using SmsService
      await this.smsService.saveCookies(cookieString, expiresAt);

      const successMessage = `✅ **Cookies Saved Successfully!**

**Details:**
• Domain: beta.full-sms.com
• Expires: ${expiresAt.toLocaleDateString()} (${expiryDays} days)
• Status: Ready for Server 2 (Outbound SMS)

**What's Next:**
• Server 2 will now use these cookies for API authentication
• Users can select Server 2 for real SMS retrieval
• Cookies will be automatically cleaned up when expired

🔄 Test the integration by using Server 2 option when checking SMS.`;

      await this.bot.sendMessage(msg.chat.id, successMessage, { parse_mode: 'Markdown' });
      
      this.logger.info(`SMS API cookies saved by admin ${user.getDisplayName()} - expires: ${expiresAt.toISOString()}`);
      
    } catch (error) {
      this.logger.error('Error saving cookies:', error);
      await this.bot.sendMessage(msg.chat.id, '❌ Error occurred while saving cookies. Please check the format and try again.');
    }
  }

  /**
   * Handle unknown commands
   */
  private async handleUnknownCommand(msg: any, command: string): Promise<void> {
    const response = `
❓ Unknown command: /${command}

Available commands:
• /start - Show welcome message and menu buttons
• /info - View your account information
• /balance - Check your account balance (requires authorization)
• /profile - View your profile information (requires authorization)
• /sms <number> - Request SMS retrieval (requires authorization)
• /mysms - Check SMS requests (requires authorization)

💡 **Tip:** Use /start to access the button menu for number requests!
    `;

    await this.bot.sendMessage(msg.chat.id, response);
  }
}
