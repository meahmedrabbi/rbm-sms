import { Config } from '../config/Config';
import { DatabaseService } from '../services/DatabaseService';
import { Logger } from '../utils/Logger';

describe('Bot Components', () => {
  describe('Config', () => {
    it('should load configuration', () => {
      // Set required environment variables for testing
      process.env.TELEGRAM_BOT_TOKEN = 'test_token';
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USERNAME = 'root';
      process.env.DB_PASSWORD = 'test_password';

      const config = Config.get();
      expect(config).toBeDefined();
      expect(config.telegram.botToken).toBe('test_token');
      expect(config.database.host).toBe('localhost');
    });
  });

  describe('Logger', () => {
    it('should create logger instance', () => {
      const logger = Logger.getInstance();
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
    });
  });

  describe('DatabaseService', () => {
    it('should create database service instance', () => {
      const dbService = DatabaseService.getInstance();
      expect(dbService).toBeDefined();
    });
  });
});
