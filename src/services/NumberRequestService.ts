import fetch from 'node-fetch';
import { Logger } from '../utils/Logger';
import { CookieService } from './CookieService';

/**
 * Country/Destination interface for number requests
 */
export interface CountryDestination {
  id: string;
  country: string;
  network: string;
}

/**
 * Number range interface from API
 */
export interface NumberRange {
  numberRange: string;
  total: number;
  expiredAt: string;
}

/**
 * Individual phone number interface
 */
export interface PhoneNumber {
  id: string;
  number: string;
  range: string;
  isAvailable: boolean;
  expiresAt: Date;
}

/**
 * Number assignment interface
 */
export interface NumberAssignment {
  phoneNumber: string;
  numberRange: string;
  expiresAt: Date;
}

/**
 * Number request interface
 */
export interface NumberRequest {
  id?: number;
  userId: number;
  countryId: string;
  countryName: string;
  network: string;
  status: NumberRequestStatus;
  phoneNumber?: string;
  requestedAt: Date;
  expiresAt: Date;
  telegramMessageId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Number request status enum
 */
export enum NumberRequestStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

/**
 * Service for managing phone number requests from different countries
 */
export class NumberRequestService {
  private logger = Logger.getInstance();
  private cookieService = new CookieService();
  
  // API Configuration
  private static readonly API_BASE_URL = 'https://beta.full-sms.com/api';
  private static readonly SMS_DOMAIN = 'beta.full-sms.com';
  
  // In-memory store for number requests (in real implementation, use database)
  private activeNumberRequests = new Map<string, NumberRequest>();
  
