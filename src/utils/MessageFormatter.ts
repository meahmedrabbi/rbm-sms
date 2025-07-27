import { MessageType } from '../models/Message';
import { SmsServer, SmsStatus, SmsRequest } from '../services/EnhancedSmsService';
import { PhoneNumberDetector } from '../services/PhoneNumberDetector';

/**
 * Modern message formatter for elegant and clean bot messages
 */
export class MessageFormatter {
  
  // ═══════════════════════════════════════════════════════════════
  // 🎨 DESIGN CONSTANTS
  // ═══════════════════════════════════════════════════════════════
  
  private static readonly ICONS = {
    // Status icons
    success: '✨',
    error: '🚫',
    warning: '⚠️',
    info: 'ℹ️',
    loading: '⏳',
    
    // Feature icons
    phone: '📱',
    message: '💬',
    server: '🖥️',
    balance: '💎',
    time: '⏰',
    provider: '🌐',
    content: '📄',
    
    // Action icons
    refresh: '🔄',
    back: '↩️',
    cancel: '❌',
    check: '✅',
    
    // Server icons
    fast: '⚡',
    real: '🔗'
  };

  private static readonly SEPARATORS = {
    main: '━━━━━━━━━━━━━━━━━━━━━',
    sub: '───────────────────',
    dot: '• ',
    arrow: '→ '
  };

