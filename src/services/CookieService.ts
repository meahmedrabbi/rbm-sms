import { Cookie } from '../models/Cookie';
import { Logger } from '../utils/Logger';

/**
 * Service for managing authentication cookies
 */
export class CookieService {
  private logger = Logger.getInstance();

  /**
   * Save or update a cookie
   */
  public async saveCookie(name: string, value: string, domain: string = 'beta.full-sms.com', expiresAt?: Date): Promise<Cookie> {
    try {
      const [cookie, created] = await Cookie.findOrCreate({
        where: { name, domain },
        defaults: {
          name,
          value,
          domain,
          isActive: true,
          expiresAt,
        },
      });

      if (!created) {
        // Update existing cookie
        await cookie.update({
          value,
          isActive: true,
          expiresAt,
        });
      }

      this.logger.info(`Cookie ${created ? 'created' : 'updated'}: ${name} for ${domain}`);
      return cookie;
    } catch (error) {
      this.logger.error('Error saving cookie:', error);
      throw new Error('Failed to save cookie');
    }
  }

  /**
   * Get active cookie by name and domain
   */
  public async getCookie(name: string, domain: string = 'beta.full-sms.com'): Promise<Cookie | null> {
    try {
      const cookie = await Cookie.findOne({
        where: {
          name,
          domain,
          isActive: true,
        },
      });

      if (cookie && cookie.isExpired()) {
        await cookie.update({ isActive: false });
        this.logger.warn(`Cookie expired: ${name} for ${domain}`);
        return null;
      }

      return cookie;
    } catch (error) {
      this.logger.error('Error getting cookie:', error);
      return null;
    }
  }

  /**
   * Get all active cookies for a domain
   */
  public async getCookiesForDomain(domain: string = 'beta.full-sms.com'): Promise<Cookie[]> {
    try {
      const cookies = await Cookie.findAll({
        where: {
          domain,
          isActive: true,
        },
      });

      // Filter out expired cookies and deactivate them
      const activeCookies: Cookie[] = [];
      
      for (const cookie of cookies) {
        if (cookie.isExpired()) {
          await cookie.update({ isActive: false });
          this.logger.warn(`Cookie expired: ${cookie.name} for ${domain}`);
        } else {
          activeCookies.push(cookie);
        }
      }

      return activeCookies;
    } catch (error) {
      this.logger.error('Error getting cookies for domain:', error);
      return [];
    }
  }

  /**
   * Get formatted cookie string for HTTP requests
   */
  public async getCookieString(domain: string = 'beta.full-sms.com'): Promise<string> {
    const cookies = await this.getCookiesForDomain(domain);
    return cookies.map(cookie => cookie.getFormattedCookie()).join('; ');
  }

  /**
   * Parse and save cookies from HTTP response
   */
  public async saveCookiesFromString(cookieString: string, domain: string = 'beta.full-sms.com', expiresAt?: Date): Promise<Cookie[]> {
    const savedCookies: Cookie[] = [];
    
    try {
      // Split multiple cookies
      const cookieParts = cookieString.split(';');
      
      for (const part of cookieParts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        
        const [name, value] = trimmed.split('=', 2);
        if (name && value) {
          const cookie = await this.saveCookie(name.trim(), value.trim(), domain, expiresAt);
          savedCookies.push(cookie);
        }
      }
      
      this.logger.info(`Saved ${savedCookies.length} cookies for domain: ${domain}`);
      return savedCookies;
    } catch (error) {
      this.logger.error('Error parsing cookies:', error);
      return savedCookies;
    }
  }

  /**
   * Deactivate a cookie
   */
  public async deactivateCookie(name: string, domain: string = 'beta.full-sms.com'): Promise<boolean> {
    try {
      const result = await Cookie.update(
        { isActive: false },
        {
          where: {
            name,
            domain,
            isActive: true,
          },
        }
      );

      const updated = result[0] > 0;
      if (updated) {
        this.logger.info(`Cookie deactivated: ${name} for ${domain}`);
      }
      
      return updated;
    } catch (error) {
      this.logger.error('Error deactivating cookie:', error);
      return false;
    }
  }

  /**
   * Clean up expired cookies
   */
  public async cleanupExpiredCookies(): Promise<number> {
    try {
      const result = await Cookie.update(
        { isActive: false },
        {
          where: {
            isActive: true,
            expiresAt: {
              [require('sequelize').Op.lt]: new Date(),
            },
          },
        }
      );

      const count = result[0];
      if (count > 0) {
        this.logger.info(`Cleaned up ${count} expired cookies`);
      }
      
      return count;
    } catch (error) {
      this.logger.error('Error cleaning up expired cookies:', error);
      return 0;
    }
  }
}
