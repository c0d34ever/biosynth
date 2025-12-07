import { Type } from "@google/genai";
import { getPool } from '../db/connection.js';
import { getAIClient, extractErrorMessage } from './geminiService.js';
import { smartGenerateContent } from './geminiSmartService.js';

// Default model - using gemini-2.5-flash for better free tier support
// gemini-3-pro-preview has 0 requests/day on free tier
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.5-flash'; // Fast, good free tier limits

// Adapter to get AI client (now async, accepts userId)
const getAIClientAdapter = async (userId?: number) => {
  return await getAIClient(userId);
};

// Helper function to sleep/delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to extract retry delay from error
const extractRetryDelay = (error: any): number | null => {
  try {
    const apiError = error.error || error;
    if (apiError.details && Array.isArray(apiError.details)) {
      const retryInfo = apiError.details.find((d: any) => 
        d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
      );
      if (retryInfo?.retryDelay) {
        const delay = retryInfo.retryDelay.replace('s', '').trim();
        const delayNum = parseFloat(delay);
        if (!isNaN(delayNum)) {
          return Math.ceil(delayNum * 1000); // Convert to milliseconds
        }
      }
    }
    // Also check error message for retry delay
    if (error.message) {
      const retryMatch = error.message.match(/retry in ([\d.]+)\s*seconds?/i);
      if (retryMatch) {
        const delayNum = parseFloat(retryMatch[1]);
        if (!isNaN(delayNum)) {
          return Math.ceil(delayNum * 1000); // Convert to milliseconds
        }
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
};

// Helper function to generate content with error handling and retry logic
const generateContentWithErrorHandling = async (
  client: any,
  options: {
    model?: string;
    contents: string;
    responseMimeType?: string;
    responseSchema?: any;
  },
  retryCount = 0,
  maxRetries = 2
): Promise<any> => {
  console.log(`[Gemini] === Starting generateContentWithErrorHandling (retry ${retryCount}/${maxRetries}) ===`);
  console.log(`[Gemini] Model: ${options.model || DEFAULT_MODEL}`);
  console.log(`[Gemini] Response MIME type: ${options.responseMimeType || "application/json"}`);
  console.log(`[Gemini] Has schema: ${!!options.responseSchema}`);
  
  try {
    console.log('[Gemini] Calling client.models.generateContent...');
    const response = await client.models.generateContent({
      model: options.model || DEFAULT_MODEL,
      contents: options.contents,
      config: {
        responseMimeType: options.responseMimeType || "application/json",
        ...(options.responseSchema && { responseSchema: options.responseSchema })
      }
    });
    console.log('[Gemini] Received response from Gemini API');

    if (!response.text) {
      console.error('[Gemini] ERROR: No response.text in response object');
      throw new Error("No response from AI");
    }

    // Convert response.text to string and log for debugging
    const responseTextStr = String(response.text);
    
    // CRITICAL: Check if response.text itself is an error message before doing anything else
    const responseTextStrLower = responseTextStr.toLowerCase().trim();
    if (responseTextStrLower.startsWith('initialization') || 
        responseTextStrLower.startsWith('initializing') ||
        responseTextStrLower.startsWith('loading') ||
        responseTextStrLower.startsWith('processing') ||
        responseTextStrLower.startsWith('error') ||
        responseTextStrLower.startsWith('failed')) {
      console.error('[Gemini] ❌ CRITICAL: response.text itself is an error message!');
      console.error('[Gemini] response.text:', responseTextStr);
      
      // Retry if it's an initialization/loading message
      if (retryCount < maxRetries && (responseTextStrLower.startsWith('initialization') || 
                                      responseTextStrLower.startsWith('initializing') ||
                                      responseTextStrLower.startsWith('loading') ||
                                      responseTextStrLower.startsWith('processing'))) {
        const waitTime = 2000 * (retryCount + 1); // 2s, 4s, 6s
        console.log(`[Gemini] ⏳ Retrying because response.text is an error message (attempt ${retryCount + 1}/${maxRetries}, waiting ${waitTime}ms)...`);
        await sleep(waitTime);
        return generateContentWithErrorHandling(client, options, retryCount + 1, maxRetries);
      }
      
      throw new Error(`AI service returned an error message instead of JSON. Response: "${responseTextStr.substring(0, 100)}..."`);
    }
    
    const trimmedResponse = responseTextStr.trim();
    const responseTextLower = trimmedResponse.toLowerCase();
    
    // Log raw response for debugging
    console.log('[Gemini] === RAW RESPONSE FROM GEMINI ===');
    console.log('[Gemini] Response length:', trimmedResponse.length);
    console.log('[Gemini] First 200 chars:', trimmedResponse.substring(0, 200));
    console.log('[Gemini] First 500 chars:', trimmedResponse.substring(0, 500));
    console.log('[Gemini] Full response:', trimmedResponse);
    console.log('[Gemini] === END RAW RESPONSE ===');

    // CRITICAL: Check the very first character - if it's not { or [, it's likely an error message
    console.log('[Gemini] Step 1: Checking first character...');
    const firstCharCheck = trimmedResponse.charAt(0);
    console.log(`[Gemini] First character: "${firstCharCheck}" (code: ${firstCharCheck.charCodeAt(0)})`);
    
    if (firstCharCheck !== '{' && firstCharCheck !== '[') {
      console.log('[Gemini] First character is NOT { or [, checking for error keywords...');
      // Check if it starts with error keywords
      const first50Lower = trimmedResponse.substring(0, 50).toLowerCase();
      console.log('[Gemini] First 50 chars (lowercase):', first50Lower);
      
      const hasErrorKeywords = first50Lower.includes('initialization') || 
                                first50Lower.includes('initializing') ||
                                first50Lower.includes('loading') ||
                                first50Lower.includes('processing') ||
                                first50Lower.includes('error') ||
                                first50Lower.includes('failed');
      
      console.log('[Gemini] Has error keywords:', hasErrorKeywords);
      
      if (hasErrorKeywords) {
        console.error('[Gemini] ❌ Response starts with error/status message!');
        console.error('[Gemini] Full response:', trimmedResponse);
        
        // Retry if it's an initialization/loading message
        const shouldRetry = retryCount < maxRetries && (first50Lower.includes('initialization') || 
                                                        first50Lower.includes('initializing') ||
                                                        first50Lower.includes('loading') ||
                                                        first50Lower.includes('processing'));
        console.log('[Gemini] Should retry:', shouldRetry, `(retryCount: ${retryCount}, maxRetries: ${maxRetries})`);
        
        if (shouldRetry) {
          const waitTime = 2000 * (retryCount + 1); // 2s, 4s, 6s
          console.log(`[Gemini] ⏳ Retrying after detecting error message at start (attempt ${retryCount + 1}/${maxRetries}, waiting ${waitTime}ms)...`);
          await sleep(waitTime);
          return generateContentWithErrorHandling(client, options, retryCount + 1, maxRetries);
        }
        
        console.error('[Gemini] ❌ Max retries reached or not a retryable error, throwing...');
        throw new Error(`AI service returned a status/error message instead of JSON. Response starts with: "${trimmedResponse.substring(0, 100)}..."`);
      } else {
        console.log('[Gemini] First char is not { or [, but no error keywords found. Continuing...');
      }
    } else {
      console.log('[Gemini] ✅ First character is { or [, looks like JSON');
    }

    // Check if response is just plain text (like algorithm name) with no JSON
    console.log('[Gemini] Step 2: Checking if response contains JSON structure...');
    const hasJsonStart = trimmedResponse.includes('{') || trimmedResponse.includes('[');
    console.log('[Gemini] Contains { or [: ', hasJsonStart);
    
    if (!hasJsonStart) {
      console.error('[Gemini] ❌ Response contains no JSON structure!');
      console.error('[Gemini] Full response:', trimmedResponse);
      throw new Error(`AI returned plain text instead of JSON. Response: "${trimmedResponse.substring(0, 100)}..."`);
    }

    // Check if response looks like an error message or non-JSON text
    console.log('[Gemini] Step 3: Checking for error patterns in response...');
    const first100Chars = trimmedResponse.substring(0, 100).toLowerCase();
    console.log('[Gemini] First 100 chars (lowercase):', first100Chars);
    
    const errorPatterns = [
      /^error/i,
      /^initialization/i,
      /^failed/i,
      /^unable/i,
      /^loading/i,
      /^please wait/i,
      /^processing/i,
      /initializing/i,
      /^wait/i
    ];
    
    // Check if response starts with error pattern (even if JSON is present later)
    const startsWithError = errorPatterns.some(pattern => pattern.test(trimmedResponse));
    console.log('[Gemini] Starts with error pattern:', startsWithError);
    
    // Also check if first 100 chars contain error keywords
    const containsErrorKeywords = first100Chars.includes('initialization') || 
                                   first100Chars.includes('loading') ||
                                   first100Chars.includes('processing') ||
                                   first100Chars.includes('please wait') ||
                                   first100Chars.includes('error');
    console.log('[Gemini] Contains error keywords:', containsErrorKeywords);
    
    const jsonStartPos = trimmedResponse.indexOf('{');
    const arrayStartPos = trimmedResponse.indexOf('[');
    console.log('[Gemini] Position of {: ', jsonStartPos);
    console.log('[Gemini] Position of [: ', arrayStartPos);
    const jsonStartsLate = (jsonStartPos > 50 && arrayStartPos > 50);
    console.log('[Gemini] JSON starts after position 50:', jsonStartsLate);
    
    // If response starts with error or contains error keywords before any JSON, handle it
    if (startsWithError || (containsErrorKeywords && jsonStartsLate)) {
      console.error('[Gemini] ❌ Response appears to be an error or status message!');
      console.error('[Gemini] Response preview:', trimmedResponse.substring(0, 200));
      
      // Retry if it's an initialization/loading message
      const shouldRetry = retryCount < maxRetries && (responseTextLower.includes('initialization') || 
                                      responseTextLower.includes('loading') ||
                                      responseTextLower.includes('processing') ||
                                      responseTextLower.includes('initializing'));
      console.log('[Gemini] Should retry:', shouldRetry);
      
      if (shouldRetry) {
        const waitTime = 2000 * (retryCount + 1); // 2s, 4s, 6s
        console.log(`[Gemini] ⏳ Retrying after initialization/loading message (attempt ${retryCount + 1}/${maxRetries}, waiting ${waitTime}ms)...`);
        await sleep(waitTime);
        return generateContentWithErrorHandling(client, options, retryCount + 1, maxRetries);
      }
      
      console.error('[Gemini] ❌ Not retrying, throwing error...');
      throw new Error(`AI service returned a status message instead of JSON: "${trimmedResponse.substring(0, 100)}..."`);
    }
    
    console.log('[Gemini] ✅ Passed error pattern checks, proceeding to JSON extraction...');

    // Clean and parse JSON response
    let parsedResponse: any;
    let responseText = trimmedResponse;
    
    // Helper function to extract JSON from text with proper brace/bracket matching
    const extractJSON = (text: string): string | null => {
      if (!text) return null;
      
      // Remove markdown code blocks if present
      text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // Skip any leading text that looks like error/status messages
      // Find the first occurrence of { or [ that's not part of an error message
      let jsonStart = -1;
      let arrayStart = -1;
      
      // Look for { or [ but skip if they're part of error text
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '{' && jsonStart === -1) {
          // Check if this { is likely part of JSON (not error text)
          // Look backwards to see if there's error text before it
          const beforeText = text.substring(Math.max(0, i - 50), i).toLowerCase();
          if (!beforeText.includes('initialization') && 
              !beforeText.includes('loading') && 
              !beforeText.includes('error') &&
              !beforeText.includes('processing')) {
            jsonStart = i;
          }
        }
        if (text[i] === '[' && arrayStart === -1) {
          const beforeText = text.substring(Math.max(0, i - 50), i).toLowerCase();
          if (!beforeText.includes('initialization') && 
              !beforeText.includes('loading') && 
              !beforeText.includes('error') &&
              !beforeText.includes('processing')) {
            arrayStart = i;
          }
        }
        // If we found a valid start, break
        if (jsonStart !== -1 || arrayStart !== -1) break;
      }
      
      // Fallback: use simple indexOf if the above didn't find anything
      if (jsonStart === -1) jsonStart = text.indexOf('{');
      if (arrayStart === -1) arrayStart = text.indexOf('[');
      
      if (jsonStart !== -1 && (arrayStart === -1 || jsonStart < arrayStart)) {
        // Find matching closing brace
        let braceCount = 0;
        let jsonEnd = -1;
        for (let i = jsonStart; i < text.length; i++) {
          if (text[i] === '{') braceCount++;
          if (text[i] === '}') braceCount--;
          if (braceCount === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
        if (jsonEnd !== -1 && jsonEnd > jsonStart) {
          const extracted = text.substring(jsonStart, jsonEnd);
          // Validate it looks like JSON (starts with { and ends with })
          const trimmed = extracted.trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            // Final check: ensure extracted text doesn't start with error keywords
            const first50 = trimmed.substring(0, 50).toLowerCase();
            if (!first50.includes('initialization') && 
                !first50.includes('loading') && 
                !first50.includes('error') &&
                !first50.includes('processing')) {
              return extracted;
            }
          }
        }
      } else if (arrayStart !== -1) {
        // Find matching closing bracket
        let bracketCount = 0;
        let arrayEnd = -1;
        for (let i = arrayStart; i < text.length; i++) {
          if (text[i] === '[') bracketCount++;
          if (text[i] === ']') bracketCount--;
          if (bracketCount === 0) {
            arrayEnd = i + 1;
            break;
          }
        }
        if (arrayEnd !== -1 && arrayEnd > arrayStart) {
          const extracted = text.substring(arrayStart, arrayEnd);
          // Validate it looks like JSON (starts with [ and ends with ])
          const trimmed = extracted.trim();
          if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            // Final check: ensure extracted text doesn't start with error keywords
            const first50 = trimmed.substring(0, 50).toLowerCase();
            if (!first50.includes('initialization') && 
                !first50.includes('loading') && 
                !first50.includes('error') &&
                !first50.includes('processing')) {
              return extracted;
            }
          }
        }
      }
      
      return null;
    };
    
    // Try to extract JSON from response
    console.log('[Gemini] Step 4: Attempting JSON extraction...');
    let extractedJSON = extractJSON(responseText);
    console.log('[Gemini] First extraction attempt result:', extractedJSON ? `Found JSON (length: ${extractedJSON.length})` : 'null');
    
    // If extraction failed, try with original response text
    if (!extractedJSON) {
      console.log('[Gemini] First extraction failed, trying with original response text...');
      extractedJSON = extractJSON(responseTextStr);
      console.log('[Gemini] Second extraction attempt result:', extractedJSON ? `Found JSON (length: ${extractedJSON.length})` : 'null');
    }
    
    // Only proceed if we found valid JSON - don't try to parse text that doesn't contain JSON
    if (!extractedJSON) {
      console.log('[Gemini] Both extraction attempts failed, trying position-based extraction...');
      // No JSON found in response - try position-based extraction before giving up
      const tryExtractFromPosition = (startPos: number, isObject: boolean): string | null => {
        const openChar = isObject ? '{' : '[';
        const closeChar = isObject ? '}' : ']';
        let depth = 0;
        
        for (let i = startPos; i < responseTextStr.length; i++) {
          if (responseTextStr[i] === openChar) depth++;
          if (responseTextStr[i] === closeChar) {
            depth--;
            if (depth === 0) {
              return responseTextStr.substring(startPos, i + 1);
            }
          }
        }
        return null;
      };
      
      // Try to find JSON starting from any position
      for (let i = 0; i < responseTextStr.length; i++) {
        if (responseTextStr[i] === '{') {
          extractedJSON = tryExtractFromPosition(i, true);
          if (extractedJSON) {
            console.log(`[Gemini] Found JSON starting at position ${i} using position-based extraction`);
            break;
          }
        } else if (responseTextStr[i] === '[') {
          extractedJSON = tryExtractFromPosition(i, false);
          if (extractedJSON) {
            console.log(`[Gemini] Found JSON array starting at position ${i} using position-based extraction`);
            break;
          }
        }
      }
    }
    
    // If we still don't have JSON, throw a clear error
    if (!extractedJSON) {
      console.error('[Gemini] ❌ No valid JSON found after all extraction attempts!');
      console.error('[Gemini] Full response:', responseTextStr);
      throw new Error(`AI returned a response that doesn't contain valid JSON. Response starts with: "${responseTextStr.substring(0, 50)}..."`);
    }
    
    console.log('[Gemini] ✅ JSON extraction successful!');
    console.log('[Gemini] Extracted JSON length:', extractedJSON.length);
    console.log('[Gemini] Extracted JSON (first 200 chars):', extractedJSON.substring(0, 200));
    
    // Validate extracted JSON starts with { or [
    console.log('[Gemini] Step 5: Validating extracted JSON...');
    const trimmedExtracted = extractedJSON.trim();
    console.log('[Gemini] Trimmed extracted JSON starts with:', trimmedExtracted.substring(0, 10));
    
    if (!trimmedExtracted.startsWith('{') && !trimmedExtracted.startsWith('[')) {
      console.error('[Gemini] ❌ Extracted text does not start with { or [!');
      console.error('[Gemini] Extracted:', trimmedExtracted.substring(0, 200));
      console.error('[Gemini] Full response:', responseTextStr.substring(0, 500));
      throw new Error(`AI returned a response that doesn't contain valid JSON. Extracted text starts with: "${trimmedExtracted.substring(0, 50)}..."`);
    }
    
    // Use extracted JSON
    responseText = trimmedExtracted;
    
    // Final safety check - ensure we're not trying to parse non-JSON text
    console.log('[Gemini] Step 6: Final safety checks before parsing...');
    const firstChar = responseText.trim().charAt(0);
    console.log('[Gemini] First character of text to parse:', firstChar);
    
    if (firstChar !== '{' && firstChar !== '[') {
      console.error('[Gemini] ❌ CRITICAL: About to parse non-JSON text!');
      console.error('[Gemini] First char:', firstChar);
      console.error('[Gemini] Full response:', responseTextStr);
      console.error('[Gemini] Extracted text:', responseText);
      throw new Error(`Cannot parse non-JSON text. Text starts with: "${responseText.substring(0, 50)}..."`);
    }
    
    // Additional safety check: ensure extracted text doesn't start with error keywords
    const trimmedForCheck = responseText.trim();
    const first100ForCheck = trimmedForCheck.substring(0, 100).toLowerCase();
    console.log('[Gemini] First 100 chars of text to parse (lowercase):', first100ForCheck);
    
    const hasErrorKeywords = first100ForCheck.includes('initialization') || 
        first100ForCheck.includes('loading') ||
        first100ForCheck.includes('processing') ||
        first100ForCheck.includes('please wait') ||
        first100ForCheck.includes('error') ||
        first100ForCheck.includes('failed');
    console.log('[Gemini] Has error keywords in text to parse:', hasErrorKeywords);
    
    if (hasErrorKeywords) {
      console.error('[Gemini] ❌ CRITICAL: Extracted text contains error keywords!');
      console.error('[Gemini] Extracted text:', trimmedForCheck.substring(0, 200));
      console.error('[Gemini] Full response:', responseTextStr.substring(0, 500));
      
      // Retry if it's an initialization/loading message
      const shouldRetry = retryCount < maxRetries && (first100ForCheck.includes('initialization') || 
                                      first100ForCheck.includes('loading') ||
                                      first100ForCheck.includes('processing'));
      console.log('[Gemini] Should retry:', shouldRetry);
      
      if (shouldRetry) {
        const waitTime = 2000 * (retryCount + 1); // 2s, 4s, 6s
        console.log(`[Gemini] ⏳ Retrying after detecting error keywords in extracted text (attempt ${retryCount + 1}/${maxRetries}, waiting ${waitTime}ms)...`);
        await sleep(waitTime);
        return generateContentWithErrorHandling(client, options, retryCount + 1, maxRetries);
      }
      
      console.error('[Gemini] ❌ Not retrying, throwing error...');
      throw new Error(`AI service returned a response with error keywords. Extracted text starts with: "${trimmedForCheck.substring(0, 100)}..."`);
    }
    
    // Log what we're about to parse (for debugging)
    console.log('[Gemini] Step 7: Attempting JSON.parse()...');
    console.log('[Gemini] Text to parse length:', responseText.length);
    console.log('[Gemini] First 100 chars of text to parse:', responseText.substring(0, 100));
    console.log('[Gemini] Last 100 chars of text to parse:', responseText.substring(Math.max(0, responseText.length - 100)));
    
    try {
      console.log('[Gemini] Calling JSON.parse() now...');
      console.log('[Gemini] Text being parsed (first 50 chars):', responseText.substring(0, 50));
      
      // Final check right before parsing - if text starts with error keywords, don't parse
      const textToParseLower = responseText.trim().substring(0, 50).toLowerCase();
      if (textToParseLower.includes('initialization') || 
          textToParseLower.includes('initializing') ||
          textToParseLower.startsWith('loading') ||
          textToParseLower.startsWith('processing') ||
          textToParseLower.startsWith('error')) {
        console.error('[Gemini] ❌ CRITICAL: About to parse text that starts with error keywords!');
        console.error('[Gemini] Text:', responseText.substring(0, 200));
        
        // Retry if it's an initialization/loading message
        if (retryCount < maxRetries && (textToParseLower.includes('initialization') || 
                                        textToParseLower.includes('initializing') ||
                                        textToParseLower.includes('loading') ||
                                        textToParseLower.includes('processing'))) {
          const waitTime = 2000 * (retryCount + 1);
          console.log(`[Gemini] ⏳ Retrying before JSON.parse() (attempt ${retryCount + 1}/${maxRetries}, waiting ${waitTime}ms)...`);
          await sleep(waitTime);
          return generateContentWithErrorHandling(client, options, retryCount + 1, maxRetries);
        }
        
        throw new Error(`Cannot parse response that starts with error/status message: "${responseText.substring(0, 100)}..."`);
      }
      
      parsedResponse = JSON.parse(responseText);
      console.log('[Gemini] ✅ JSON.parse() succeeded!');
      console.log('[Gemini] Parsed response type:', typeof parsedResponse);
      console.log('[Gemini] Parsed response keys:', parsedResponse && typeof parsedResponse === 'object' ? Object.keys(parsedResponse) : 'N/A');
    } catch (parseError: any) {
      console.error('[Gemini] ❌ JSON.parse() FAILED!');
      console.error('[Gemini] === PARSE ERROR DETAILS ===');
      console.error('[Gemini] Error message:', parseError.message);
      console.error('[Gemini] Error name:', parseError.name);
      console.error('[Gemini] Full response (first 500 chars):', responseTextStr.substring(0, 500));
      console.error('[Gemini] Full response (complete):', responseTextStr);
      console.error('[Gemini] Extracted text (first 200 chars):', responseText.substring(0, 200));
      console.error('[Gemini] Extracted text (last 200 chars):', responseText.substring(Math.max(0, responseText.length - 200)));
      console.error('[Gemini] Extracted text (complete):', responseText);
      console.error('[Gemini] === END PARSE ERROR DETAILS ===');
      
      // Check if the error is due to error keywords in the response
      const errorMsg = parseError.message?.toLowerCase() || '';
      const extractedLower = responseText.substring(0, 200).toLowerCase();
      const fullResponseLower = responseTextStr.substring(0, 200).toLowerCase();
      
      // Check for "Unexpected token" errors that mention "Initializa" or other error keywords
      const isInitializationError = errorMsg.includes('unexpected token') && 
                                    (errorMsg.includes('initializa') || 
                                     errorMsg.includes('initialization') ||
                                     extractedLower.includes('initialization') ||
                                     extractedLower.includes('initializing') ||
                                     fullResponseLower.includes('initialization') ||
                                     fullResponseLower.includes('initializing'));
      
      const isErrorResponse = isInitializationError ||
                               (errorMsg.includes('unexpected token') && 
                                (extractedLower.includes('loading') ||
                                 extractedLower.includes('processing') ||
                                 extractedLower.includes('error') ||
                                 fullResponseLower.includes('loading') ||
                                 fullResponseLower.includes('processing')));
      
      console.log('[Gemini] Checking if error is due to error keywords...');
      console.log('[Gemini] isInitializationError:', isInitializationError);
      console.log('[Gemini] isErrorResponse:', isErrorResponse);
      
      if (isErrorResponse) {
        console.error('[Gemini] ❌ Parse error appears to be due to error keywords in response!');
        console.error('[Gemini] Error message:', errorMsg);
        console.error('[Gemini] Response starts with:', responseTextStr.substring(0, 100));
        
        // Retry if it's an initialization/loading message
        const shouldRetry = retryCount < maxRetries && (isInitializationError ||
                                        extractedLower.includes('loading') ||
                                        extractedLower.includes('processing') ||
                                        fullResponseLower.includes('loading') ||
                                        fullResponseLower.includes('processing'));
        console.log('[Gemini] Should retry after parse error:', shouldRetry);
        
        if (shouldRetry) {
          const waitTime = 2000 * (retryCount + 1); // 2s, 4s, 6s
          console.log(`[Gemini] ⏳ Retrying after JSON parse error with error keywords (attempt ${retryCount + 1}/${maxRetries}, waiting ${waitTime}ms)...`);
          await sleep(waitTime);
          return generateContentWithErrorHandling(client, options, retryCount + 1, maxRetries);
        }
        
        console.error('[Gemini] ❌ Not retrying, throwing error...');
        throw new Error(`AI service returned a response that cannot be parsed as JSON. The response appears to contain error or status messages (like "Initialization..."). Please try again. Original error: ${parseError.message}`);
      }
      
      console.log('[Gemini] Error is not due to error keywords, trying aggressive extraction...');
      // Try a more aggressive extraction: scan for JSON starting from each { or [
      const tryExtractFromPosition = (startPos: number, isObject: boolean): string | null => {
        const openChar = isObject ? '{' : '[';
        const closeChar = isObject ? '}' : ']';
        let depth = 0;
        let endPos = startPos;
        
        for (let i = startPos; i < responseTextStr.length; i++) {
          if (responseTextStr[i] === openChar) depth++;
          if (responseTextStr[i] === closeChar) {
            depth--;
            if (depth === 0) {
              endPos = i + 1;
              const extracted = responseTextStr.substring(startPos, endPos);
              // Validate extracted doesn't start with error keywords
              const first50 = extracted.trim().substring(0, 50).toLowerCase();
              if (!first50.includes('initialization') && 
                  !first50.includes('loading') && 
                  !first50.includes('error') &&
                  !first50.includes('processing')) {
                return extracted;
              }
            }
          }
        }
        return null;
      };
      
      // Try to find and extract JSON from various positions
      console.log('[Gemini] Scanning response for JSON starting positions...');
      let foundValidJson = false;
      for (let i = 0; i < responseTextStr.length; i++) {
        if (responseTextStr[i] === '{') {
          console.log(`[Gemini] Found { at position ${i}, attempting extraction...`);
          const extracted = tryExtractFromPosition(i, true);
          if (extracted) {
            console.log(`[Gemini] Extracted JSON from position ${i}, length: ${extracted.length}`);
            try {
              parsedResponse = JSON.parse(extracted);
              console.log('[Gemini] ✅ Successfully parsed JSON using position-based extraction!');
              foundValidJson = true;
              break;
            } catch (e: any) {
              console.log(`[Gemini] Failed to parse extracted JSON from position ${i}:`, e.message);
              // Continue searching
            }
          }
        } else if (responseTextStr[i] === '[') {
          console.log(`[Gemini] Found [ at position ${i}, attempting extraction...`);
          const extracted = tryExtractFromPosition(i, false);
          if (extracted) {
            console.log(`[Gemini] Extracted JSON array from position ${i}, length: ${extracted.length}`);
            try {
              parsedResponse = JSON.parse(extracted);
              console.log('[Gemini] ✅ Successfully parsed JSON array using position-based extraction!');
              foundValidJson = true;
              break;
            } catch (e: any) {
              console.log(`[Gemini] Failed to parse extracted JSON array from position ${i}:`, e.message);
              // Continue searching
            }
          }
        }
      }
      
      // If we still can't parse, throw error
      if (!parsedResponse || !foundValidJson) {
        console.error('[Gemini] ❌ All extraction and parsing attempts failed!');
        
        // Check if the original error message contains "Initializa" or similar
        const originalErrorMsg = parseError.message || '';
        if (originalErrorMsg.includes('Initializa') || originalErrorMsg.includes('Unexpected token')) {
          throw new Error(`AI service returned a response that cannot be parsed as JSON. The response appears to contain error or status messages (like "Initialization..."). Please try again.`);
        }
        
        throw new Error(`AI returned invalid JSON. The response may contain non-JSON text. Please try again. Original error: ${parseError.message}`);
      }
    }

    // Validate and transform response to ensure arrays are arrays
    console.log('[Gemini] Step 8: Validating and transforming response...');
    if (parsedResponse.steps && typeof parsedResponse.steps === 'string') {
      console.log('[Gemini] Converting steps from string to array...');
      // If steps is a string, try to split by comma or convert to array
      parsedResponse.steps = parsedResponse.steps.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    }
    if (parsedResponse.applications && typeof parsedResponse.applications === 'string') {
      console.log('[Gemini] Converting applications from string to array...');
      parsedResponse.applications = parsedResponse.applications.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    }
    if (parsedResponse.tags && typeof parsedResponse.tags === 'string') {
      console.log('[Gemini] Converting tags from string to array...');
      parsedResponse.tags = parsedResponse.tags.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    }

    console.log('[Gemini] ✅ === generateContentWithErrorHandling SUCCESS ===');
    console.log('[Gemini] Returning parsed response');
    return parsedResponse;
  } catch (error: any) {
    console.error('[Gemini] ❌ === generateContentWithErrorHandling ERROR ===');
    console.error('[Gemini] Error type:', error.constructor.name);
    console.error('[Gemini] Error message:', error.message);
    console.error('[Gemini] Error stack:', error.stack);
    
    const statusCode = error.status || error.error?.code || error.code;
    const isRateLimit = statusCode === 429 || error.error?.status === 'RESOURCE_EXHAUSTED';
    console.log('[Gemini] Status code:', statusCode);
    console.log('[Gemini] Is rate limit:', isRateLimit);
    
    // Retry logic for rate limit errors
    if (isRateLimit && retryCount < maxRetries) {
      const retryDelay = extractRetryDelay(error);
      const delay = retryDelay || Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
      
      // Wait for retry delay before retrying
      console.log(`[Gemini] ⏳ Rate limit hit, retrying in ${delay/1000}s (attempt ${retryCount + 1}/${maxRetries})...`);
      await sleep(delay);
      
      // Retry the request
      return generateContentWithErrorHandling(client, options, retryCount + 1, maxRetries);
    }
    
    // Extract user-friendly error message
    const errorMessage = extractErrorMessage(error);
    console.error('[Gemini] Final error message:', errorMessage);
    const apiError = new Error(errorMessage);
    
    // Preserve status code for quota detection
    if (statusCode) {
      (apiError as any).status = statusCode;
    }
    
    console.error('[Gemini] ❌ === Throwing error from generateContentWithErrorHandling ===');
    throw apiError;
  }
};

export const processGenerateJob = async (inputData: {
  inspiration: string;
  domain: string;
}, userId?: number): Promise<any> => {
  const ai = await getAIClientAdapter(userId);
  
  const prompt = `
    Design a NOVEL, theoretical algorithm inspired by "${inputData.inspiration}" for the problem domain of "${inputData.domain}".
    
    The algorithm should not be a direct copy of an existing one (like standard Ant Colony Optimization or Neural Networks) but a creative variation or entirely new concept based on the specific biological or physical mechanics of the inspiration.
    
    Return the response in strict JSON format.
  `;

  return generateContentWithErrorHandling(ai, {
    contents: prompt,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "A creative, sci-fi sounding name for the algorithm" },
        inspiration: { type: Type.STRING, description: "The specific biological/physical source" },
        domain: { type: Type.STRING, description: "The problem domain addressed" },
        description: { type: Type.STRING, description: "A concise summary of what the algorithm does" },
        principle: { type: Type.STRING, description: "The core mechanism borrowed from nature" },
        steps: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Step-by-step logic flow of the algorithm"
        },
        applications: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Potential real-world use cases"
        },
        pseudoCode: { type: Type.STRING, description: "A code-like representation of the core logic loop" },
        tags: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Keywords (e.g., 'Optimization', 'Distributed', 'Chaos')"
        }
      },
      required: ["name", "inspiration", "domain", "description", "principle", "steps", "applications", "pseudoCode", "tags"]
    }
  });
};

