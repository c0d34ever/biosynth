/**
 * Configuration interface for the Gemini Service
 * Allows optional database integration for user-specific API keys
 */
export interface GeminiServiceConfig {
  /**
   * Optional callback to fetch user's API key from your database
   * If provided, this will be used instead of environment variable when userId is provided
   * @param userId - The user ID to fetch the API key for
   * @returns The user's API key or null if not found
   */
  getUserApiKey?: (userId: number) => Promise<string | null>;
  
  /**
   * Default API key to use if user key is not found
   * If not provided, will use GEMINI_API_KEY or API_KEY from environment
   */
  defaultApiKey?: string;
  
  /**
   * Enable debug logging
   */
  debug?: boolean;
}

let serviceConfig: GeminiServiceConfig = {};

/**
 * Initialize the Gemini Service with optional configuration
 */
export function initializeGeminiService(config: GeminiServiceConfig = {}) {
  serviceConfig = config;
}

/**
 * Get the current service configuration
 */
export function getServiceConfig(): GeminiServiceConfig {
  return serviceConfig;
}

