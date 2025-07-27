/**
 * Utility functions for common operations
 */
export class Utils {
  /**
   * Retry an async operation with exponential backoff
   */
  public static async retry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delay = 100
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.name === 'SequelizeValidationError' || 
            error.name === 'SequelizeConnectionError') {
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retrying with exponential backoff
        await Utils.sleep(delay * Math.pow(2, attempt - 1));
      }
    }

    throw lastError;
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  public static sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      if (typeof setTimeout !== 'undefined') {
        setTimeout(resolve, ms);
      } else {
        // Fallback for environments without setTimeout
        resolve();
      }
    });
  }

  /**
   * Check if error is a transaction rollback error
   */
  public static isTransactionError(error: any): boolean {
    return error && (
      error.message?.includes('Transaction cannot be committed') ||
      error.message?.includes('rollback') ||
      error.name === 'SequelizeConnectionError'
    );
  }

  /**
   * Safe JSON parse
   */
  public static safeJsonParse(str: string, defaultValue: any = null): any {
    try {
      return JSON.parse(str);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Truncate string to specified length
   */
  public static truncate(str: string, length: number): string {
    if (str.length <= length) return str;
    return str.substring(0, length - 3) + '...';
  }
}