export const processSynthesizeJob = async (inputData: {
  algorithms: any[];
  focus?: string;
}, userId?: number): Promise<any> => {
  const ai = await getAIClientAdapter(userId);

  const algoSummaries = inputData.algorithms
    .map(a => `${a.name} (Inspiration: ${a.inspiration}, Principle: ${a.principle})`)
    .join("; ");
  
  const prompt = `
    Act as a System Architect. Merge the following algorithms into a unified, sophisticated HYBRID system:
    ${algoSummaries}
    
    The goal is to create a meta-algorithm that leverages the strengths of each component to solve complex problems. 
    ${inputData.focus ? `Focus specifically on: ${inputData.focus}` : ''}
    
    Create a new cohesive system identity. The logic should explain how the components interact.
  `;

  return generateContentWithErrorHandling(ai, {
    contents: prompt,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Name of the hybrid system" },
        inspiration: { type: Type.STRING, description: "The combination of sources" },
        domain: { type: Type.STRING, description: "The complex domain this hybrid solves" },
        description: { type: Type.STRING, description: "Summary of the hybrid system" },
        principle: { type: Type.STRING, description: "The emergent synergy principle" },
        steps: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Logic flow of the interaction between subsystems"
        },
        applications: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Advanced use cases"
        },
        pseudoCode: { type: Type.STRING, description: "Pseudocode showing the integration" },
        tags: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Keywords"
        }
      },
      required: ["name", "inspiration", "domain", "description", "principle", "steps", "applications", "pseudoCode", "tags"]
    }
  });
};

