import { Logger } from '../utils/Logger';
import { UserService } from './UserService';
import { CookieService } from './CookieService';
import { MonitoringService } from './MonitoringService';

/**
 * SMS Server options
 */
export enum SmsServer {
  SERVER_1 = 'server1', // Fast process (mock for now)
  SERVER_2 = 'server2'  // Real API - long process
}

/**
 * SMS status enum
 */
export enum SmsStatus {
  PENDING = 'pending',
  RECEIVED = 'received',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

/**
 * SMS API Response interface
 */
interface SmsApiResponse {
  country: string;
  date: string;
  number: string;
  sender: string;
  text: string;
  valid: boolean;
}

/**
 * SMS request interface
 */
export interface SmsRequest {
  id?: number;
  userId: number;
  phoneNumber: string;
  server: SmsServer;
  serviceProvider?: string;
  status: SmsStatus;
  requestedAt: Date;
  receivedAt?: Date;
  smsContent?: string;
  expiresAt: Date;
  telegramMessageId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * SMS API Response with metadata
 */
interface SmsApiResult {
  content: string;
  count: number;
}

/**
 * Enhanced SMS Service with real API integration
 */
export class EnhancedSmsService {
  private logger = Logger.getInstance();
  private userService = new UserService();
  private cookieService = new CookieService();
  private monitoringService = MonitoringService.getInstance();
  
  // In-memory store for SMS requests (in real implementation, use database)
  private activeSmsRequests = new Map<string, SmsRequest>();
  
  // API Configuration
  private static readonly SMS_API_BASE_URL = 'https://beta.full-sms.com/api/edr_full_server';
  private static readonly SMS_DOMAIN = 'beta.full-sms.com';
  
  // Mock SMS providers for Server 1 (DISABLED - Inbound SMS not implemented)
  private static readonly SMS_PROVIDERS = [
    'server1-provider1.com',
    'server1-provider2.com', 
    'server1-provider3.com'
  ];

