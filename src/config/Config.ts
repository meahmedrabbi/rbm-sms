/**
 * Application configuration interface
 */
export interface IConfig {
  app: {
    nodeEnv: string;
    port: number;
  };
  telegram: {
    botToken: string;
  };
  database: {
    host: string;
    port: number;
    name: string;
    username: string;
    password: string;
    dialect: string;
  };
  logging: {
    level: string;
  };
  security: {
    jwtSecret: string;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  };
}

/**
 * Configuration service
 */
export class Config {
  private static instance: IConfig;

  /**
   * Get configuration instance
   */
  public static get(): IConfig {
    if (!Config.instance) {
      Config.instance = Config.load();
    }
    return Config.instance;
  }

  /**
   * Load configuration from environment variables
   */
  private static load(): IConfig {
    const requiredEnvVars = [
      'TELEGRAM_BOT_TOKEN',
      'DB_HOST',
      'DB_NAME',
      'DB_USERNAME',
      'DB_PASSWORD'
    ];

    // Check for required environment variables
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    return {
      app: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3000', 10),
      },
      telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN!,
      },
      database: {
        host: process.env.DB_HOST!,
        port: parseInt(process.env.DB_PORT || '3306', 10),
        name: process.env.DB_NAME!,
        username: process.env.DB_USERNAME!,
        password: process.env.DB_PASSWORD!,
        dialect: process.env.DB_DIALECT || 'mysql',
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
      },
      security: {
        jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      },
    };
  }
}