export const processAnalyzeJob = async (inputData: {
  algorithmId: number;
  analysisType: 'sanity' | 'blind_spot' | 'extension';
}, userId?: number): Promise<any> => {
  console.log('[processAnalyzeJob] ========================================');
  console.log('[processAnalyzeJob] === Starting analyze job ===');
  console.log('[processAnalyzeJob] Algorithm ID:', inputData.algorithmId);
  console.log('[processAnalyzeJob] Analysis type:', inputData.analysisType);
  console.log('[processAnalyzeJob] User ID:', userId);
  console.log('[processAnalyzeJob] ========================================');
  
  try {
    const pool = getPool();
    console.log('[processAnalyzeJob] Querying algorithm from database...');
  const [algorithms] = await pool.query(
    `SELECT name, inspiration, domain, description, principle, steps, pseudo_code
    FROM algorithms WHERE id = ?`,
    [inputData.algorithmId]
  ) as any[];

  if (algorithms.length === 0) {
    console.error('[processAnalyzeJob] ❌ Algorithm not found!');
    throw new Error('Algorithm not found');
  }

  const algo = algorithms[0];
  console.log('[processAnalyzeJob] Found algorithm:', algo.name);
  console.log('[processAnalyzeJob] Algorithm data:', {
    name: algo.name,
    hasSteps: !!algo.steps,
    stepsType: typeof algo.steps,
    stepsIsArray: Array.isArray(algo.steps),
    stepsIsObject: typeof algo.steps === 'object' && algo.steps !== null,
    stepsPreview: typeof algo.steps === 'string' 
      ? algo.steps.substring(0, 100) 
      : Array.isArray(algo.steps)
      ? `Array with ${algo.steps.length} items`
      : typeof algo.steps === 'object'
      ? `Object with keys: ${Object.keys(algo.steps).join(', ')}`
      : String(algo.steps)
  });
  
  let steps: any;
  try {
    console.log('[processAnalyzeJob] Processing algorithm steps...');
    
    // Handle different types of steps
    if (typeof algo.steps === 'string') {
      console.log('[processAnalyzeJob] Steps is a string, parsing JSON...');
      steps = JSON.parse(algo.steps);
    } else if (Array.isArray(algo.steps)) {
      console.log('[processAnalyzeJob] Steps is already an array, using directly');
      steps = algo.steps;
    } else if (typeof algo.steps === 'object' && algo.steps !== null) {
      console.log('[processAnalyzeJob] Steps is an object, using directly');
      steps = algo.steps;
    } else {
      throw new Error(`Unexpected steps type: ${typeof algo.steps}`);
    }
    
    console.log('[processAnalyzeJob] ✅ Steps processed successfully');
    console.log('[processAnalyzeJob] Algorithm steps:', steps);
    console.log('[processAnalyzeJob] Steps type:', Array.isArray(steps) ? 'array' : typeof steps);
    console.log('[processAnalyzeJob] Steps length:', Array.isArray(steps) ? steps.length : 'N/A');
  } catch (error: any) {
    console.error('[processAnalyzeJob] ❌ Failed to process algorithm steps:');
    console.error('[processAnalyzeJob] Error:', error.message);
    console.error('[processAnalyzeJob] Steps value:', algo.steps);
    console.error('[processAnalyzeJob] Steps type:', typeof algo.steps);
    throw new Error(`Failed to process algorithm steps: ${error.message}`);
  }
  
  console.log('[processAnalyzeJob] Getting AI client...');
  const ai = await getAIClientAdapter(userId);
  console.log('[processAnalyzeJob] AI client obtained');

  let prompt = '';
  let schema: any;

  if (inputData.analysisType === 'sanity') {
    prompt = `
      Perform a rigorous conceptual sanity check on this bio-inspired algorithm:
      Name: ${algo.name}
      Inspiration: ${algo.inspiration}
      Principle: ${algo.principle}
      Logic: ${steps.join(' -> ')}

      Evaluate if the biological metaphor actually translates meaningfully to the computational domain.
    `;
    schema = {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.INTEGER, description: "Feasibility score from 0 to 100" },
        verdict: { type: Type.STRING, description: "Short verdict" },
        analysis: { type: Type.STRING, description: "Detailed analysis" },
        gaps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of logical gaps" }
      },
      required: ["score", "verdict", "analysis", "gaps"]
    };
  } else if (inputData.analysisType === 'blind_spot') {
    prompt = `
      Act as a hostile reviewer. Find the major flaws, blind spots, edge cases, and failure modes of this algorithm:
      Name: ${algo.name}
      Description: ${algo.description}
      Steps: ${steps.join('; ')}
    `;
    schema = {
      type: Type.OBJECT,
      properties: {
        risks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              risk: { type: Type.STRING },
              explanation: { type: Type.STRING },
              severity: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
            },
            required: ["risk", "explanation", "severity"]
          }
        }
      },
      required: ["risks"]
    };
  } else {
    prompt = `
      Suggest 3 exciting feature extensions or evolution paths for this algorithm:
      Name: ${algo.name}
      Domain: ${algo.domain}
      
      How can it be made more powerful?
    `;
    schema = {
      type: Type.OBJECT,
      properties: {
        ideas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              benefit: { type: Type.STRING }
            },
            required: ["name", "description", "benefit"]
          }
        }
      },
      required: ["ideas"]
    };
  }

  console.log('[processAnalyzeJob] Using smart Gemini service...');
  console.log('[processAnalyzeJob] Prompt length:', prompt.length);
  console.log('[processAnalyzeJob] Prompt preview:', prompt.substring(0, 200));
  
  try {
    // Use the smart service that handles all parsing edge cases
    const result = await smartGenerateContent(
      prompt,
      {
        type: schema.type,
        properties: schema.properties,
        required: schema.required || []
      },
      {
        userId,
        maxRetries: 3
      }
    );

    console.log('[processAnalyzeJob] ✅ Received result from smart Gemini service');
    console.log('[processAnalyzeJob] Result type:', typeof result);
    console.log('[processAnalyzeJob] Result keys:', result && typeof result === 'object' ? Object.keys(result) : 'N/A');
    console.log('[processAnalyzeJob] Saving analysis to database...');

    // Save analysis to database
    await pool.query(
      `INSERT INTO algorithm_analysis (algorithm_id, analysis_type, result)
      VALUES (?, ?, ?)`,
      [inputData.algorithmId, inputData.analysisType, JSON.stringify(result)]
    );

    console.log('[processAnalyzeJob] ✅ Analysis saved to database');
    console.log('[processAnalyzeJob] === Analyze job completed successfully ===');
    return result;
  } catch (error: any) {
    console.error('[processAnalyzeJob] ========================================');
    console.error('[processAnalyzeJob] ❌ ERROR CAUGHT IN processAnalyzeJob');
    console.error('[processAnalyzeJob] ========================================');
    console.error('[processAnalyzeJob] Error type:', error.constructor.name);
    console.error('[processAnalyzeJob] Error message:', error.message);
    console.error('[processAnalyzeJob] Error name:', error.name);
    console.error('[processAnalyzeJob] Error stack:', error.stack);
    console.error('[processAnalyzeJob] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('[processAnalyzeJob] ========================================');
    // Re-throw to let the queue service handle it
    throw error;
  }
  } catch (outerError: any) {
    console.error('[processAnalyzeJob] ========================================');
    console.error('[processAnalyzeJob] ❌ OUTER ERROR CAUGHT (before try block)');
    console.error('[processAnalyzeJob] ========================================');
    console.error('[processAnalyzeJob] Error type:', outerError.constructor.name);
    console.error('[processAnalyzeJob] Error message:', outerError.message);
    console.error('[processAnalyzeJob] Error stack:', outerError.stack);
    console.error('[processAnalyzeJob] ========================================');
    throw outerError;
  }
};

