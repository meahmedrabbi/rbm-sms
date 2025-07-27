import { Logger } from '../utils/Logger';
import { EnhancedSmsService, SmsServer, SmsStatus, SmsRequest } from './EnhancedSmsService';

/**
 * SMS Service - Wrapper around EnhancedSmsService for backward compatibility
 */
export class SmsService {
  private logger = Logger.getInstance();
  private enhancedService = new EnhancedSmsService();

  /**
   * Request SMS for a phone number (defaults to Server 1 for compatibility)
   */
  public async requestSms(userId: number, phoneNumber: string, telegramMessageId?: number): Promise<SmsRequest> {
    return this.enhancedService.requestSms(userId, phoneNumber, SmsServer.SERVER_1, telegramMessageId);
  }

  /**
   * Request SMS with server selection
   */
  public async requestSmsWithServer(userId: number, phoneNumber: string, server: SmsServer, telegramMessageId?: number): Promise<SmsRequest> {
    return this.enhancedService.requestSms(userId, phoneNumber, server, telegramMessageId);
  }

  /**
   * Check SMS via API (defaults to Server 1 for compatibility)
   */
  public async checkSmsViaApi(phoneNumber: string): Promise<{ success: boolean; message: string; smsContent?: string; charged?: boolean }> {
    return this.enhancedService.checkSmsViaApi(phoneNumber, SmsServer.SERVER_1);
  }

  /**
   * Check SMS via API with server selection
   */
  public async checkSmsViaApiWithServer(phoneNumber: string, server: SmsServer): Promise<{ success: boolean; message: string; smsContent?: string; charged?: boolean }> {
    return this.enhancedService.checkSmsViaApi(phoneNumber, server);
  }

  /**
   * Save authentication cookies for API access
   */
  public async saveCookies(cookieString: string, expiresAt?: Date): Promise<void> {
    return this.enhancedService.saveCookies(cookieString, expiresAt);
  }

  /**
   * Get user active SMS requests
   */
  public async getUserActiveSmsRequests(userId: number): Promise<SmsRequest[]> {
    return this.enhancedService.getUserActiveSmsRequests(userId);
  }

  /**
   * Get SMS request summary
   */
  public getSmsRequestSummary(smsRequest: SmsRequest): string {
    return this.enhancedService.getSmsRequestSummary(smsRequest);
  }
}

// Re-export for backward compatibility
export { SmsServer, SmsStatus, SmsRequest };
