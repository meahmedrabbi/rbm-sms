import TelegramBot from 'node-telegram-bot-api';
import { Config } from '../config/Config';
import { Logger } from '../utils/Logger';
import winston from 'winston';

/**
 * Service for monitoring and logging SMS retrievals to a private channel
 */
export class MonitoringService {
  private static instance: MonitoringService;
  private bot: TelegramBot;
  private logger: winston.Logger;
  private monitoringChannelId?: string;

  private constructor() {
    const config = Config.get();
    this.bot = new TelegramBot(config.telegram.botToken);
    this.logger = Logger.getInstance();
    this.monitoringChannelId = config.telegram.monitoringChannelId;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Send SMS retrieval notification to monitoring channel
   */
  public async logSmsRetrieval(data: {
    userId: number;
    username?: string;
    phoneNumber: string;
    server: string;
    smsCount: number;
    userBalance: string;
    timestamp: Date;
  }): Promise<void> {
    if (!this.monitoringChannelId) {
      this.logger.debug('Monitoring channel not configured, skipping SMS retrieval log');
      return;
    }

    try {
      const { userId, username, phoneNumber, server, smsCount, userBalance, timestamp } = data;
      
      const message = this.formatSmsRetrievalMessage({
        userId,
        username,
        phoneNumber,
        server,
        smsCount,
        userBalance,
        timestamp
      });

      await this.bot.sendMessage(this.monitoringChannelId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });

      this.logger.info(`SMS retrieval logged to monitoring channel for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to send SMS retrieval log to monitoring channel:', error);
    }
  }

  /**
   * Format SMS retrieval message for monitoring
   */
  private formatSmsRetrievalMessage(data: {
    userId: number;
    username?: string;
    phoneNumber: string;
    server: string;
    smsCount: number;
    userBalance: string;
    timestamp: Date;
  }): string {
    const { userId, username, phoneNumber, server, smsCount, userBalance, timestamp } = data;
    
    const timeStr = timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC'
    });

    const serverName = server === 'server2' ? 'Outbound SMS' : server;
    const userDisplay = username ? `@${username} (ID: ${userId})` : `User ID: ${userId}`;

    return `🔍 **SMS Retrieval Alert**\n\n` +
           `👤 **User:** ${userDisplay}\n` +
           `📱 **Phone:** \`${phoneNumber}\`\n` +
           `🔗 **Server:** ${serverName}\n` +
           `📨 **SMS Found:** ${smsCount} message${smsCount !== 1 ? 's' : ''}\n` +
           `💎 **Balance After:** ${userBalance}\n` +
           `⏰ **Time:** ${timeStr} UTC\n\n` +
           `💰 **Charge:** $0.50`;
  }

  /**
   * Send general monitoring alert
   */
  public async sendAlert(message: string, level: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    if (!this.monitoringChannelId) {
      this.logger.debug('Monitoring channel not configured, skipping alert');
      return;
    }

    try {
      const icon = level === 'error' ? '🚨' : level === 'warning' ? '⚠️' : 'ℹ️';
      const formattedMessage = `${icon} **${level.toUpperCase()}**\n\n${message}`;

      await this.bot.sendMessage(this.monitoringChannelId, formattedMessage, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });

      this.logger.info(`Alert sent to monitoring channel: ${level}`);
    } catch (error) {
      this.logger.error('Failed to send alert to monitoring channel:', error);
    }
  }

  /**
   * Test monitoring channel connection
   */
  public async testConnection(): Promise<boolean> {
    if (!this.monitoringChannelId) {
      this.logger.warn('Monitoring channel not configured');
      return false;
    }

    try {
      await this.bot.sendMessage(this.monitoringChannelId, '🧪 **Test Message**\n\nMonitoring service is working correctly!', {
        parse_mode: 'Markdown'
      });
      this.logger.info('Monitoring channel test successful');
      return true;
    } catch (error) {
      this.logger.error('Monitoring channel test failed:', error);
      return false;
    }
  }
}
