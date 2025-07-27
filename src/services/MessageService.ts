import { Message, MessageCreationAttributes, MessageType } from '../models/Message';
import { Logger } from '../utils/Logger';

/**
 * Service class for message-related operations
 */
export class MessageService {
  private logger = Logger.getInstance();

  /**
   * Save a message to the database
   */
  public async saveMessage(messageData: MessageCreationAttributes): Promise<Message> {
    try {
      const message = await Message.create(messageData);
      this.logger.debug(`Message saved: ${message.id} (Type: ${message.type})`);
      return message;
    } catch (error) {
      this.logger.error('Error saving message:', error);
      throw error;
    }
  }

  /**
   * Get messages by user ID
   */
  public async getMessagesByUserId(userId: number, limit = 50): Promise<Message[]> {
    try {
      return await Message.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
      });
    } catch (error) {
      this.logger.error('Error getting messages by user ID:', error);
      throw error;
    }
  }

  /**
   * Get message by Telegram message ID
   */
  public async getMessageByTelegramId(telegramMessageId: number): Promise<Message | null> {
    try {
      return await Message.findOne({ where: { telegramMessageId } });
    } catch (error) {
      this.logger.error('Error getting message by Telegram ID:', error);
      throw error;
    }
  }

  /**
   * Get recent messages
   */
  public async getRecentMessages(limit = 100): Promise<Message[]> {
    try {
      return await Message.findAll({
        order: [['createdAt', 'DESC']],
        limit,
      });
    } catch (error) {
      this.logger.error('Error getting recent messages:', error);
      throw error;
    }
  }

  /**
   * Get message statistics
   */
  public async getMessageStats(): Promise<{ total: number; byType: Record<MessageType, number> }> {
    try {
      const total = await Message.count();
      
      const byType: Record<MessageType, number> = {} as Record<MessageType, number>;
      
      for (const type of Object.values(MessageType)) {
        byType[type] = await Message.count({ where: { type } });
      }

      return { total, byType };
    } catch (error) {
      this.logger.error('Error getting message statistics:', error);
      throw error;
    }
  }

  /**
   * Delete old messages (cleanup)
   */
  public async deleteOldMessages(daysOld = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deletedCount = await Message.destroy({
        where: {
          createdAt: {
            [require('sequelize').Op.lt]: cutoffDate,
          },
        },
      });

      this.logger.info(`Deleted ${deletedCount} old messages (older than ${daysOld} days)`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Error deleting old messages:', error);
      throw error;
    }
  }
}
