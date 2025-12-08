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
 * Get all available API keys from all users (excluding specified userId)
 */
const getAllUserApiKeys = async (excludeUserId?: number): Promise<Array<{ userId: number | null; apiKey: string; source: string }>> => {
  const keys: Array<{ userId: number | null; apiKey: string; source: string }> = [];
  
  try {
    const pool = getPool();
    const [users] = await pool.query(
      `SELECT id, email, gemini_api_key FROM users 
       WHERE gemini_api_key IS NOT NULL 
       AND gemini_api_key != '' 
       ${excludeUserId ? 'AND id != ?' : ''}
       ORDER BY id ASC`,
      excludeUserId ? [excludeUserId] : []
    ) as any[];
    
    for (const user of users) {
      if (user.gemini_api_key) {
        keys.push({
          userId: user.id,
          apiKey: user.gemini_api_key,
          source: `user_${user.id}`
        });
      }
    }
  } catch (error) {
    console.error('[Gemini] Error fetching all user API keys:', error);
  }
  
  return keys;
};

/**
 * Get all available API keys in priority order for rotation
 */
const getAllAvailableApiKeys = async (preferredUserId?: number): Promise<Array<{ userId: number | null; apiKey: string; source: string }>> => {
  const keys: Array<{ userId: number | null; apiKey: string; source: string }> = [];
  
  // 1. Preferred user's key (if provided)
  if (preferredUserId) {
    const userKey = await getUserGeminiApiKey(preferredUserId);
    if (userKey) {
      keys.push({ userId: preferredUserId, apiKey: userKey, source: `user_${preferredUserId}` });
    }
  }
  
  // 2. All other user keys
  const otherUserKeys = await getAllUserApiKeys(preferredUserId);
  keys.push(...otherUserKeys);
  
  // 3. Global key
  const globalKey = await getGlobalGeminiApiKey();
  if (globalKey) {
    keys.push({ userId: null, apiKey: globalKey, source: 'global' });
  }
  
  // 4. Environment variable key
  const envKey = process.env.GEMINI_API_KEY || null;
  if (envKey) {
    keys.push({ userId: null, apiKey: envKey, source: 'environment' });
  }
  
  // 5. Default key (last resort)
  keys.push({ userId: null, apiKey: DEFAULT_GEMINI_API_KEY, source: 'default' });
  
  return keys;
};

// Track failed API keys to avoid retrying them immediately
const failedApiKeys = new Set<string>();
const FAILED_KEY_TTL = 60 * 60 * 1000; // 1 hour - keys are retried after this time
const failedKeyTimestamps = new Map<string, number>();

/**
 * Check if an API key should be skipped (recently failed)
 */
const shouldSkipKey = (apiKey: string): boolean => {
  if (!failedApiKeys.has(apiKey)) return false;
  
  const failedTime = failedKeyTimestamps.get(apiKey) || 0;
  const now = Date.now();
  
  // If enough time has passed, allow retry
  if (now - failedTime > FAILED_KEY_TTL) {
    failedApiKeys.delete(apiKey);
    failedKeyTimestamps.delete(apiKey);
    return false;
  }
  
  return true;
};

/**
 * Mark an API key as failed
 */
const markKeyAsFailed = (apiKey: string): void => {
  failedApiKeys.add(apiKey);
  failedKeyTimestamps.set(apiKey, Date.now());
  console.warn(`[Gemini] Marked API key as failed (will retry after ${FAILED_KEY_TTL / 1000 / 60} minutes)`);
};

/**
 * Clear failed key status (when a key succeeds)
 */
const clearFailedKey = (apiKey: string): void => {
  failedApiKeys.delete(apiKey);
  failedKeyTimestamps.delete(apiKey);
};

/**
 * Standard client initialization with API key rotation support:
 * Tries multiple API keys in priority order, rotating to next key if current one fails
 */
