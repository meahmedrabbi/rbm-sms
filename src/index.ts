import dotenv from 'dotenv';
import { Bot } from './bot/Bot';
import { DatabaseService } from './services/DatabaseService';
import { Logger } from './utils/Logger';

// Load environment variables
dotenv.config();

const logger = Logger.getInstance();

/**
 * Application entry point
 */
class Application {
  private bot: Bot;
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = DatabaseService.getInstance();
    this.bot = new Bot();
  }

  /**
   * Initialize and start the application
   */
  public async start(): Promise<void> {
    try {
      logger.info('Starting Telegram Bot Application...');

      // Initialize database connection
      await this.databaseService.initialize();
      logger.info('Database connection established');

      // Start the bot
      await this.bot.start();
      logger.info('Telegram bot started successfully');

      // Graceful shutdown handlers
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      try {
        await this.bot.stop();
        await this.databaseService.close();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
      shutdown('unhandledRejection');
    });
  }
}

// Start the application
const app = new Application();
app.start();