  /**
   * Request SMS for a phone number with server selection
   */
  public async requestSms(userId: number, phoneNumber: string, server: SmsServer, telegramMessageId?: number): Promise<SmsRequest> {
    try {
      this.logger.info(`SMS requested for user ${userId}, phone: ${phoneNumber}, server: ${server}`);
      
      // Check if Inbound SMS (SERVER_1) is being requested
      if (server === SmsServer.SERVER_1) {
        this.logger.warn(`Inbound SMS request denied for user ${userId} - feature not implemented`);
        throw new Error('Inbound SMS functionality is not implemented yet. Please use Outbound SMS.');
      }
      
      // Create SMS request
      const smsRequest: SmsRequest = {
        userId,
        phoneNumber,
        server,
        serviceProvider: 'beta.full-sms.com', // Only SERVER_2 is allowed now
        status: SmsStatus.PENDING,
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
        telegramMessageId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in memory for tracking
      this.activeSmsRequests.set(`${phoneNumber}-${server}`, smsRequest);
      
      return smsRequest;
      
    } catch (error) {
      this.logger.error('Error requesting SMS:', error);
      throw new Error('Failed to request SMS');
    }
  }

  /**
   * Check SMS via API with server selection
   */
  public async checkSmsViaApi(phoneNumber: string, server: SmsServer): Promise<{ success: boolean; message: string; smsContent?: string; charged?: boolean }> {
    try {
      this.logger.info(`Checking SMS via ${server} for ${phoneNumber}`);
      
      // Find the active request for this phone number and server
      const requestKey = `${phoneNumber}-${server}`;
      const smsRequest = this.activeSmsRequests.get(requestKey);
      
      if (!smsRequest) {
        return {
          success: false,
          message: `🚫 No active SMS request found for ${phoneNumber} on ${server}`
        };
      }

      // Check if request is expired
      if (smsRequest.expiresAt.getTime() < Date.now()) {
        this.logger.warn(`SMS request for ${phoneNumber} has expired`);
        smsRequest.status = SmsStatus.EXPIRED;
        this.activeSmsRequests.delete(requestKey);
        return {
          success: false,
          message: `⏰ SMS request for ${phoneNumber} has expired`
        };
      }

      let smsResult: SmsApiResult | null = null;

      if (server === SmsServer.SERVER_1) {
        // Inbound SMS functionality not implemented yet
        this.logger.info(`Inbound SMS request denied for ${phoneNumber} - feature not implemented`);
        return {
          success: false,
          message: '⚠️ Inbound SMS functionality is not implemented yet. Please use Outbound SMS.',
          charged: false
        };
      } else if (server === SmsServer.SERVER_2) {
        // Real API call
        smsResult = await this.fetchSmsFromRealApi(phoneNumber);
      }
      
      if (smsResult) {
        // SMS found! Process pay-on-delivery
        const balanceDeducted = await this.userService.deductBalance(
          smsRequest.userId, 
          0.50, 
          `SMS service for ${phoneNumber} (${server})`
        );

        if (!balanceDeducted) {
          return {
            success: false,
            message: `💰 SMS found but insufficient balance to complete payment. SMS: ${smsResult.content.substring(0, 50)}...`
          };
        }

        // Update request status
        smsRequest.status = SmsStatus.RECEIVED;
        smsRequest.smsContent = smsResult.content;
        smsRequest.receivedAt = new Date();
        smsRequest.updatedAt = new Date();

        // Send monitoring notification
        const user = await this.userService.getUserById(smsRequest.userId);
        await this.monitoringService.logSmsRetrieval({
          userId: smsRequest.userId,
          username: user?.username || 'Unknown',
          phoneNumber,
          server: server.toString(),
          smsCount: smsResult.count,
          userBalance: user?.getFormattedBalance() || '$0.00',
          timestamp: new Date()
        });

        // Remove from active requests
        this.activeSmsRequests.delete(requestKey);

        this.logger.info(`SMS retrieved and balance deducted for user ${smsRequest.userId} via ${server}`);
        return {
          success: true,
          message: `✨ SMS received via ${server.toUpperCase()} and $0.50 charged`,
          smsContent: smsResult.content,
          charged: true
        };

      } else {
        // No SMS found
        return {
          success: false,
          message: `⚠️ No SMS found for ${phoneNumber} on ${server.toUpperCase()}`,
          charged: false
        };
      }
      
    } catch (error) {
      this.logger.error('Error checking SMS via API:', error);
      return {
        success: false,
        message: '🚫 Error checking SMS. Please try again.'
      };
    }
  }

  /**
   * Fetch SMS from real API (Server 2)
   */
  private async fetchSmsFromRealApi(phoneNumber: string): Promise<SmsApiResult | null> {
    try {
      // Get stored cookies
      const cookieString = await this.cookieService.getCookieString(EnhancedSmsService.SMS_DOMAIN);
      
      if (!cookieString) {
        this.logger.error('No cookies found for SMS API. Please update cookies.');
        throw new Error('Authentication cookies not found. Please contact admin to update cookies.');
      }

      this.logger.info(`Fetching SMS from real API for ${phoneNumber}`);
      
      // Remove plus sign from phone number if present
      const cleanPhoneNumber = phoneNumber.replace(/^\+/, '');
      
      // Construct API URL with correct parameters
      const apiUrl = `${EnhancedSmsService.SMS_API_BASE_URL}?range=0&country=&number=${cleanPhoneNumber}`;
      
      // Make API request with cookies
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Cookie': cookieString,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://beta.full-sms.com/',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin'
        }
      });

      if (!response.ok) {
        this.logger.error(`API request failed: ${response.status} ${response.statusText}`);
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed. Cookies may be expired.');
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const responseData = await response.json();
      
      if (!Array.isArray(responseData)) {
        this.logger.error('Invalid API response format');
        return null;
      }

      const data = responseData as SmsApiResponse[];

      // Search for SMS matching the phone number
      const matchingSmsMessages = this.findAllMatchingSms(data, phoneNumber);
      
      if (matchingSmsMessages.length > 0) {
        this.logger.info(`${matchingSmsMessages.length} SMS found via real API for ${phoneNumber}`);
        return {
          content: this.formatMultipleSmsContent(matchingSmsMessages),
          count: matchingSmsMessages.length
        };
      } else {
        this.logger.info(`No matching SMS found via real API for ${phoneNumber}`);
        return null;
      }
      
    } catch (error) {
      this.logger.error('Error fetching SMS from real API:', error);
      if (error instanceof Error && error.message.includes('Authentication')) {
        throw error; // Re-throw authentication errors
      }
      return null;
    }
  }

