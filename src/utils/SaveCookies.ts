import * as dotenv from 'dotenv';
import { CookieService } from '../services/CookieService';
import { DatabaseService } from '../services/DatabaseService';
import { Logger } from './Logger';

// Load environment variables
dotenv.config();

/**
 * Utility script to save cookies to the database
 */
export class SaveCookies {
  private cookieService = new CookieService();
  private logger = Logger.getInstance();

  /**
   * Save the provided cookie string to the database
   */
  public async saveCookieString(cookieString: string, domain: string = 'beta.full-sms.com'): Promise<void> {
    try {
      this.logger.info('Initializing database connection...');
      
      // Initialize database connection
      const dbService = DatabaseService.getInstance();
      await dbService.initialize();
      
      this.logger.info('Saving cookies to database...');
      
      // Save cookies using the CookieService
      const savedCookies = await this.cookieService.saveCookiesFromString(cookieString, domain);
      
      this.logger.info(`Successfully saved ${savedCookies.length} cookies:`);
      savedCookies.forEach(cookie => {
        this.logger.info(`- ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
      });
      
    } catch (error) {
      this.logger.error('Error saving cookies:', error);
      throw error;
    }
  }
}

/**
 * Main execution function for running as a script
 */
async function main() {
  const cookieString = "__Secure-next-auth.session-token=97da86af-8708-4a18-8da7-d68ce893860e; __Host-next-auth.csrf-token=f0c69950a94dd66d8653abb60a3ede5643b7349c8f2193193471b5ab4a2900a6%7C905446f509279a4386b93e7ca0a519df099e962b051f7bf28ec5ba285b7dcc3a; __Secure-next-auth.callback-url=https%3A%2F%2Fbeta.full-sms.com";
  const domain = "beta.full-sms.com";
  
  const saveCookies = new SaveCookies();
  
  try {
    await saveCookies.saveCookieString(cookieString, domain);
    console.log('✅ Cookies saved successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to save cookies:', error);
    process.exit(1);
  }
}

// Run the script if this file is executed directly
if (require.main === module) {
  main();
}
