import { Sequelize } from 'sequelize';
import { Config } from '../config/Config';
import { Logger } from '../utils/Logger';
import { User } from '../models/User';
import { Message } from '../models/Message';
import { Cookie } from '../models/Cookie';

/**
 * Database service for managing Sequelize connection and models
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private sequelize: Sequelize;
  private logger = Logger.getInstance();

  private constructor() {
    const config = Config.get();
    
    this.sequelize = new Sequelize({
      database: config.database.name,
      username: config.database.username,
      password: config.database.password,
      host: config.database.host,
      port: config.database.port,
      dialect: 'mysql',
      logging: (msg) => this.logger.debug(msg),
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });
  }

  /**
   * Get DatabaseService instance (Singleton)
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize database connection and models
   */
  public async initialize(): Promise<void> {
    try {
      // Test connection
      await this.sequelize.authenticate();
      this.logger.info('Database connection has been established successfully');

      // Initialize models
      this.initializeModels();

      // Sync database (create tables if they don't exist)
      // Using force: false and alter: false for production safety
      await this.sequelize.sync({ alter: false, force: false });
      this.logger.info('Database models synchronized');

      // Add a small delay to ensure everything is ready
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      this.logger.error('Unable to connect to the database:', error);
      throw error;
    }
  }

  /**
   * Initialize all models
   */
  private initializeModels(): void {
    User.initialize(this.sequelize);
    Message.initialize(this.sequelize);
    Cookie.initialize(this.sequelize);
    
    // Set up associations
    this.setupAssociations();
  }

  /**
   * Setup model associations
   */
  private setupAssociations(): void {
    // User has many Messages
    User.hasMany(Message, {
      foreignKey: 'userId',
      as: 'messages',
    });

    // Message belongs to User
    Message.belongsTo(User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }

  /**
   * Get Sequelize instance
   */
  public getSequelize(): Sequelize {
    return this.sequelize;
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    try {
      await this.sequelize.close();
      this.logger.info('Database connection closed');
    } catch (error) {
      this.logger.error('Error closing database connection:', error);
      throw error;
    }
  }
}