  /**
   * Escape Markdown special characters in text
   */
  private escapeMarkdown(text: string): string {
    // Escape only the most problematic Markdown characters that break parsing
    return text.replace(/[*_\[\]`]/g, '\\$&');
  }

  /**
   * Format SMS content for display
   */
  private formatSmsContent(sms: SmsApiResponse): string {
    return `📱 **From:** ${this.escapeMarkdown(sms.sender)}\n` +
           `💬 **Message:** ${this.escapeMarkdown(sms.text)}\n` +
           `📅 **Received:** ${this.escapeMarkdown(sms.date)}\n` +
           `🌍 **Country:** ${this.escapeMarkdown(sms.country)}`;
  }

  /**
   * Format multiple SMS contents for display - shows only the last message to prevent MESSAGE_TOO_LONG error
   */
  private formatMultipleSmsContent(smsMessages: SmsApiResponse[]): string {
    if (smsMessages.length === 0) {
      return 'No SMS messages found.';
    }

    // Always show only the last (most recent) message to prevent Telegram MESSAGE_TOO_LONG error
    const lastMessage = smsMessages[0]; // Messages are already sorted by date descending
    
    let content = `**Latest SMS Message (${smsMessages.length} total found):**\n\n`;
    content += `**From:** ${this.escapeMarkdown(lastMessage.sender)}\n`;
    content += `**Message:** ${this.escapeMarkdown(lastMessage.text)}\n`;
    content += `**Received:** ${this.escapeMarkdown(lastMessage.date)}\n`;
    content += `**Country:** ${this.escapeMarkdown(lastMessage.country)}`;
    
    if (smsMessages.length > 1) {
      content += `\n\n**Note:** Showing latest of ${smsMessages.length} messages to prevent message length limit.`;
    }
    
    return content;
  }

  /**
   * Find all matching SMS messages in API response
   */
  private findAllMatchingSms(smsData: SmsApiResponse[], phoneNumber: string): SmsApiResponse[] {
    // Clean phone number for comparison - remove all non-digits
    const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, '');
    
    this.logger.info(`Searching for all SMS with cleaned phone number: ${cleanPhoneNumber} (original: ${phoneNumber})`);
    
    // Sort by date descending (most recent first)
    const sortedData = smsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    this.logger.info(`Checking ${sortedData.length} SMS records from API`);
    
    const matchingMessages: SmsApiResponse[] = [];
    
    // Search strategies for optimization
    const strategies = [
      // 1. Exact match (both numbers cleaned)
      (sms: SmsApiResponse) => {
        const smsNumber = sms.number.replace(/[^\d]/g, '');
        const match = smsNumber === cleanPhoneNumber;
        return match;
      },
      
      // 2. Match without leading country code variations
      (sms: SmsApiResponse) => {
        const smsNumber = sms.number.replace(/[^\d]/g, '');
        
        // Try different combinations - common country code patterns
        const variations = [
          smsNumber === cleanPhoneNumber.slice(1), // Remove leading digit from input
          smsNumber === cleanPhoneNumber.slice(2), // Remove 2 leading digits from input (like +1, +44)
          smsNumber === cleanPhoneNumber.slice(3), // Remove 3 leading digits from input
          cleanPhoneNumber === smsNumber.slice(1), // Remove leading digit from API number
          cleanPhoneNumber === smsNumber.slice(2), // Remove 2 leading digits from API number
          cleanPhoneNumber === smsNumber.slice(3), // Remove 3 leading digits from API number
        ];
        
        return variations.some(v => v);
      },
      
      // 3. Match last N digits (most significant for phone identification)
      (sms: SmsApiResponse) => {
        const smsNumber = sms.number.replace(/[^\d]/g, '');
        
        // Try matching last 8, 9, or 10 digits
        const digitCounts = [10, 9, 8, 7];
        
        for (const count of digitCounts) {
          if (smsNumber.length >= count && cleanPhoneNumber.length >= count) {
            const smsLast = smsNumber.slice(-count);
            const inputLast = cleanPhoneNumber.slice(-count);
            
            if (smsLast === inputLast) {
              return true;
            }
          }
        }
        
        return false;
      }
    ];

    // Apply strategies in order of precision and collect all matches
    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      const matches = sortedData.filter(strategy);
      
      // Add new matches to the result array (avoid duplicates)
      matches.forEach(match => {
        if (!matchingMessages.some(existing => 
          existing.number === match.number && 
          existing.date === match.date && 
          existing.text === match.text
        )) {
          matchingMessages.push(match);
          this.logger.info(`Match found using strategy ${i + 1}: ${match.number} -> ${match.text.substring(0, 50)}...`);
        }
      });
      
      // If we found matches with higher precision strategy, we can stop here
      if (matchingMessages.length > 0 && i < 2) {
        break;
      }
    }

    // Sort matches by date (most recent first)
    matchingMessages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (matchingMessages.length === 0) {
      this.logger.warn(`No SMS match found for ${phoneNumber} (cleaned: ${cleanPhoneNumber}) in ${sortedData.length} records`);
      
      // Debug: Log first few API numbers for debugging
      if (sortedData.length > 0) {
        this.logger.info(`Sample API numbers: ${sortedData.slice(0, 5).map(sms => `${sms.number} (cleaned: ${sms.number.replace(/[^\d]/g, '')})`).join(', ')}`);
      }
    }
    
    return matchingMessages;
  }

  /**
   * Find matching SMS in API response with time and efficiency optimization (kept for backward compatibility)
   */
  private findMatchingSms(smsData: SmsApiResponse[], phoneNumber: string): SmsApiResponse | null {
    // Clean phone number for comparison - remove all non-digits
    const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, '');
    
    this.logger.info(`Searching for SMS with cleaned phone number: ${cleanPhoneNumber} (original: ${phoneNumber})`);
    
    // Sort by date descending (most recent first) for efficiency
    const sortedData = smsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    this.logger.info(`Checking ${sortedData.length} SMS records from API`);
    
    // Search strategies for optimization
    const strategies = [
      // 1. Exact match (both numbers cleaned)
      (sms: SmsApiResponse) => {
        const smsNumber = sms.number.replace(/[^\d]/g, '');
        const match = smsNumber === cleanPhoneNumber;
        if (match) {
          this.logger.info(`Found exact match: API number ${smsNumber} matches input ${cleanPhoneNumber}`);
        }
        return match;
      },
      
      // 2. Match without leading country code variations
      (sms: SmsApiResponse) => {
        const smsNumber = sms.number.replace(/[^\d]/g, '');
        
        // Try different combinations - common country code patterns
        const variations = [
          smsNumber === cleanPhoneNumber.slice(1), // Remove leading digit from input
          smsNumber === cleanPhoneNumber.slice(2), // Remove 2 leading digits from input (like +1, +44)
          smsNumber === cleanPhoneNumber.slice(3), // Remove 3 leading digits from input
          cleanPhoneNumber === smsNumber.slice(1), // Remove leading digit from API number
          cleanPhoneNumber === smsNumber.slice(2), // Remove 2 leading digits from API number
          cleanPhoneNumber === smsNumber.slice(3), // Remove 3 leading digits from API number
        ];
        
        const match = variations.some(v => v);
        if (match) {
          this.logger.info(`Found country code variation match: API number ${smsNumber} matches input ${cleanPhoneNumber}`);
        }
        return match;
      },
      
      // 3. Match last N digits (most significant for phone identification)
      (sms: SmsApiResponse) => {
        const smsNumber = sms.number.replace(/[^\d]/g, '');
        
        // Try matching last 8, 9, or 10 digits
        const digitCounts = [10, 9, 8, 7];
        
        for (const count of digitCounts) {
          if (smsNumber.length >= count && cleanPhoneNumber.length >= count) {
            const smsLast = smsNumber.slice(-count);
            const inputLast = cleanPhoneNumber.slice(-count);
            
            if (smsLast === inputLast) {
              this.logger.info(`Found last ${count} digits match: API ${smsLast} matches input ${inputLast}`);
              return true;
            }
          }
        }
        
        return false;
      },
      
      // 4. Fuzzy match for similar numbers (as fallback)
      (sms: SmsApiResponse) => {
        const smsNumber = sms.number.replace(/[^\d]/g, '');
        const similarity = this.calculateSimilarity(cleanPhoneNumber, smsNumber);
        const match = similarity > 0.85; // 85% similarity threshold
        
        if (match) {
          this.logger.info(`Found fuzzy match: API number ${smsNumber} has ${(similarity * 100).toFixed(1)}% similarity with input ${cleanPhoneNumber}`);
        }
        
        return match;
      }
    ];

    // Apply strategies in order of precision
    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      const match = sortedData.find(strategy);
      if (match) {
        this.logger.info(`Match found using strategy ${i + 1}: ${match.number} -> ${match.text.substring(0, 50)}...`);
        return match;
      }
    }

    this.logger.warn(`No SMS match found for ${phoneNumber} (cleaned: ${cleanPhoneNumber}) in ${sortedData.length} records`);
    
    // Debug: Log first few API numbers for debugging
    if (sortedData.length > 0) {
      this.logger.info(`Sample API numbers: ${sortedData.slice(0, 5).map(sms => `${sms.number} (cleaned: ${sms.number.replace(/[^\d]/g, '')})`).join(', ')}`);
    }
    
    return null;
  }

  /**
   * Calculate similarity between two phone numbers
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    let matches = 0;
    const minLength = Math.min(str1.length, str2.length);
    
    // Compare from the end (more important digits)
    for (let i = 0; i < minLength; i++) {
      if (str1[str1.length - 1 - i] === str2[str2.length - 1 - i]) {
        matches++;
      }
    }
    
    return matches / maxLength;
  }

  /**
   * Mock SMS provider for Server 1 (fast process) - DISABLED
   * This functionality has been removed as Inbound SMS is not implemented yet
   */
  /*
  private async mockSmsProvider(phoneNumber: string): Promise<string | null> {
    try {
      // Simulate 50% chance of having SMS for demo
      const hasSms = Math.random() > 0.5;
      
      if (hasSms) {
        const mockSmsContent = `Your verification code is: ${Math.floor(100000 + Math.random() * 900000)}. This code will expire in 10 minutes.`;
        this.logger.info(`Mock SMS found for ${phoneNumber} via Server 1`);
        return mockSmsContent;
      } else {
        this.logger.info(`Mock SMS: No SMS found for ${phoneNumber} via Server 1`);
        return null;
      }
      
    } catch (error) {
      this.logger.error('Error in mock SMS provider:', error);
      return null;
    }
  }
  */

  /**
   * Save authentication cookies for API access
   */
  public async saveCookies(cookieString: string, expiresAt?: Date): Promise<void> {
    try {
      await this.cookieService.saveCookiesFromString(cookieString, EnhancedSmsService.SMS_DOMAIN, expiresAt);
      this.logger.info('SMS API cookies saved successfully');
    } catch (error) {
      this.logger.error('Error saving SMS API cookies:', error);
      throw new Error('Failed to save authentication cookies');
    }
  }

  /**
   * Get active SMS requests for user
   */
  public async getUserActiveSmsRequests(userId: number): Promise<SmsRequest[]> {
    try {
      // Filter active requests for this user from in-memory store
      const activeRequests: SmsRequest[] = [];
      const now = new Date();
      
      for (const [key, request] of this.activeSmsRequests.entries()) {
        if (request.userId === userId && 
            request.status === SmsStatus.PENDING && 
            request.expiresAt.getTime() > now.getTime()) {
          activeRequests.push(request);
        }
      }
      
      return activeRequests;
      
    } catch (error) {
      this.logger.error('Error getting user SMS requests:', error);
      return [];
    }
  }

  /**
   * Get random provider for mock service
   */
  private getRandomProvider(): string {
    return EnhancedSmsService.SMS_PROVIDERS[Math.floor(Math.random() * EnhancedSmsService.SMS_PROVIDERS.length)];
  }

  /**
   * Get SMS request summary
   */
  public getSmsRequestSummary(smsRequest: SmsRequest): string {
    const status = smsRequest.status.toUpperCase();
    const timeAgo = this.getTimeAgo(smsRequest.requestedAt);
    
    let summary = `📱 SMS Request Summary:\n\n`;
    summary += `• Phone: ${smsRequest.phoneNumber}\n`;
    summary += `• Server: ${smsRequest.server.toUpperCase()}\n`;
    summary += `• Status: ${this.getStatusEmoji(smsRequest.status)} ${status}\n`;
    summary += `• Provider: ${smsRequest.serviceProvider}\n`;
    summary += `• Requested: ${timeAgo}\n`;
    
    if (smsRequest.status === SmsStatus.RECEIVED && smsRequest.smsContent) {
      summary += `• Received: ${this.getTimeAgo(smsRequest.receivedAt!)}\n`;
      summary += `\n📨 SMS Content:\n${smsRequest.smsContent}`;
    } else if (smsRequest.status === SmsStatus.PENDING) {
      const timeLeft = Math.max(0, smsRequest.expiresAt.getTime() - Date.now());
      const minutesLeft = Math.floor(timeLeft / 60000);
      summary += `• Expires in: ${minutesLeft} minutes\n`;
    }
    
    return summary;
  }

  /**
   * Get status emoji
   */
  private getStatusEmoji(status: SmsStatus): string {
    switch (status) {
      case SmsStatus.PENDING: return '⏳';
      case SmsStatus.RECEIVED: return '✅';
      case SmsStatus.EXPIRED: return '⏰';
      case SmsStatus.CANCELLED: return '❌';
      default: return '❓';
    }
  }

  /**
   * Get time ago string
   */
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
}

// Interfaces and enums are already exported above
