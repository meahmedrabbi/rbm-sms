import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

interface CookieAttributes {
  id: number;
  name: string;
  value: string;
  domain: string;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface CookieCreationAttributes extends Optional<CookieAttributes, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt'> {}

export class Cookie extends Model<CookieAttributes, CookieCreationAttributes> implements CookieAttributes {
  public id!: number;
  public name!: string;
  public value!: string;
  public domain!: string;
  public isActive!: boolean;
  public expiresAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Get formatted cookie string for HTTP requests
   */
  public getFormattedCookie(): string {
    return `${this.name}=${this.value}`;
  }

  /**
   * Check if cookie is expired
   */
  public isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  /**
   * Initialize the model
   */
  public static initialize(sequelize: Sequelize): void {
    Cookie.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        value: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        domain: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'beta.full-sms.com',
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: 'cookies',
        timestamps: true,
        indexes: [
          {
            fields: ['name', 'domain'],
            unique: true,
          },
          {
            fields: ['isActive'],
          },
        ],
      }
    );
  }
}

export { CookieAttributes, CookieCreationAttributes };