export const processImproveJob = async (inputData: {
  algorithmId: number;
  improvementDescription: string;
  improvementType?: string;
}, userId?: number): Promise<any> => {
  console.log('[processImproveJob] === Starting improve job ===');
  console.log('[processImproveJob] Algorithm ID:', inputData.algorithmId);
  console.log('[processImproveJob] Improvement description:', inputData.improvementDescription);
  console.log('[processImproveJob] Improvement type:', inputData.improvementType);
  console.log('[processImproveJob] User ID:', userId);
  
  try {
    const pool = getPool();
    console.log('[processImproveJob] Querying algorithm from database...');
    const [algorithms] = await pool.query(
      `SELECT name, inspiration, domain, description, principle, steps, pseudo_code, applications, tags
      FROM algorithms WHERE id = ?`,
      [inputData.algorithmId]
    ) as any[];

    if (algorithms.length === 0) {
      console.error('[processImproveJob] ❌ Algorithm not found!');
      throw new Error('Algorithm not found');
    }

    const algo = algorithms[0];
    console.log('[processImproveJob] Found algorithm:', algo.name);
    
    // Handle steps - could be string, array, or object
    let steps: any;
    if (typeof algo.steps === 'string') {
      steps = JSON.parse(algo.steps);
    } else if (Array.isArray(algo.steps)) {
      steps = algo.steps;
    } else {
      steps = algo.steps;
    }
    
    // Handle applications and tags similarly
    let applications: any = algo.applications;
    if (typeof applications === 'string') {
      try {
        applications = JSON.parse(applications);
      } catch {
        applications = applications.split(',').map((s: string) => s.trim());
      }
    }
    
    let tags: any = algo.tags;
    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags);
      } catch {
        tags = tags.split(',').map((s: string) => s.trim());
      }
    }
    
    console.log('[processImproveJob] Getting AI client...');
    const ai = await getAIClientAdapter(userId);
    console.log('[processImproveJob] AI client obtained');

    const prompt = `
      Improve the following bio-inspired algorithm based on this specific issue or enhancement request:
      
      ISSUE/ENHANCEMENT: ${inputData.improvementDescription}
      IMPROVEMENT TYPE: ${inputData.improvementType || 'general improvement'}
      
      CURRENT ALGORITHM:
      Name: ${algo.name}
      Inspiration: ${algo.inspiration}
      Domain: ${algo.domain}
      Description: ${algo.description}
      Principle: ${algo.principle}
      Steps: ${Array.isArray(steps) ? steps.join(' -> ') : JSON.stringify(steps)}
      Pseudo Code: ${algo.pseudo_code || 'N/A'}
      Applications: ${Array.isArray(applications) ? applications.join(', ') : applications}
      Tags: ${Array.isArray(tags) ? tags.join(', ') : tags}
      
      TASK: Generate an IMPROVED version of this algorithm that addresses the issue/enhancement request.
      The improved algorithm should:
      1. Maintain the core biological/physical inspiration and principle
      2. Address the specific issue or incorporate the requested enhancement
      3. Preserve what works well in the current algorithm
      4. Provide clear improvements in the description, steps, and pseudo code
      
      Return the improved algorithm in strict JSON format with the same structure as the original.
    `;

    const schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Name of the improved algorithm (can be same or updated)" },
        inspiration: { type: Type.STRING, description: "The biological/physical inspiration (should match original)" },
        domain: { type: Type.STRING, description: "The problem domain (can be updated if improvement changes it)" },
        description: { type: Type.STRING, description: "Updated description reflecting the improvements" },
        principle: { type: Type.STRING, description: "The core mechanism (can be enhanced)" },
        steps: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Improved step-by-step logic flow"
        },
        applications: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Updated potential use cases"
        },
        pseudoCode: { type: Type.STRING, description: "Updated pseudocode reflecting improvements" },
        tags: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Updated keywords"
        },
        improvementNote: { type: Type.STRING, description: "Brief note explaining what was improved" }
      },
      required: ["name", "inspiration", "domain", "description", "principle", "steps", "applications", "pseudoCode", "tags", "improvementNote"]
    };

    console.log('[processImproveJob] Using smart Gemini service...');
    console.log('[processImproveJob] Prompt length:', prompt.length);
    console.log('[processImproveJob] Prompt preview:', prompt.substring(0, 200));
    
    // Use the smart service that handles all parsing edge cases
    const result = await smartGenerateContent(
      prompt,
      schema,
      {
        userId,
        maxRetries: 3
      }
    );

    console.log('[processImproveJob] ✅ Received improved algorithm from smart Gemini service');
    console.log('[processImproveJob] Result type:', typeof result);
    console.log('[processImproveJob] Result keys:', result && typeof result === 'object' ? Object.keys(result) : 'N/A');
    
    return result;
  } catch (error: any) {
    console.error('[processImproveJob] ❌ Error in smart Gemini service:');
    console.error('[processImproveJob] Error type:', error.constructor.name);
    console.error('[processImproveJob] Error message:', error.message);
    console.error('[processImproveJob] Error stack:', error.stack);
    throw error;
  }
};