export const getAIClient = async (userId?: number, excludeFailedKeys: string[] = []): Promise<GoogleGenAI> => {
  // Get all available keys
  const allKeys = await getAllAvailableApiKeys(userId);
  
  // Filter out excluded keys and recently failed keys
  const availableKeys = allKeys.filter(keyInfo => {
    if (excludeFailedKeys.includes(keyInfo.apiKey)) return false;
    if (shouldSkipKey(keyInfo.apiKey)) return false;
    return true;
  });
  
  if (availableKeys.length === 0) {
    // If all keys are excluded/failed, try the first one anyway
    const firstKey = allKeys[0];
    if (firstKey) {
      console.log(`[Gemini] Using API key from: ${firstKey.source} (all other keys failed)`);
      return new GoogleGenAI({ apiKey: firstKey.apiKey });
    }
    throw new Error('No API keys available');
  }
  
  // Use the first available key
  const selectedKey = availableKeys[0];
  console.log(`[Gemini] Using API key from: ${selectedKey.source}`);
  
  return new GoogleGenAI({ apiKey: selectedKey.apiKey });
};

/**
 * Get AI client with automatic key rotation on failure
 * This function will try multiple keys until one works
 */
export const getAIClientWithRotation = async (
  userId?: number,
  operation: (client: GoogleGenAI) => Promise<any> = async () => { throw new Error('No operation provided'); }
): Promise<any> => {
  const allKeys = await getAllAvailableApiKeys(userId);
  const triedKeys: string[] = [];
  let lastError: any = null;
  
  for (const keyInfo of allKeys) {
    // Skip if key was already tried or is in failed list
    if (triedKeys.includes(keyInfo.apiKey) || shouldSkipKey(keyInfo.apiKey)) {
      continue;
    }
    
    try {
      console.log(`[Gemini] Trying API key from: ${keyInfo.source}`);
      const client = new GoogleGenAI({ apiKey: keyInfo.apiKey });
      
      // Try the operation with this client
      const result = await operation(client);
      
      // If successful, clear any failed status for this key
      clearFailedKey(keyInfo.apiKey);
      console.log(`[Gemini] ✅ Successfully used API key from: ${keyInfo.source}`);
      
      return result;
    } catch (error: any) {
      triedKeys.push(keyInfo.apiKey);
      lastError = error;
      
      // If it's an invalid API key error, mark it as failed and try next
      if (isInvalidApiKeyError(error)) {
        console.warn(`[Gemini] ⚠️  API key from ${keyInfo.source} is invalid/leaked, trying next key...`);
        markKeyAsFailed(keyInfo.apiKey);
        continue; // Try next key
      }
      
      // For other errors (rate limits, etc.), still try next key
      console.warn(`[Gemini] ⚠️  API key from ${keyInfo.source} failed: ${error.message}, trying next key...`);
      continue;
    }
  }
  
  // All keys failed
  console.error(`[Gemini] ❌ All ${allKeys.length} API keys failed`);
  throw lastError || new Error('All API keys failed');
};

/**
 * Check if error indicates an invalid/leaked API key
 */
export const isInvalidApiKeyError = (error: any): boolean => {
  const statusCode = error.status || error.error?.code || error.code;
  if (statusCode !== 403) return false;
  
  const errorMessage = error.message || error.error?.message || '';
  const messageStr = typeof errorMessage === 'string' ? errorMessage.toLowerCase() : JSON.stringify(errorMessage).toLowerCase();
  
  return messageStr.includes('leaked') || 
         messageStr.includes('invalid api key') || 
         messageStr.includes('permission denied') ||
         messageStr.includes('api key was reported');
};

/**
 * Helper function to extract user-friendly error messages from Gemini API errors.
 * Handles various error formats including nested structures and JSON strings.
 */
export const extractErrorMessage = (error: any): string => {
  try {
    // Check for invalid/leaked API key first
    if (isInvalidApiKeyError(error)) {
      return 'Your API key was reported as leaked or is invalid. Please use another API key. Update it in your user settings or configure GEMINI_API_KEY in environment variables.';
    }
    
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

