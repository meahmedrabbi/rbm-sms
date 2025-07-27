import { User, UserCreationAttributes, UserRole, UserStatus } from '../models/User';
import { Message, MessageCreationAttributes, MessageType } from '../models/Message';
import { Logger } from '../utils/Logger';
import { Utils } from '../utils/Utils';

/**
 * Service class for user-related operations
 */
export class UserService {
  private logger = Logger.getInstance();

  /**
   * Find or create a user by Telegram ID with retry logic
   */
  public async findOrCreateUser(telegramUser: any): Promise<User> {
    return Utils.retry(async () => {
      try {
        const [user, created] = await User.findOrCreate({
          where: { telegramId: telegramUser.id },
          defaults: {
            telegramId: telegramUser.id,
            username: telegramUser.username,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            languageCode: telegramUser.language_code,
            balance: 0.00,
            isActive: true,
            isAuthorized: false,
            isBanned: false,
            isPremium: false,
            role: UserRole.USER,
            status: UserStatus.PENDING,
          } as UserCreationAttributes,
        });

        if (created) {
          this.logger.info(`New user created: ${user.getDisplayName()} (ID: ${user.telegramId})`);
        } else {
          // Update user info if it has changed
          await this.updateUserInfo(user, telegramUser);
          // Update last login
          await user.updateLastLogin();
        }

        return user;
      } catch (error: any) {
        // If it's a transaction error, let the retry utility handle it
        if (Utils.isTransactionError(error)) {
          this.logger.debug('Transaction error detected, will retry:', error.message);
          throw error;
        }
        
        // For other errors, log and rethrow
        this.logger.error('Error finding or creating user:', error);
        throw error;
      }
    }, 3, 50); // Retry up to 3 times with 50ms initial delay
  }

  /**
   * Update user information
   */
  private async updateUserInfo(user: User, telegramUser: any): Promise<void> {
    const updates: Partial<UserCreationAttributes> = {};
    
    if (user.username !== telegramUser.username) {
      updates.username = telegramUser.username;
    }
    if (user.firstName !== telegramUser.first_name) {
      updates.firstName = telegramUser.first_name;
    }
    if (user.lastName !== telegramUser.last_name) {
      updates.lastName = telegramUser.last_name;
    }
    if (user.languageCode !== telegramUser.language_code) {
      updates.languageCode = telegramUser.language_code;
    }

    if (Object.keys(updates).length > 0) {
      await user.update(updates);
      this.logger.info(`User info updated for: ${user.getDisplayName()}`);
    }
  }

  /**
   * Get user by Telegram ID
   */
  public async getUserByTelegramId(telegramId: number): Promise<User | null> {
    try {
      return await User.findOne({ where: { telegramId } });
    } catch (error) {
      this.logger.error('Error getting user by Telegram ID:', error);
      throw error;
    }
  }

  /**
   * Update user active status
   */
  public async updateUserActiveStatus(userId: number, isActive: boolean): Promise<void> {
    try {
      await User.update({ isActive }, { where: { id: userId } });
      this.logger.info(`User ${userId} active status updated to: ${isActive}`);
    } catch (error) {
      this.logger.error('Error updating user active status:', error);
      throw error;
    }
  }

  /**
   * Get all active users
   */
  public async getActiveUsers(): Promise<User[]> {
    try {
      return await User.findAll({ where: { isActive: true } });
    } catch (error) {
      this.logger.error('Error getting active users:', error);
      throw error;
    }
  }

  /**
   * Get authorized users
   */
  public async getAuthorizedUsers(): Promise<User[]> {
    try {
      return await User.findAll({ where: { isAuthorized: true, isActive: true } });
    } catch (error) {
      this.logger.error('Error getting authorized users:', error);
      throw error;
    }
  }

  /**
   * Get banned users
   */
  public async getBannedUsers(): Promise<User[]> {
    try {
      return await User.findAll({ where: { isBanned: true } });
    } catch (error) {
      this.logger.error('Error getting banned users:', error);
      throw error;
    }
  }

  /**
   * Ban user
   */
  public async banUser(userId: number, reason: string, bannedBy: number, until?: Date): Promise<void> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      await user.ban(reason, bannedBy, until);
      this.logger.info(`User ${user.getDisplayName()} banned by ${bannedBy}: ${reason}`);
    } catch (error) {
      this.logger.error('Error banning user:', error);
      throw error;
    }
  }

  /**
   * Unban user
   */
  public async unbanUser(userId: number): Promise<void> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      await user.unban();
      this.logger.info(`User ${user.getDisplayName()} unbanned`);
    } catch (error) {
      this.logger.error('Error unbanning user:', error);
      throw error;
    }
  }

  /**
   * Authorize user
   */
  public async authorizeUser(userId: number): Promise<void> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      await user.authorize();
      this.logger.info(`User ${user.getDisplayName()} authorized`);
    } catch (error) {
      this.logger.error('Error authorizing user:', error);
      throw error;
    }
  }

  /**
   * Add balance to user
   */
  public async addBalance(userId: number, amount: number, reason?: string): Promise<void> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      await user.addBalance(amount, reason);
      this.logger.info(`Added $${amount} to ${user.getDisplayName()}'s balance. Reason: ${reason || 'N/A'}`);
    } catch (error) {
      this.logger.error('Error adding balance:', error);
      throw error;
    }
  }

  /**
   * Deduct balance from user
   */
  public async deductBalance(userId: number, amount: number, reason?: string): Promise<boolean> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      const success = await user.deductBalance(amount, reason);
      if (success) {
        this.logger.info(`Deducted $${amount} from ${user.getDisplayName()}'s balance. Reason: ${reason || 'N/A'}`);
      } else {
        this.logger.warn(`Failed to deduct $${amount} from ${user.getDisplayName()}'s balance - insufficient funds`);
      }
      return success;
    } catch (error) {
      this.logger.error('Error deducting balance:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  public async getUserStats(): Promise<{
    total: number;
    active: number;
    authorized: number;
    banned: number;
    premium: number;
    totalBalance: number;
  }> {
    try {
      const total = await User.count();
      const active = await User.count({ where: { isActive: true } });
      const authorized = await User.count({ where: { isAuthorized: true } });
      const banned = await User.count({ where: { isBanned: true } });
      const premium = await User.count({ where: { isPremium: true } });
      
      // Calculate total balance across all users
      const users = await User.findAll({ attributes: ['balance'] });
      const totalBalance = users.reduce((sum, user) => sum + parseFloat(user.balance.toString()), 0);

      return {
        total,
        active,
        authorized,
        banned,
        premium,
        totalBalance,
      };
    } catch (error) {
      this.logger.error('Error getting user statistics:', error);
      throw error;
    }
  }
}