  // ═══════════════════════════════════════════════════════════════
  // 📱 PHONE NUMBER & SMS MESSAGES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Format phone number selection message
   */
  public static formatPhoneSelection(phoneNumber: string): { text: string; keyboard: any } {
    const formatted = PhoneNumberDetector.formatPhoneNumber(phoneNumber);
    
    const text = `${this.ICONS.phone} **SMS Request**\n` +
      `${this.SEPARATORS.main}\n\n` +
      `**Phone Number:** \`${formatted}\`\n\n` +
      `**Choose your preferred server:**\n\n` +
      `${this.ICONS.fast} **Fast Server** - Instant mock responses\n` +
      `${this.ICONS.real} **Real API** - Live SMS retrieval\n\n` +
      `${this.SEPARATORS.sub}`;
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: `${this.ICONS.fast} Fast Server`, callback_data: `sms_server1_${phoneNumber}` },
          { text: `${this.ICONS.real} Real API`, callback_data: `sms_server2_${phoneNumber}` }
        ],
        [
          { text: `${this.ICONS.cancel} Cancel`, callback_data: 'sms_cancel' }
        ]
      ]
    };

    return { text, keyboard };
  }

  /**
   * Format SMS processing message
   */
  public static formatSmsProcessing(phoneNumber: string, server: SmsServer): string {
    const formatted = PhoneNumberDetector.formatPhoneNumber(phoneNumber);
    const serverName = server === SmsServer.SERVER_1 ? 'Fast Server' : 'Real API';
    const serverIcon = server === SmsServer.SERVER_1 ? this.ICONS.fast : this.ICONS.real;
    
    return `${this.ICONS.loading} **Processing SMS Request**\n` +
      `${this.SEPARATORS.main}\n\n` +
      `${this.ICONS.phone} **Phone:** \`${formatted}\`\n` +
      `${serverIcon} **Server:** ${serverName}\n\n` +
      `**Status:** Checking for SMS messages...\n\n` +
      `${this.SEPARATORS.sub}`;
  }

  /**
   * Format SMS results message
   */
  public static formatSmsResults(
    phoneNumber: string, 
    server: SmsServer, 
    result: { success: boolean; message: string; smsContent?: string; charged?: boolean },
    userBalance?: string
  ): { text: string; keyboard: any } {
    const formatted = PhoneNumberDetector.formatPhoneNumber(phoneNumber);
    const serverName = server === SmsServer.SERVER_1 ? 'Fast Server' : 'Real API';
    const serverIcon = server === SmsServer.SERVER_1 ? this.ICONS.fast : this.ICONS.real;
    const statusIcon = result.success ? this.ICONS.success : this.ICONS.warning;
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    let text = `${statusIcon} **SMS Results**\n` +
      `${this.SEPARATORS.main}\n\n` +
      `${this.ICONS.phone} **Phone:** \`${formatted}\`\n` +
      `${serverIcon} **Server:** ${serverName}\n\n`;

    if (result.success && result.smsContent) {
      text += `${this.ICONS.check} **Status:** SMS Found!\n\n` +
        `${this.ICONS.content} **Message Content:**\n` +
        `${result.smsContent}\n\n` +
        `${this.ICONS.balance} **Charge:** $0.50`;
      
      if (userBalance) {
        text += `\n${this.ICONS.balance} **Balance:** ${userBalance}`;
      }
    } else {
      text += `${this.ICONS.warning} **Status:** ${result.message.replace(/^[❌⏰📭]/g, '').trim()}\n\n` +
        `${this.ICONS.info} **Note:** No charges applied`;
    }

    text += `\n\n${this.SEPARATORS.sub}\n` +
      `${this.ICONS.time} **Updated:** ${timestamp}`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: `${this.ICONS.refresh} Refresh`, callback_data: `sms_refresh_${server}_${phoneNumber}` },
          { text: `${this.ICONS.back} Back`, callback_data: `sms_back_${phoneNumber}` }
        ]
      ]
    };

    return { text, keyboard };
  }

  /**
   * Format multiple phone numbers detected message
   */
  public static formatMultiplePhoneNumbers(phoneNumbers: string[]): string {
    let text = `${this.ICONS.phone} **Multiple Phone Numbers Detected**\n` +
      `${this.SEPARATORS.main}\n\n` +
      `**Found ${phoneNumbers.length} numbers:**\n\n`;

    phoneNumbers.forEach((phone, index) => {
      const formatted = PhoneNumberDetector.formatPhoneNumber(phone);
      text += `**${index + 1}.** \`${formatted}\`\n`;
    });

    text += `\n${this.SEPARATORS.sub}\n` +
      `${this.ICONS.info} **Please send one phone number at a time**`;

    return text;
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔐 AUTHORIZATION MESSAGES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Format unauthorized access message
   */
  public static formatUnauthorized(isBanned: boolean, adminContact: string): string {
    if (isBanned) {
      return `${this.ICONS.error} **Account Banned**\n` +
        `${this.SEPARATORS.main}\n\n` +
        `Your account has been suspended from using SMS services.\n\n` +
        `${this.ICONS.info} **Contact Admin:** ${adminContact}\n\n` +
        `${this.SEPARATORS.sub}`;
    } else {
      return `${this.ICONS.warning} **Access Required**\n` +
        `${this.SEPARATORS.main}\n\n` +
        `You need authorization to access SMS services.\n\n` +
        `${this.ICONS.info} **Contact Admin:** ${adminContact}\n\n` +
        `${this.SEPARATORS.sub}`;
    }
  }

  /**
   * Format insufficient balance message
   */
  public static formatInsufficientBalance(required: string, adminContact: string): string {
    return `${this.ICONS.balance} **Insufficient Balance**\n` +
      `${this.SEPARATORS.main}\n\n` +
      `**Required:** ${required}\n\n` +
      `${this.ICONS.info} **Contact Admin:** ${adminContact}\n\n` +
      `${this.SEPARATORS.sub}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // 📋 COMMAND HELP & STATUS MESSAGES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Format SMS command help message
   */
  public static formatSmsHelp(): string {
    return `${this.ICONS.phone} **SMS Retrieval Service**\n` +
      `${this.SEPARATORS.main}\n\n` +
      `**Usage:** \`/sms <phone_number>\`\n\n` +
      `**Examples:**\n` +
      `${this.SEPARATORS.dot}\`/sms +1234567890\`\n` +
      `${this.SEPARATORS.dot}\`/sms 01712345678\` (Bangladesh)\n` +
      `${this.SEPARATORS.dot}\`/sms +8801712345678\`\n\n` +
      `**Features:**\n` +
      `${this.ICONS.fast} Instant processing\n` +
      `${this.ICONS.phone} Auto phone detection\n` +
      `${this.ICONS.time} 10-minute expiry\n` +
      `${this.ICONS.balance} $0.50 per request\n\n` +
      `**Quick Access:**\n` +
      `${this.SEPARATORS.dot}Send phone number directly in chat\n` +
      `${this.SEPARATORS.dot}Use \`/mysms\` to check active requests\n\n` +
      `${this.SEPARATORS.sub}`;
  }

  /**
   * Format SMS request initiated message
   */
  public static formatSmsInitiated(smsRequest: SmsRequest): string {
    const formatted = PhoneNumberDetector.formatPhoneNumber(smsRequest.phoneNumber);
    const serverIcon = smsRequest.server === SmsServer.SERVER_1 ? this.ICONS.fast : this.ICONS.real;
    const expiryMinutes = Math.floor((smsRequest.expiresAt.getTime() - Date.now()) / 60000);

    return `${this.ICONS.success} **SMS Request Initiated**\n` +
      `${this.SEPARATORS.main}\n\n` +
      `${this.ICONS.phone} **Phone:** \`${formatted}\`\n` +
      `${serverIcon} **Server:** ${smsRequest.server.toUpperCase()}\n` +
      `${this.ICONS.provider} **Provider:** ${smsRequest.serviceProvider}\n` +
      `${this.ICONS.time} **Expires:** ${expiryMinutes} minutes\n` +
      `${this.ICONS.balance} **Cost:** $0.50\n\n` +
      `${this.ICONS.loading} **Status:** Waiting for SMS...\n\n` +
      `SMS will arrive automatically (30-120 seconds)\n\n` +
      `**Quick Commands:**\n` +
      `${this.SEPARATORS.dot}\`/mysms\` - Check active requests\n` +
      `${this.SEPARATORS.dot}Send another number for new request\n\n` +
      `${this.SEPARATORS.sub}`;
  }

  /**
   * Format user SMS requests list
   */
  public static formatUserSmsRequests(requests: SmsRequest[]): string {
    if (requests.length === 0) {
      return `${this.ICONS.phone} **Your SMS Requests**\n` +
        `${this.SEPARATORS.main}\n\n` +
        `**No active requests found**\n\n` +
        `**Start a new request:**\n` +
        `${this.SEPARATORS.dot}Send a phone number in chat\n` +
        `${this.SEPARATORS.dot}Use \`/sms <phone_number>\`\n\n` +
        `**Examples:**\n` +
        `${this.SEPARATORS.dot}\`/sms +1234567890\`\n` +
        `${this.SEPARATORS.dot}Just type: \`+1234567890\`\n\n` +
        `${this.SEPARATORS.sub}`;
    }

    let text = `${this.ICONS.phone} **Your Active SMS Requests**\n` +
      `${this.SEPARATORS.main}\n\n`;

    requests.forEach((request, index) => {
      const timeLeft = Math.max(0, request.expiresAt.getTime() - Date.now());
      const minutesLeft = Math.floor(timeLeft / 60000);
      const statusIcon = this.getStatusIcon(request.status);
      const serverIcon = request.server === SmsServer.SERVER_1 ? this.ICONS.fast : this.ICONS.real;

      text += `**${index + 1}.** \`${request.phoneNumber}\`\n` +
        `   ${statusIcon} **Status:** ${request.status.toUpperCase()}\n` +
        `   ${serverIcon} **Server:** ${request.server.toUpperCase()}\n` +
        `   ${this.ICONS.provider} **Provider:** ${request.serviceProvider}\n` +
        `   ${this.ICONS.time} **Expires:** ${minutesLeft} minutes\n\n`;
    });

    text += `${this.SEPARATORS.sub}\n` +
      `${this.ICONS.info} SMS usually arrives within 30-120 seconds`;

    return text;
  }

  // ═══════════════════════════════════════════════════════════════
  // 📨 MEDIA & GENERAL MESSAGES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Format media received message
   */
  public static formatMediaReceived(type: MessageType): string {
    const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
    return `${this.ICONS.success} **${typeCapitalized} Received**\n` +
      `${this.SEPARATORS.main}\n\n` +
      `Your ${type} has been saved successfully.\n\n` +
      `${this.ICONS.phone} **Next:** Send a phone number to check SMS\n\n` +
      `${this.SEPARATORS.sub}`;
  }

  /**
   * Format general message received
   */
  public static formatMessageReceived(): string {
    return `${this.ICONS.success} **Message Received**\n` +
      `${this.SEPARATORS.main}\n\n` +
      `${this.ICONS.phone} **Send a phone number to check SMS**\n\n` +
      `**Examples:**\n` +
      `${this.SEPARATORS.dot}\`+1234567890\`\n` +
      `${this.SEPARATORS.dot}\`01712345678\`\n\n` +
      `${this.SEPARATORS.sub}`;
  }

  /**
   * Format SMS cancelled message
   */
  public static formatSmsCancelled(): string {
    return `${this.ICONS.cancel} **SMS Check Cancelled**\n` +
      `${this.SEPARATORS.main}\n\n` +
      `Request has been cancelled successfully.\n\n` +
      `${this.ICONS.phone} **Send another phone number to start new request**\n\n` +
      `${this.SEPARATORS.sub}`;
  }

  /**
   * Format error message
   */
  public static formatError(message: string): string {
    return `${this.ICONS.error} **Error**\n` +
      `${this.SEPARATORS.main}\n\n` +
      `${message}\n\n` +
      `${this.ICONS.info} **Please try again or contact support**\n\n` +
      `${this.SEPARATORS.sub}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // 🛠️ UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get status icon for SMS request status
   */
  private static getStatusIcon(status: SmsStatus): string {
    switch (status) {
      case SmsStatus.PENDING: return this.ICONS.loading;
      case SmsStatus.RECEIVED: return this.ICONS.success;
      case SmsStatus.EXPIRED: return this.ICONS.time;
      case SmsStatus.CANCELLED: return this.ICONS.cancel;
      default: return this.ICONS.info;
    }
  }

  /**
   * Format time ago string
   */
  public static formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Format phone number with country flag (if available)
   */
  public static formatPhoneWithFlag(phoneNumber: string): string {
    const formatted = PhoneNumberDetector.formatPhoneNumber(phoneNumber);
    // Add country flags based on country code if needed
    return formatted;
  }
}
