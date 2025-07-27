import TelegramBot from 'node-telegram-bot-api';
import { User } from '../models/User';
import { Logger } from '../utils/Logger';

/**
 * Authentication and authorization middleware
 */
export class AuthMiddleware {
  private logger = Logger.getInstance();
  private readonly ADMIN_USERNAME = '@itsahrabbix';
  private readonly ALLOWED_COMMANDS_FOR_UNAUTHORIZED = ['start', 'info'];
  private readonly ADMIN_ONLY_COMMANDS = ['authorize', 'ban'];
  private readonly AUTHORIZED_USER_COMMANDS = ['balance', 'profile', 'sms', 'mysms'];

  constructor(private bot: TelegramBot) {}

  /**
   * Check if user has access to the command
   */
  public async checkAccess(msg: any, command: string, user: User): Promise<boolean> {
    try {
      const cmdLower = command.toLowerCase();
      
      // Allow /start and /info commands for everyone
      if (this.ALLOWED_COMMANDS_FOR_UNAUTHORIZED.includes(cmdLower)) {
        return true;
      }

      // Allow admin commands for admin users only
      if (this.ADMIN_ONLY_COMMANDS.includes(cmdLower)) {
        if (user.username === 'itsahrabbix' || user.role === 'admin' || user.role === 'super_admin') {
          return true;
        } else {
          await this.bot.sendMessage(msg.chat.id, '❌ Access denied. Only admin can use this command.');
          return false;
        }
      }

      // Check if user is banned
      if (user.isBanned) {
        await this.sendRestrictedMessage(msg, 'banned');
        return false;
      }

      // Check if user is authorized for other commands
      if (!user.isAuthorized) {
        await this.sendRestrictedMessage(msg, 'unauthorized');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Error in auth middleware:', error);
      await this.bot.sendMessage(msg.chat.id, 'An error occurred while checking permissions.');
      return false;
    }
  }

  /**
   * Send appropriate restriction message
   */
  private async sendRestrictedMessage(msg: any, reason: 'banned' | 'unauthorized'): Promise<void> {
    let message = '';

    if (reason === 'banned') {
      message = `
🚫 **Access Denied - Account Banned**

Your account has been banned from using this bot.

**Available Commands:**
• /start - Welcome message
• /info - View your account information

**Need Help?**
Please contact the admin: ${this.ADMIN_USERNAME}
      `.trim();
    } else if (reason === 'unauthorized') {
      message = `
⚠️ **Access Denied - Authorization Required**

You need to be authorized to use SMS services and other features.

**Available Commands:**
• /start - Welcome message  
• /info - View your account information

**Authorized Features Include:**
• SMS retrieval service
• Balance management
• Profile access

**Need Authorization?**
Please contact the admin: ${this.ADMIN_USERNAME}
      `.trim();
    }

    await this.bot.sendMessage(msg.chat.id, message);
  }

  /**
   * Get admin contact info
   */
  public getAdminContact(): string {
    return this.ADMIN_USERNAME;
  }
}
