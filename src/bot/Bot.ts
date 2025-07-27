import TelegramBot from 'node-telegram-bot-api';
import { Config } from '../config/Config';
import { Logger } from '../utils/Logger';
import { UserService } from '../services/UserService';
import { MessageService } from '../services/MessageService';
import { SmsService } from '../services/SmsService';
import { MessageType } from '../models/Message';
import { CommandController } from '../controllers/CommandController';
import { MessageController } from '../controllers/MessageController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

/**
 * Main Bot class that handles Telegram bot operations
 */
export class Bot {
  private bot: TelegramBot;
  private logger = Logger.getInstance();
  private userService: UserService;
  private messageService: MessageService;
  private smsService: SmsService;
  private authMiddleware: AuthMiddleware;
  private commandController: CommandController;
  private messageController: MessageController;

  constructor() {
    const config = Config.get();
    
    this.bot = new TelegramBot(config.telegram.botToken, { polling: true });
    this.userService = new UserService();
    this.messageService = new MessageService();
    this.smsService = new SmsService();
    this.authMiddleware = new AuthMiddleware(this.bot);
    this.commandController = new CommandController(this.bot, this.userService, this.messageService);
    this.messageController = new MessageController(this.bot, this.userService, this.messageService, this.smsService, this.authMiddleware);
    
    this.setupEventHandlers();
  }

  /**
   * Start the bot
   */
  public async start(): Promise<void> {
    try {
      const botInfo = await this.bot.getMe();
      this.logger.info(`Bot started successfully: @${botInfo.username}`);
    } catch (error) {
      this.logger.error('Failed to start bot:', error);
      throw error;
    }
  }

  /**
   * Stop the bot
   */
  public async stop(): Promise<void> {
    try {
      await this.bot.stopPolling();
      this.logger.info('Bot stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping bot:', error);
      throw error;
    }
  }

  /**
   * Setup event handlers for the bot
   */
  private setupEventHandlers(): void {
    // Handle commands
    this.bot.onText(/^\/(.+)/, async (msg, match) => {
      if (match) {
        await this.commandController.handleCommand(msg, match[1]);
      }
    });

    // Handle text messages
    this.bot.on('message', async (msg) => {
      // Skip if it's a command
      if (msg.text?.startsWith('/')) {
        return;
      }
      
      await this.messageController.handleTextMessage(msg);
    });

    // Handle different message types
    this.bot.on('photo', async (msg) => {
      await this.messageController.handleMediaMessage(msg, MessageType.PHOTO);
    });

    this.bot.on('video', async (msg) => {
      await this.messageController.handleMediaMessage(msg, MessageType.VIDEO);
    });

    this.bot.on('audio', async (msg) => {
      await this.messageController.handleMediaMessage(msg, MessageType.AUDIO);
    });

    this.bot.on('document', async (msg) => {
      await this.messageController.handleMediaMessage(msg, MessageType.DOCUMENT);
    });

    this.bot.on('sticker', async (msg) => {
      await this.messageController.handleMediaMessage(msg, MessageType.STICKER);
    });

    this.bot.on('location', async (msg) => {
      await this.messageController.handleMediaMessage(msg, MessageType.LOCATION);
    });

    // Handle callback queries (inline keyboard responses)
    this.bot.on('callback_query', async (callbackQuery: any) => {
      await this.messageController.handleCallbackQuery(callbackQuery);
    });

    // Handle bot errors
    this.bot.on('error', (error: any) => {
      this.logger.error('Bot error:', error);
    });

    // Handle polling errors
    this.bot.on('polling_error', (error: any) => {
      this.logger.error('Polling error:', error);
    });

    this.logger.info('Bot event handlers set up successfully');
  }
}
