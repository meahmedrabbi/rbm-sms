/**
 * Phone number detection and validation utilities
 */
export class PhoneNumberDetector {
  
  // Common phone number patterns for different countries
  private static readonly PHONE_PATTERNS = [
    // US/Canada: +1-xxx-xxx-xxxx, 1-xxx-xxx-xxxx, (xxx) xxx-xxxx, xxx-xxx-xxxx
    /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
    
    // International: +xx-xxxxxxxxxx, +xxx-xxxxxxxxx
    /^(\+[1-9]\d{1,3}[-.\s]?)([0-9]{6,14})$/,
    
    // Generic patterns: 10-15 digits with optional country code
    /^(\+?[1-9]\d{0,3}[-.\s]?)?([0-9]{6,14})$/,
    
    // Bangladesh: +880-1xxxxxxxxx, 880-1xxxxxxxxx, 01xxxxxxxxx
    /^(\+?880[-.\s]?)?0?1[3-9]\d{8}$/,
    
    // India: +91-xxxxxxxxxx, 91-xxxxxxxxxx, xxxxxxxxxx
    /^(\+?91[-.\s]?)?[6-9]\d{9}$/,
    
    // UK: +44-xxxxxxxxxx, 44-xxxxxxxxxx, 0xxxxxxxxxx
    /^(\+?44[-.\s]?)?0?[1-9]\d{8,9}$/,
    
    // Simple numeric pattern: 10-15 digits
    /^\d{10,15}$/
  ];

  /**
   * Detect phone numbers in text message
   */
  public static detectPhoneNumbers(text: string): string[] {
    const phoneNumbers: string[] = [];
    const words = text.split(/\s+/);
    
    for (const word of words) {
      // Remove common separators and clean the word
      const cleanWord = word.replace(/[^\d+()-.\s]/g, '');
      
      // Check against all patterns
      for (const pattern of this.PHONE_PATTERNS) {
        if (pattern.test(cleanWord)) {
          const normalized = this.normalizePhoneNumber(cleanWord);
          if (normalized && !phoneNumbers.includes(normalized)) {
            phoneNumbers.push(normalized);
          }
          break; // Found a match, no need to check other patterns
        }
      }
    }
    
    return phoneNumbers;
  }

  /**
   * Normalize phone number to a standard format
   */
  public static normalizePhoneNumber(phoneNumber: string): string | null {
    // Remove all non-digit characters except +
    let clean = phoneNumber.replace(/[^\d+]/g, '');
    
    // Handle various formats
    if (clean.startsWith('+')) {
      return clean; // Already in international format
    }
    
    // Handle US/Canada numbers
    if (clean.length === 10 && clean.match(/^[2-9]\d{9}$/)) {
      return `+1${clean}`;
    }
    
    if (clean.length === 11 && clean.startsWith('1') && clean.match(/^1[2-9]\d{9}$/)) {
      return `+${clean}`;
    }
    
    // Handle Bangladesh numbers
    if (clean.length === 11 && clean.startsWith('01') && clean.match(/^01[3-9]\d{8}$/)) {
      return `+880${clean.substring(1)}`;
    }
    
    if (clean.length === 13 && clean.startsWith('880') && clean.match(/^8801[3-9]\d{8}$/)) {
      return `+${clean}`;
    }
    
    // Handle India numbers
    if (clean.length === 10 && clean.match(/^[6-9]\d{9}$/)) {
      return `+91${clean}`;
    }
    
    if (clean.length === 12 && clean.startsWith('91') && clean.match(/^91[6-9]\d{9}$/)) {
      return `+${clean}`;
    }
    
    // For other international numbers, add + if missing
    if (clean.length >= 10 && clean.length <= 15) {
      return clean.startsWith('+') ? clean : `+${clean}`;
    }
    
    return null;
  }

  /**
   * Validate if a string is a valid phone number
   */
  public static isValidPhoneNumber(phoneNumber: string): boolean {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    return normalized !== null && normalized.length >= 11 && normalized.length <= 16;
  }

  /**
   * Get country code from phone number
   */
  public static getCountryCode(phoneNumber: string): string | null {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    if (!normalized) return null;
    
    // Extract country code (1-4 digits after +)
    const match = normalized.match(/^\+(\d{1,4})/);
    return match ? match[1] : null;
  }

  /**
   * Format phone number for display
   */
  public static formatPhoneNumber(phoneNumber: string): string {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    if (!normalized) return phoneNumber;
    
    // Format common country codes
    if (normalized.startsWith('+1') && normalized.length === 12) {
      // US/Canada: +1 (xxx) xxx-xxxx
      const num = normalized.substring(2);
      return `+1 (${num.substring(0, 3)}) ${num.substring(3, 6)}-${num.substring(6)}`;
    }
    
    if (normalized.startsWith('+880') && normalized.length === 14) {
      // Bangladesh: +880 1xxx-xxxxxx
      const num = normalized.substring(4);
      return `+880 ${num.substring(0, 4)}-${num.substring(4)}`;
    }
    
    if (normalized.startsWith('+91') && normalized.length === 13) {
      // India: +91 xxxxx-xxxxx
      const num = normalized.substring(3);
      return `+91 ${num.substring(0, 5)}-${num.substring(5)}`;
    }
    
    // Default formatting
    return normalized;
  }
}
