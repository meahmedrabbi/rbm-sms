import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

/**
 * Message types enum
 */
export enum MessageType {
  TEXT = 'text',
  PHOTO = 'photo',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  STICKER = 'sticker',
  LOCATION = 'location',
}

/**
 * Message attributes interface
 */
export interface MessageAttributes {
  id: number;
  userId: number;
  telegramMessageId: number;
  type: MessageType;
  content?: string;
  metadata?: object;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Message creation attributes
 */
export interface MessageCreationAttributes extends Optional<MessageAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

/**
 * Message model class
 */
export class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  public id!: number;
  public userId!: number;
  public telegramMessageId!: number;
  public type!: MessageType;
  public content?: string;
  public metadata?: object;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Initialize Message model
   */
  public static initialize(sequelize: Sequelize): void {
    Message.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'user_id',
          references: {
            model: 'users',
            key: 'id',
          },
        },
        telegramMessageId: {
          type: DataTypes.BIGINT,
          allowNull: false,
          field: 'telegram_message_id',
        },
        type: {
          type: DataTypes.ENUM(...Object.values(MessageType)),
          allowNull: false,
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'created_at',
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'updated_at',
        },
      },
      {
        sequelize,
        tableName: 'messages',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ['user_id'],
          },
          {
            fields: ['telegram_message_id'],
          },
          {
            fields: ['type'],
          },
        ],
      }
    );
  }
}
