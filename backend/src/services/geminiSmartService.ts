import { Type } from "@google/genai";
// @ts-ignore - Package is outside rootDir but we need to use it
import { getAIClient as getPackageAIClient } from '../../gemini-service-package/src/geminiService.js';

// Adapter to get AI client (package version is async)
const getAIClient = async (userId?: number) => {
  return await getPackageAIClient(userId);
};

// Helper function to sleep/delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Smart JSON extraction that handles various response formats
const smartExtractJSON = (text: string): { json: string; startPos: number; endPos: number } | null => {
  if (!text || typeof text !== 'string') return null;
  
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  
  // Find all potential JSON start positions
  const jsonStarts: number[] = [];
  const arrayStarts: number[] = [];
  
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') jsonStarts.push(i);
    if (cleaned[i] === '[') arrayStarts.push(i);
  }
  
  // Try to extract valid JSON starting from each position
  const tryExtract = (startPos: number, isObject: boolean): { json: string; endPos: number } | null => {
    const openChar = isObject ? '{' : '[';
    const closeChar = isObject ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = startPos; i < cleaned.length; i++) {
      const char = cleaned[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === openChar) depth++;
        if (char === closeChar) {
          depth--;
          if (depth === 0) {
            const extracted = cleaned.substring(startPos, i + 1);
            // Validate it's valid JSON
            try {
              JSON.parse(extracted);
              return { json: extracted, endPos: i + 1 };
            } catch {
              // Not valid JSON, continue searching
            }
          }
        }
      }
    }
    
    return null;
  };
  
  // Try object extraction first (prefer objects over arrays)
  for (const startPos of jsonStarts) {
    // Check if there's error text before this position
    const beforeText = cleaned.substring(Math.max(0, startPos - 100), startPos).toLowerCase();
    if (beforeText.includes('initialization') || 
        beforeText.includes('loading') || 
        beforeText.includes('processing') ||
        beforeText.includes('error')) {
      continue; // Skip if error text is nearby
    }
    
    const result = tryExtract(startPos, true);
    if (result) {
      // Final validation - ensure extracted JSON doesn't start with error keywords
      const extractedLower = result.json.trim().substring(0, 50).toLowerCase();
      if (!extractedLower.includes('initialization') && 
          !extractedLower.includes('loading') &&
          !extractedLower.includes('error')) {
        return { json: result.json, startPos, endPos: result.endPos };
      }
    }
  }
  
  // Try array extraction
  for (const startPos of arrayStarts) {
    const beforeText = cleaned.substring(Math.max(0, startPos - 100), startPos).toLowerCase();
    if (beforeText.includes('initialization') || 
        beforeText.includes('loading') || 
        beforeText.includes('processing') ||
        beforeText.includes('error')) {
      continue;
    }
    
    const result = tryExtract(startPos, false);
    if (result) {
      const extractedLower = result.json.trim().substring(0, 50).toLowerCase();
      if (!extractedLower.includes('initialization') && 
          !extractedLower.includes('loading') &&
          !extractedLower.includes('error')) {
        return { json: result.json, startPos, endPos: result.endPos };
      }
    }
  }
  
  return null;
};

// Check if response is an error/status message
const isErrorResponse = (text: string): { isError: boolean; shouldRetry: boolean; message: string } => {
  if (!text || typeof text !== 'string') {
    return { isError: true, shouldRetry: false, message: 'Empty or invalid response' };
  }
  
  const lower = text.toLowerCase().trim();
  const first100 = lower.substring(0, 100);
  const firstChar = text.trim().charAt(0);
  
  // Check if it starts with error keywords
  const errorPatterns = [
    /^initialization/i,
    /^initializing/i,
    /^loading/i,
    /^processing/i,
    /^error/i,
    /^failed/i,
    /^unable/i,
    /^please wait/i
  ];
  
  const startsWithError = errorPatterns.some(pattern => pattern.test(text));
  const containsErrorKeywords = first100.includes('initialization') || 
                                first100.includes('loading') ||
                                first100.includes('processing') ||
                                first100.includes('error');
  
  // If it doesn't start with { or [ and has error keywords, it's likely an error
  if (firstChar !== '{' && firstChar !== '[' && (startsWithError || containsErrorKeywords)) {
    const shouldRetry = first100.includes('initialization') || 
                       first100.includes('initializing') ||
                       first100.includes('loading') ||
                       first100.includes('processing');
    
    return {
      isError: true,
      shouldRetry,
      message: `Response appears to be an error/status message: "${text.substring(0, 100)}..."`
    };
  }
  
  return { isError: false, shouldRetry: false, message: '' };
};

