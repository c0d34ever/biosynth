import { GoogleGenAI, Type } from "@google/genai";
import { getPool } from '../db/connection.js';

/**
 * Default Gemini API key (final fallback)
 */
const DEFAULT_GEMINI_API_KEY = 'AIzaSyBq34MoOQ3NBHhJ1TQZD-vxeLSJM86Dog4';

/**
 * Get user's Gemini API key from database
 */
const getUserGeminiApiKey = async (userId?: number): Promise<string | null> => {
  if (!userId) return null;
  
  try {
    const pool = getPool();
    const [users] = await pool.query(
      'SELECT gemini_api_key FROM users WHERE id = ?',
      [userId]
    ) as any[];
    
    if (users.length > 0 && users[0].gemini_api_key) {
      return users[0].gemini_api_key;
    }
  } catch (error) {
    console.error('[Gemini] Error fetching user API key:', error);
  }
  
  return null;
};

/**
 * Get global Gemini API key from database settings
 */
const getGlobalGeminiApiKey = async (): Promise<string | null> => {
  try {
    const pool = getPool();
    const [settings] = await pool.query(
      'SELECT setting_value FROM global_settings WHERE setting_key = ?',
      ['gemini_api_key']
    ) as any[];
    
    if (settings.length > 0 && settings[0].setting_value) {
      return settings[0].setting_value;
    }
  } catch (error) {
    console.error('[Gemini] Error fetching global API key:', error);
  }
  
  return null;
};

/**
 * Standard client initialization with fallback mechanism:
 * 1. User's API key from database (if userId provided)
 * 2. Global API key from database settings
 * 3. GEMINI_API_KEY from environment variables
 * 4. Default API key (hardcoded fallback)
 */
export const getAIClient = async (userId?: number): Promise<GoogleGenAI> => {
  // Try to get user's API key first
  let apiKey: string | null = null;
  let keySource = 'unknown';
  
  if (userId) {
    apiKey = await getUserGeminiApiKey(userId);
    if (apiKey) {
      keySource = 'user';
    }
  }
  
  // Fallback to global settings
  if (!apiKey) {
    apiKey = await getGlobalGeminiApiKey();
    if (apiKey) {
      keySource = 'global';
    }
  }
  
  // Fallback to environment variable
  if (!apiKey) {
    apiKey = process.env.GEMINI_API_KEY || null;
    if (apiKey) {
      keySource = 'environment';
    }
  }
  
  // Final fallback to default key
  if (!apiKey) {
    apiKey = DEFAULT_GEMINI_API_KEY;
    keySource = 'default';
  }
  
  console.log(`[Gemini] Using API key from: ${keySource}`);
  
  return new GoogleGenAI({ apiKey });
};

/**
 * Helper function to extract user-friendly error messages from Gemini API errors.
 * Handles various error formats including nested structures and JSON strings.
 */
export const extractErrorMessage = (error: any): string => {
  try {
    // If error.message is already a clean string (not JSON), use it
    if (error.message && typeof error.message === 'string' && !error.message.startsWith('{') && !error.message.startsWith('[')) {
      // Check if it's a quota error
      if (error.status === 429 || error.message.includes('quota') || error.message.includes('429')) {
        return `API quota exceeded. ${error.message} For more information, visit: https://ai.google.dev/gemini-api/docs/rate-limits`;
      }
      return error.message;
    }
    
    // Try to parse if error.message is JSON string
    let parsedError: any = null;
    if (error.message && typeof error.message === 'string' && (error.message.startsWith('{') || error.message.startsWith('['))) {
      try {
        parsedError = JSON.parse(error.message);
      } catch {
        // Not valid JSON, continue
      }
    }
    
    // Handle nested error structure (error.error or parsed error)
    let apiError = error.error || parsedError?.error || parsedError || error;
    
    // Rate limit / Quota errors (429)
    const isQuotaError = apiError.code === 429 || 
                        apiError.status === 'RESOURCE_EXHAUSTED' || 
                        apiError.status === 429 ||
                        error.status === 429 ||
                        error.code === 429;
    
    if (isQuotaError) {
      let message = apiError.message || 'API quota exceeded';
      
      // Clean up the message - remove redundant quota info lines and URLs
      message = message.replace(/\* Quota exceeded[^\n]*\n?/g, '').trim();
      message = message.replace(/For more information on this error, head to:[^\n]*\n?/g, '').trim();
      message = message.replace(/To monitor your current usage, head to:[^\n]*\n?/g, '').trim();
      
      // Extract retry delay from details if available (only if not already in message)
      let retryDelayText = '';
      if (apiError.details && Array.isArray(apiError.details)) {
        const retryInfo = apiError.details.find((d: any) => 
          d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
        );
        if (retryInfo?.retryDelay) {
          const delay = retryInfo.retryDelay.replace('s', '').trim();
          const delayNum = parseFloat(delay);
          if (!isNaN(delayNum) && !message.includes('retry in')) {
            retryDelayText = ` Please retry in approximately ${Math.ceil(delayNum)} seconds.`;
          }
        }
      }
      
      // Also check if retry delay is already in the message
      if (message.includes('Please retry in')) {
        // Extract and format the existing retry delay
        const retryMatch = message.match(/Please retry in ([\d.]+)s?/i);
        if (retryMatch) {
          const delayNum = parseFloat(retryMatch[1]);
          if (!isNaN(delayNum)) {
            message = message.replace(/Please retry in [\d.]+s?\.?/i, '').trim();
            retryDelayText = ` Please retry in approximately ${Math.ceil(delayNum)} seconds.`;
          }
        }
      }
      
      return `API quota exceeded. ${message}${retryDelayText} For more information, visit: https://ai.google.dev/gemini-api/docs/rate-limits`;
    }
    
    // Other API errors with messages
    if (apiError.message && typeof apiError.message === 'string') {
      return `AI API Error: ${apiError.message}`;
    }
    
    // If we have a status code but no message
    if (apiError.code || apiError.status) {
      return `AI API Error (${apiError.code || apiError.status}): Request failed`;
    }
    
    // Fallback - return a generic message instead of raw JSON
    return 'An error occurred while processing the AI request. Please try again later or check your API configuration.';
  } catch (parseError) {
    // If we can't parse the error, return a safe message
    return 'An unexpected error occurred while processing the AI request. Please try again later.';
  }
};

/**
 * Default model configuration
 */
export const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Generate content with error handling wrapper
 */
export const generateContentWithErrorHandling = async (
  client: GoogleGenAI,
  options: {
    model?: string;
    contents: string;
    responseMimeType?: string;
    responseSchema?: any;
  }
): Promise<any> => {
  try {
    const response = await client.models.generateContent({
      model: options.model || DEFAULT_MODEL,
      contents: options.contents,
      config: {
        responseMimeType: options.responseMimeType || "application/json",
        ...(options.responseSchema && { responseSchema: options.responseSchema })
      }
    });

    if (!response.text) {
      throw new Error("No response from AI");
    }

    return JSON.parse(response.text);
  } catch (error: any) {
    // Extract user-friendly error message
    const errorMessage = extractErrorMessage(error);
    const apiError = new Error(errorMessage);
    
    // Preserve status code for quota detection
    const statusCode = error.status || error.error?.code || error.code;
    if (statusCode) {
      (apiError as any).status = statusCode;
    }
    
    throw apiError;
  }
};

