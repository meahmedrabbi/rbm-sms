import winston from 'winston';
import { Config } from '../config/Config';

/**
 * Logger utility class using Winston
 */
export class Logger {
  private static instance: winston.Logger;

  /**
   * Get logger instance
   */
  public static getInstance(): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = Logger.createLogger();
    }
    return Logger.instance;
  }

  /**
   * Create Winston logger instance
   */
  private static createLogger(): winston.Logger {
    const config = Config.get();
    
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ level, message, timestamp, stack }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message}${stack ? `\n${stack}` : ''}`;
      })
    );

    return winston.createLogger({
      level: config.logging.level,
      format: logFormat,
      defaultMeta: { service: 'telegram-bot' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error'
        }),
        new winston.transports.File({
          filename: 'logs/combined.log'
        })
      ],
    });
  }
}