interface SmartGeminiOptions {
  model?: string;
  contents: string;
  responseMimeType?: string;
  responseSchema?: any;
  maxRetries?: number;
  retryDelay?: number;
  userId?: number;
}

interface SmartGeminiResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  retries?: number;
  rawResponse?: string;
}

/**
 * Smart Gemini service that intelligently handles responses and parsing
 */
export const smartGeminiRequest = async <T = any>(
  options: SmartGeminiOptions
): Promise<SmartGeminiResult<T>> => {
  const {
    model,
    contents,
    responseMimeType = "application/json",
    responseSchema,
    maxRetries = 3,
    retryDelay = 2000,
    userId
  } = options;

  let lastError: string | null = null;
  let rawResponse: string | null = null;

  console.log(`[SmartGemini] ========================================`);
  console.log(`[SmartGemini] Starting smartGeminiRequest`);
  console.log(`[SmartGemini] Model: ${model || 'gemini-2.5-flash'}`);
  console.log(`[SmartGemini] Response MIME type: ${responseMimeType}`);
  console.log(`[SmartGemini] Has schema: ${!!responseSchema}`);
  console.log(`[SmartGemini] Max retries: ${maxRetries}`);
  console.log(`[SmartGemini] User ID: ${userId}`);
  console.log(`[SmartGemini] Contents length: ${contents.length}`);
  console.log(`[SmartGemini] Contents preview: ${contents.substring(0, 200)}`);
  console.log(`[SmartGemini] ========================================`);
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[SmartGemini] ========================================`);
      console.log(`[SmartGemini] Attempt ${attempt + 1}/${maxRetries + 1}`);
      console.log(`[SmartGemini] ========================================`);
      
      // Get AI client
      console.log(`[SmartGemini] Getting AI client...`);
      const ai = await getAIClient(userId);
      console.log(`[SmartGemini] AI client obtained`);
      
      // Make request
      console.log(`[SmartGemini] Calling ai.models.generateContent...`);
      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents,
        config: {
          responseMimeType,
          ...(responseSchema && { responseSchema })
        }
      });
      console.log(`[SmartGemini] Received response from Gemini API`);

      if (!response.text) {
        throw new Error("No response text from Gemini API");
      }

      rawResponse = String(response.text).trim();
      console.log(`[SmartGemini] ========================================`);
      console.log(`[SmartGemini] RAW RESPONSE FROM GEMINI API`);
      console.log(`[SmartGemini] ========================================`);
      console.log(`[SmartGemini] Response length: ${rawResponse.length}`);
      console.log(`[SmartGemini] Response type: ${typeof response.text}`);
      console.log(`[SmartGemini] First character: "${rawResponse.charAt(0)}" (code: ${rawResponse.charCodeAt(0)})`);
      console.log(`[SmartGemini] First 100 chars: ${rawResponse.substring(0, 100)}`);
      console.log(`[SmartGemini] First 200 chars: ${rawResponse.substring(0, 200)}`);
      console.log(`[SmartGemini] First 500 chars: ${rawResponse.substring(0, 500)}`);
      console.log(`[SmartGemini] Last 100 chars: ${rawResponse.substring(Math.max(0, rawResponse.length - 100))}`);
      console.log(`[SmartGemini] Full response:`);
      console.log(rawResponse);
      console.log(`[SmartGemini] ========================================`);
      console.log(`[SmartGemini] END RAW RESPONSE`);
      console.log(`[SmartGemini] ========================================`);

      // Check if response is an error/status message
      const errorCheck = isErrorResponse(rawResponse);
      console.log(`[SmartGemini] Error check result:`, {
        isError: errorCheck.isError,
        shouldRetry: errorCheck.shouldRetry,
        message: errorCheck.message
      });
      
      if (errorCheck.isError) {
        console.error(`[SmartGemini] ❌ Detected error response: ${errorCheck.message}`);
        console.error(`[SmartGemini] Full error response:`, rawResponse);
        
        if (errorCheck.shouldRetry && attempt < maxRetries) {
          const waitTime = retryDelay * (attempt + 1);
          console.log(`[SmartGemini] ⏳ Retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await sleep(waitTime);
          continue;
        }
        
        console.error(`[SmartGemini] ❌ Not retrying (max retries reached or not retryable)`);
        return {
          success: false,
          error: errorCheck.message,
          retries: attempt,
          rawResponse: rawResponse || undefined
        };
      }

      // Check if response contains JSON structure
      const hasJsonStart = rawResponse.includes('{') || rawResponse.includes('[');
      console.log(`[SmartGemini] Contains JSON structure ({ or [): ${hasJsonStart}`);
      if (!hasJsonStart) {
        const errorMsg = `Response does not contain JSON structure. Response: "${rawResponse.substring(0, 100)}..."`;
        console.error(`[SmartGemini] ❌ ${errorMsg}`);
        console.error(`[SmartGemini] Full response without JSON:`, rawResponse);
        
        if (attempt < maxRetries) {
          console.log(`[SmartGemini] ⏳ Retrying in ${retryDelay * (attempt + 1)}ms...`);
          await sleep(retryDelay * (attempt + 1));
          continue;
        }
        
        return {
          success: false,
          error: errorMsg,
          retries: attempt,
          rawResponse
        };
      }

      // Smart JSON extraction
      console.log(`[SmartGemini] Extracting JSON from response...`);
      const extractionResult = smartExtractJSON(rawResponse);
      
      if (!extractionResult) {
        const errorMsg = `Could not extract valid JSON from response. Response starts with: "${rawResponse.substring(0, 100)}..."`;
        console.error(`[SmartGemini] ❌ ${errorMsg}`);
        console.error(`[SmartGemini] Full response that failed extraction:`, rawResponse);
        console.error(`[SmartGemini] Response contains '{': ${rawResponse.includes('{')}`);
        console.error(`[SmartGemini] Response contains '[': ${rawResponse.includes('[')}`);
        console.error(`[SmartGemini] Position of first '{': ${rawResponse.indexOf('{')}`);
        console.error(`[SmartGemini] Position of first '[': ${rawResponse.indexOf('[')}`);
        
        if (attempt < maxRetries) {
          console.log(`[SmartGemini] ⏳ Retrying in ${retryDelay * (attempt + 1)}ms...`);
          await sleep(retryDelay * (attempt + 1));
          continue;
        }
        
        return {
          success: false,
          error: errorMsg,
          retries: attempt,
          rawResponse
        };
      }
      
      console.log(`[SmartGemini] ✅ JSON extraction successful`);
      console.log(`[SmartGemini] Extracted JSON length: ${extractionResult.json.length}`);
      console.log(`[SmartGemini] Extracted JSON (first 200 chars): ${extractionResult.json.substring(0, 200)}`);
      console.log(`[SmartGemini] Extracted JSON (last 200 chars): ${extractionResult.json.substring(Math.max(0, extractionResult.json.length - 200))}`);

      // Parse extracted JSON
      console.log(`[SmartGemini] Parsing extracted JSON (length: ${extractionResult.json.length})...`);
      console.log(`[SmartGemini] Extracted JSON to parse (complete):`);
      console.log(extractionResult.json);
      let parsedData: T;
      
      try {
        parsedData = JSON.parse(extractionResult.json) as T;
        console.log(`[SmartGemini] ✅ Successfully parsed JSON`);
        console.log(`[SmartGemini] Parsed data type: ${typeof parsedData}`);
        console.log(`[SmartGemini] Parsed data keys: ${parsedData && typeof parsedData === 'object' && parsedData !== null ? Object.keys(parsedData).join(', ') : 'N/A'}`);
      } catch (parseError: any) {
        const errorMsg = `Failed to parse extracted JSON: ${parseError.message}`;
        console.error(`[SmartGemini] ❌ ${errorMsg}`);
        console.error(`[SmartGemini] Parse error name: ${parseError.name}`);
        console.error(`[SmartGemini] Parse error stack: ${parseError.stack}`);
        console.error(`[SmartGemini] Extracted JSON that failed to parse (first 500 chars): ${extractionResult.json.substring(0, 500)}`);
        console.error(`[SmartGemini] Extracted JSON that failed to parse (complete):`);
        console.error(extractionResult.json);
        
        // Check if parse error is due to error keywords
        if (parseError.message.includes('Initializa') || 
            parseError.message.includes('Unexpected token')) {
          if (attempt < maxRetries) {
            console.log(`[SmartGemini] ⏳ Retrying due to parse error with error keywords...`);
            await sleep(retryDelay * (attempt + 1));
            continue;
          }
        }
        
        return {
          success: false,
          error: errorMsg,
          retries: attempt,
          rawResponse
        };
      }

      // Validate parsed data structure if schema was provided
      if (responseSchema) {
        console.log(`[SmartGemini] Validating against schema...`);
        // Basic validation - check if required fields exist
        if (responseSchema.required && Array.isArray(responseSchema.required) && 
            parsedData && typeof parsedData === 'object' && parsedData !== null) {
          const missingFields = responseSchema.required.filter(
            (field: string) => !(field in parsedData)
          );
          
          if (missingFields.length > 0) {
            console.warn(`[SmartGemini] Missing required fields: ${missingFields.join(', ')}`);
            // Don't fail, just warn - the data might still be usable
          }
        }
      }

      // Success!
      console.log(`[SmartGemini] ✅ Request successful after ${attempt} retries`);
      return {
        success: true,
        data: parsedData,
        retries: attempt,
        rawResponse
      };

    } catch (error: any) {
      lastError = error.message || String(error);
      console.error(`[SmartGemini] Error on attempt ${attempt + 1}:`, lastError);
      
      // Check if it's a rate limit error
      const statusCode = error.status || error.error?.code || error.code;
      const isRateLimit = statusCode === 429 || error.error?.status === 'RESOURCE_EXHAUSTED';
      
      if (isRateLimit && attempt < maxRetries) {
        const retryDelay = error.error?.details?.find((d: any) => 
          d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
        )?.retryDelay;
        
        const delay = retryDelay ? parseFloat(retryDelay.replace('s', '')) * 1000 : retryDelay * (attempt + 1);
        console.log(`[SmartGemini] Rate limit hit, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      
      // If it's the last attempt, return error
      if (attempt === maxRetries) {
        return {
          success: false,
          error: lastError || 'Unknown error occurred',
          retries: attempt,
          rawResponse: rawResponse || undefined
        };
      }
      
      // Otherwise, wait and retry
      await sleep(retryDelay * (attempt + 1));
    }
  }

  // Should never reach here, but just in case
  return {
    success: false,
    error: lastError || 'Unknown error occurred',
    retries: maxRetries,
    rawResponse: rawResponse || undefined
  };
};

/**
 * Convenience wrapper for generating content with schema
 */
export const smartGenerateContent = async <T = any>(
  contents: string,
  schema: {
    type: Type;
    properties: any;
    required?: string[];
  },
  options?: {
    model?: string;
    userId?: number;
    maxRetries?: number;
  }
): Promise<T> => {
  console.log(`[smartGenerateContent] ========================================`);
  console.log(`[smartGenerateContent] Called with:`);
  console.log(`[smartGenerateContent] Contents length: ${contents.length}`);
  console.log(`[smartGenerateContent] Contents preview: ${contents.substring(0, 200)}`);
  console.log(`[smartGenerateContent] Schema type: ${schema.type}`);
  console.log(`[smartGenerateContent] Schema properties: ${Object.keys(schema.properties || {}).join(', ')}`);
  console.log(`[smartGenerateContent] Required fields: ${(schema.required || []).join(', ')}`);
  console.log(`[smartGenerateContent] Options:`, options);
  console.log(`[smartGenerateContent] ========================================`);
  
  const result = await smartGeminiRequest<T>({
    contents,
    responseMimeType: "application/json",
    responseSchema: {
      type: schema.type,
      properties: schema.properties,
      required: schema.required || []
    },
    model: options?.model,
    userId: options?.userId,
    maxRetries: options?.maxRetries
  });

  console.log(`[smartGenerateContent] Result from smartGeminiRequest:`, {
    success: result.success,
    hasData: !!result.data,
    error: result.error,
    retries: result.retries
  });
  
  if (!result.success) {
    console.error(`[smartGenerateContent] ❌ Request failed: ${result.error}`);
    console.error(`[smartGenerateContent] Raw response: ${result.rawResponse?.substring(0, 500)}`);
    throw new Error(result.error || 'Failed to generate content');
  }

  if (!result.data) {
    console.error(`[smartGenerateContent] ❌ No data in result`);
    throw new Error('No data returned from Gemini');
  }

  console.log(`[smartGenerateContent] ✅ Success! Returning data`);
  return result.data;
};