  // Cache for countries to avoid repeated API calls
  private countriesCache: CountryDestination[] | null = null;
  private cacheExpiry: Date | null = null;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Fetch available countries/destinations from the API
   */
  public async getAvailableCountries(useCache: boolean = true): Promise<CountryDestination[]> {
    try {
      // Check cache first
      if (useCache && this.countriesCache && this.cacheExpiry && new Date() < this.cacheExpiry) {
        this.logger.info(`Returning cached countries: ${this.countriesCache.length} entries`);
        return this.countriesCache;
      }

      this.logger.info('Fetching available countries from API...');
      
      // Get authentication cookies
      const cookieString = await this.cookieService.getCookieString(NumberRequestService.SMS_DOMAIN);
      
      if (!cookieString) {
        throw new Error('Authentication required: No valid cookies found. Please save authentication cookies first.');
      }

      // Make API request
      const response = await fetch(`${NumberRequestService.API_BASE_URL}/did/destinations`, {
        method: 'GET',
        headers: {
          'Cookie': cookieString,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Referer': 'https://beta.full-sms.com/',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin'
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed: Please update your authentication cookies');
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid API response format: Expected array');
      }

      const countries = data as CountryDestination[];
      
      // Sort alphabetically by country name
      const sortedCountries = countries.sort((a, b) => a.country.localeCompare(b.country));
      
      // Update cache
      this.countriesCache = sortedCountries;
      this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION);
      
      this.logger.info(`Successfully fetched and cached ${sortedCountries.length} countries`);
      return sortedCountries;
      
    } catch (error) {
      this.logger.error('Error fetching available countries:', error);
      throw error;
    }
  }

  /**
   * Get countries formatted for display (with pagination support)
   */
  public async getCountriesForDisplay(page: number = 1, itemsPerPage: number = 16): Promise<{
    countries: CountryDestination[];
    totalPages: number;
    currentPage: number;
    totalCount: number;
  }> {
    try {
      const allCountries = await this.getAvailableCountries();
      const totalCount = allCountries.length;
      const totalPages = Math.ceil(totalCount / itemsPerPage);
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const countries = allCountries.slice(startIndex, endIndex);

      return {
        countries,
        totalPages,
        currentPage: page,
        totalCount
      };
    } catch (error) {
      this.logger.error('Error getting countries for display:', error);
      throw error;
    }
  }

  /**
   * Search countries by name
   */
  public async searchCountries(searchTerm: string): Promise<CountryDestination[]> {
    try {
      const allCountries = await this.getAvailableCountries();
      const searchLower = searchTerm.toLowerCase();
      
      return allCountries.filter(country => 
        country.country.toLowerCase().includes(searchLower) ||
        country.network.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      this.logger.error('Error searching countries:', error);
      throw error;
    }
  }

  /**
   * Get country by ID
   */
  public async getCountryById(countryId: string): Promise<CountryDestination | null> {
    try {
      const allCountries = await this.getAvailableCountries();
      return allCountries.find(country => country.id === countryId) || null;
    } catch (error) {
      this.logger.error('Error getting country by ID:', error);
      return null;
    }
  }

  /**
   * Request a phone number from a specific country
   */
  public async requestPhoneNumber(
    userId: number, 
    countryId: string, 
    telegramMessageId?: number
  ): Promise<NumberRequest> {
    try {
      // Get country details
      const country = await this.getCountryById(countryId);
      if (!country) {
        throw new Error('Country not found or not available');
      }

      this.logger.info(`Phone number requested for user ${userId}, country: ${country.country}`);
      
      // Create number request
      const numberRequest: NumberRequest = {
        userId,
        countryId: country.id,
        countryName: country.country,
        network: country.network,
        status: NumberRequestStatus.PENDING,
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes expiry
        telegramMessageId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in memory for tracking
      this.activeNumberRequests.set(`${userId}-${countryId}`, numberRequest);
      
      // TODO: Make API call to actually request the phone number
      // For now, we'll simulate the request
      
      return numberRequest;
      
    } catch (error) {
      this.logger.error('Error requesting phone number:', error);
      throw error;
    }
  }

  /**
   * Get user's active number requests
   */
  public async getUserActiveNumberRequests(userId: number): Promise<NumberRequest[]> {
    try {
      const activeRequests: NumberRequest[] = [];
      const now = new Date();
      
      for (const [key, request] of this.activeNumberRequests.entries()) {
        if (request.userId === userId && 
            request.status === NumberRequestStatus.PENDING && 
            request.expiresAt.getTime() > now.getTime()) {
          activeRequests.push(request);
        }
      }
      
      return activeRequests;
      
    } catch (error) {
      this.logger.error('Error getting user number requests:', error);
      return [];
    }
  }

  /**
   * Cancel a number request
   */
  public async cancelNumberRequest(userId: number, countryId: string): Promise<boolean> {
    try {
      const key = `${userId}-${countryId}`;
      const request = this.activeNumberRequests.get(key);
      
      if (request && request.status === NumberRequestStatus.PENDING) {
        request.status = NumberRequestStatus.CANCELLED;
        request.updatedAt = new Date();
        
        this.logger.info(`Number request cancelled for user ${userId}, country: ${request.countryName}`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('Error cancelling number request:', error);
      return false;
    }
  }

  /**
   * Clear expired requests
   */
  public async cleanupExpiredRequests(): Promise<number> {
    try {
      const now = new Date();
      let cleanedCount = 0;
      
      for (const [key, request] of this.activeNumberRequests.entries()) {
        if (request.expiresAt.getTime() <= now.getTime()) {
          request.status = NumberRequestStatus.EXPIRED;
          request.updatedAt = now;
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        this.logger.info(`Cleaned up ${cleanedCount} expired number requests`);
      }
      
      return cleanedCount;
    } catch (error) {
      this.logger.error('Error cleaning up expired requests:', error);
      return 0;
    }
  }

  /**
   * Clear countries cache (force refresh)
   */
  public clearCache(): void {
    this.countriesCache = null;
    this.cacheExpiry = null;
    this.logger.info('Countries cache cleared');
  }

  /**
   * Get cache status
   */
  public getCacheStatus(): { cached: boolean; count: number; expiresAt: Date | null } {
    return {
      cached: this.countriesCache !== null && this.cacheExpiry !== null && new Date() < this.cacheExpiry,
      count: this.countriesCache?.length || 0,
      expiresAt: this.cacheExpiry
    };
  }

  /**
   * Get available number ranges for a destination
   */
  public async getNumberRanges(destinationId: string): Promise<NumberRange[]> {
    try {
      this.logger.info(`Fetching number ranges for destination: ${destinationId}`);

      // Get authentication cookies
      const cookieString = await this.cookieService.getCookieString();
      if (!cookieString) {
        throw new Error('No authentication cookies available');
      }

      // Make API request to get number ranges
      const response = await fetch(`${NumberRequestService.API_BASE_URL}/did/get_range`, {
        method: 'POST',
        headers: {
          'Cookie': cookieString,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Content-Type': 'application/json',
          'Referer': 'https://beta.full-sms.com/',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin'
        },
        body: JSON.stringify({
          destinationId: destinationId
        })
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed: Please update your authentication cookies');
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid API response format: Expected array');
      }

      const numberRanges = data as NumberRange[];
      
      // Filter out expired ranges
      const validRanges = numberRanges.filter(range => {
        const expiryDate = new Date(range.expiredAt);
        return expiryDate > new Date();
      });

      this.logger.info(`Found ${validRanges.length} valid number ranges (${numberRanges.length} total)`);
      return validRanges;
      
    } catch (error) {
      this.logger.error('Error fetching number ranges:', error);
      throw error;
    }
  }

  /**
   * Get all available phone numbers from ranges for a destination
   */
  public async getAvailablePhoneNumbers(destinationId: string): Promise<PhoneNumber[]> {
    try {
      this.logger.info(`Fetching available phone numbers for destination: ${destinationId}`);

      // Get all number ranges first
      const numberRanges = await this.getNumberRanges(destinationId);
      
      if (numberRanges.length === 0) {
        this.logger.warn(`No available number ranges for destination: ${destinationId}`);
        return [];
      }

      const allNumbers: PhoneNumber[] = [];

      // Generate all possible numbers from each range
      for (const range of numberRanges) {
        const baseNumber = range.numberRange;
        const expiresAt = new Date(range.expiredAt);
        
        // Generate numbers based on total count
        // For example, if range is "14415054" with total 20, generate 20 numbers
        for (let i = 0; i < range.total; i++) {
          const suffix = i.toString().padStart(2, '0');
          const fullNumber = `+1${baseNumber}${suffix}`;
          
          const phoneNumber: PhoneNumber = {
            id: `${baseNumber}_${suffix}`,
            number: fullNumber,
            range: baseNumber,
            isAvailable: true, // Assume available unless we check specific status
            expiresAt: expiresAt
          };
          
          allNumbers.push(phoneNumber);
        }
      }

      this.logger.info(`Generated ${allNumbers.length} phone numbers from ${numberRanges.length} ranges`);
      return allNumbers;
      
    } catch (error) {
      this.logger.error('Error fetching available phone numbers:', error);
      throw error;
    }
  }

  /**
   * Get available phone numbers with pagination for display
   */
  public async getPhoneNumbersForDisplay(destinationId: string, page: number = 1, itemsPerPage: number = 16): Promise<{
    numbers: PhoneNumber[];
    ranges: NumberRange[];
    totalNumbers: number;
    totalRanges: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const [allNumbers, ranges] = await Promise.all([
        this.getAvailablePhoneNumbers(destinationId),
        this.getNumberRanges(destinationId)
      ]);

      const totalNumbers = allNumbers.length;
      const totalPages = Math.ceil(totalNumbers / itemsPerPage);
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const numbers = allNumbers.slice(startIndex, endIndex);

      return {
        numbers,
        ranges,
        totalNumbers,
        totalRanges: ranges.length,
        totalPages,
        currentPage: page
      };
      
    } catch (error) {
      this.logger.error('Error getting phone numbers for display:', error);
      throw error;
    }
  }

  /**
   * Assign a phone number from available ranges
   */
  public async assignPhoneNumber(destinationId: string): Promise<NumberAssignment | null> {
    try {
      this.logger.info(`Attempting to assign phone number for destination: ${destinationId}`);

      // Get available number ranges
      const numberRanges = await this.getNumberRanges(destinationId);
      
      if (numberRanges.length === 0) {
        this.logger.warn(`No available number ranges for destination: ${destinationId}`);
        return null;
      }

      // Sort by expiration date (longest expiry first) and by available count
      const sortedRanges = numberRanges.sort((a, b) => {
        const expiryDiff = new Date(b.expiredAt).getTime() - new Date(a.expiredAt).getTime();
        if (expiryDiff !== 0) return expiryDiff;
        return b.total - a.total; // More available numbers first
      });

      // Try to assign from the best range
      const selectedRange = sortedRanges[0];
      
      // Generate a phone number from the range
      // The API returns number ranges like "14415054" with 20 available numbers
      // We'll generate a number by adding a random suffix
      const baseNumber = selectedRange.numberRange;
      const randomSuffix = Math.floor(Math.random() * selectedRange.total).toString().padStart(2, '0');
      const phoneNumber = `+1${baseNumber}${randomSuffix}`;

      const assignment: NumberAssignment = {
        phoneNumber: phoneNumber,
        numberRange: selectedRange.numberRange,
        expiresAt: new Date(selectedRange.expiredAt)
      };

      this.logger.info(`Successfully assigned phone number: ${phoneNumber} from range: ${selectedRange.numberRange}`);
      return assignment;
      
    } catch (error) {
      this.logger.error('Error assigning phone number:', error);
      throw error;
    }
  }

  /**
   * Process pending number requests and attempt assignments
   */
  public async processPendingRequests(): Promise<void> {
    try {
      this.logger.info('Processing pending number requests...');

      // This would typically fetch pending requests from database
      // For now, we'll log that the system is ready to process
      this.logger.info('Number assignment system is ready');
      
    } catch (error) {
      this.logger.error('Error processing pending requests:', error);
      throw error;
    }
  }

  /**
   * Request multiple phone numbers from a specific range
   */
  public async requestPhoneNumbersByQuantity(
    destinationId: string,
    quantity: number,
    range: string
  ): Promise<any[]> {
    try {
      this.logger.info(`Requesting ${quantity} numbers from range ${range} for destination ${destinationId}`);
      
      // Get authentication cookie
      const cookieString = await this.cookieService.getCookieString(NumberRequestService.SMS_DOMAIN);
      if (!cookieString) {
        this.logger.error('No authentication cookie available');
        throw new Error('Authentication required - please login first');
      }

      this.logger.info('Cookie authentication available, proceeding with request');

      // Prepare request payload
      const requestPayload = {
        destination: destinationId,
        quantity: quantity.toString(),
        range: range
      };

      this.logger.info('Making API request to purchase numbers:', requestPayload);

      // Make API call to request numbers
      const response = await fetch(`${NumberRequestService.API_BASE_URL}/did/request_did`, {
        method: 'PUT',
        headers: {
          'Cookie': cookieString,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Content-Type': 'application/json',
          'Referer': 'https://beta.full-sms.com/',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin'
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`API request failed: ${response.status} ${response.statusText}`, {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
          requestPayload: requestPayload,
          url: `${NumberRequestService.API_BASE_URL}/did/request_did`,
          hasCookie: !!cookieString,
          cookieLength: cookieString ? cookieString.length : 0
        });
        
        if (response.status === 401) {
          throw new Error('Authentication failed - please check your login credentials and try again');
        }
        
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const purchasedNumbers = await response.json();
      
      if (!Array.isArray(purchasedNumbers)) {
        this.logger.error('Invalid API response - expected array:', purchasedNumbers);
        throw new Error('Invalid API response format');
      }

      if (purchasedNumbers.length === 0) {
        throw new Error('No numbers returned from API - range might be sold out');
      }

      this.logger.info(`Successfully purchased ${purchasedNumbers.length} numbers`);
      
      return purchasedNumbers;
      
    } catch (error) {
      this.logger.error('Error requesting phone numbers:', error);
      throw error;
    }
  }
}
