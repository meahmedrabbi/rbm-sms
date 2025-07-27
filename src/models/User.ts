import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

/**
 * User roles enum
 */
export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

/**
 * User status enum
 */
export enum UserStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  SUSPENDED = 'suspended',
  BANNED = 'banned'
}

/**
 * User attributes interface
 */
export interface UserAttributes {
  id: number;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  balance: number;
  isActive: boolean;
  isAuthorized: boolean;
  isBanned: boolean;
  isPremium: boolean;
  role: UserRole;
  status: UserStatus;
  lastActivity?: Date;
  bannedAt?: Date;
  banReason?: string;
  bannedById?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User creation attributes (optional id, createdAt, updatedAt)
 */
export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt' | 'balance'> {}

/**
 * User model class
 */
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public telegramId!: number;
  public username?: string;
  public firstName?: string;
  public lastName?: string;
  public languageCode?: string;
  public balance!: number;
  public isActive!: boolean;
  public isAuthorized!: boolean;
  public isBanned!: boolean;
  public isPremium!: boolean;
  public role!: UserRole;
  public status!: UserStatus;
  public lastActivity?: Date;
  public bannedAt?: Date;
  public banReason?: string;
  public bannedById?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Initialize User model
   */
  public static initialize(sequelize: Sequelize): void {
    User.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        telegramId: {
          type: DataTypes.BIGINT,
          allowNull: false,
          unique: true,
          field: 'telegram_id',
        },
        username: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        firstName: {
          type: DataTypes.STRING(100),
          allowNull: true,
          field: 'first_name',
        },
        lastName: {
          type: DataTypes.STRING(100),
          allowNull: true,
          field: 'last_name',
        },
        languageCode: {
          type: DataTypes.STRING(10),
          allowNull: true,
          field: 'language_code',
        },
        balance: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: 'is_active',
        },
        isAuthorized: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_authorized',
        },
        isBanned: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_banned',
        },
        isPremium: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_premium',
        },
        role: {
          type: DataTypes.ENUM(...Object.values(UserRole)),
          allowNull: false,
          defaultValue: UserRole.USER,
        },
        status: {
          type: DataTypes.ENUM(...Object.values(UserStatus)),
          allowNull: false,
          defaultValue: UserStatus.PENDING,
        },
        lastActivity: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'last_activity',
        },
        bannedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'banned_at',
        },
        banReason: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'ban_reason',
        },
        bannedById: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'banned_by_id',
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
        tableName: 'users',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            unique: true,
            fields: ['telegram_id'],
          },
          {
            fields: ['status'],
          },
          {
            fields: ['role'],
          },
          {
            fields: ['is_banned'],
          },
          {
            fields: ['is_authorized'],
          },
        ],
      }
    );
  }

  /**
   * Get user's full name
   */
  public getFullName(): string {
    const parts = [this.firstName, this.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : this.username || `User${this.telegramId}`;
  }

  /**
   * Get user's display name
   */
  public getDisplayName(): string {
    return this.username || this.getFullName();
  }

  /**
   * Check if user is currently banned
   */
  public isCurrentlyBanned(): boolean {
    if (!this.isBanned) return false;
    // Since we don't have bannedUntil in database, treat all bans as permanent
    return true;
  }

  /**
   * Check if user can perform actions (not banned and authorized)
   */
  public canPerformActions(): boolean {
    return this.isActive && this.isAuthorized && !this.isCurrentlyBanned();
  }

  /**
   * Get formatted balance
   */
  public getFormattedBalance(): string {
    return `$${parseFloat(this.balance.toString()).toFixed(2)}`;
  }

  /**
   * Add balance
   */
  public async addBalance(amount: number, reason?: string): Promise<void> {
    const newBalance = parseFloat(this.balance.toString()) + amount;
    await this.update({ balance: newBalance });
  }

  /**
   * Deduct balance (returns true if successful, false if insufficient funds)
   */
  public async deductBalance(amount: number, reason?: string): Promise<boolean> {
    const currentBalance = parseFloat(this.balance.toString());
    if (currentBalance < amount) {
      return false;
    }
    const newBalance = currentBalance - amount;
    await this.update({ balance: newBalance });
    return true;
  }

  /**
   * Ban user
   */
  public async ban(reason: string, bannedBy: number, until?: Date): Promise<void> {
    await this.update({
      isBanned: true,
      bannedAt: new Date(),
      banReason: reason,
      bannedById: bannedBy,
      status: UserStatus.BANNED,
    });
  }

  /**
   * Unban user
   */
  public async unban(): Promise<void> {
    await this.update({
      isBanned: false,
      bannedAt: undefined,
      banReason: undefined,
      bannedById: undefined,
      status: this.isAuthorized ? UserStatus.AUTHORIZED : UserStatus.PENDING,
    });
  }

  /**
   * Authorize user
   */
  public async authorize(): Promise<void> {
    await this.update({
      isAuthorized: true,
      status: this.isBanned ? UserStatus.BANNED : UserStatus.AUTHORIZED,
    });
  }

  /**
   * Update last login
   */
  public async updateLastLogin(): Promise<void> {
    await this.update({ lastActivity: new Date() });
  }

  /**
   * Get user status badge
   */
  public getStatusBadge(): string {
    const badges = {
      [UserStatus.PENDING]: '⏳ Pending',
      [UserStatus.AUTHORIZED]: '✅ Authorized',
      [UserStatus.SUSPENDED]: '⚠️ Suspended',
      [UserStatus.BANNED]: '🚫 Banned',
    };
    return badges[this.status] || '❓ Unknown';
  }

  /**
   * Get user role badge
   */
  public getRoleBadge(): string {
    const badges = {
      [UserRole.USER]: '👤 User',
      [UserRole.MODERATOR]: '👮 Moderator',
      [UserRole.ADMIN]: '👑 Admin',
      [UserRole.SUPER_ADMIN]: '⚡ Super Admin',
    };
    return badges[this.role] || '❓ Unknown';
  }
}
