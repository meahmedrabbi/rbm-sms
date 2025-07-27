import * as dotenv from 'dotenv';
import { CookieService } from '../services/CookieService';
import { DatabaseService } from '../services/DatabaseService';
import { Logger } from './Logger';

// Load environment variables
dotenv.config();

/**
 * Utility script to view saved cookies from the database
 */
async function viewCookies() {
  const cookieService = new CookieService();
  const logger = Logger.getInstance();

  try {
    logger.info('Initializing database connection...');
    
    // Initialize database connection
    const dbService = DatabaseService.getInstance();
    await dbService.initialize();
    
    logger.info('Retrieving cookies from database...');
    
    // Get all cookies for the domain
    const cookies = await cookieService.getCookiesForDomain('beta.full-sms.com');
    
    console.log('\n📋 Saved Cookies for beta.full-sms.com:');
    console.log('='.repeat(50));
    
    if (cookies.length === 0) {
      console.log('No cookies found.');
    } else {
      cookies.forEach((cookie, index) => {
        console.log(`${index + 1}. ${cookie.name}`);
        console.log(`   Value: ${cookie.value}`);
        console.log(`   Domain: ${cookie.domain}`);
        console.log(`   Active: ${cookie.isActive}`);
        console.log(`   Created: ${cookie.createdAt}`);
        console.log(`   Expires: ${cookie.expiresAt || 'No expiration'}`);
        console.log('');
      });
      
      // Show formatted cookie string
      const cookieString = await cookieService.getCookieString('beta.full-sms.com');
      console.log('🍪 Formatted Cookie String:');
      console.log(cookieString);
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('Error retrieving cookies:', error);
    process.exit(1);
  }
}

// Run the script
viewCookies();
