import { Type } from "@google/genai";
import mysql from 'mysql2/promise';
import { getAIClient, extractErrorMessage, isInvalidApiKeyError } from './geminiService.js';

// Default model - using gemini-2.5-flash for better free tier support
// gemini-3-pro-preview has 0 requests/day on free tier
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.5-flash'; // Fast, good free tier limits

// Note: getAIClient is imported from geminiService.ts and is synchronous

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

    // Convert response.text to string and log for debugging
    const responseTextStr = String(response.text);
    const trimmedResponse = responseTextStr.trim();
    const responseTextLower = trimmedResponse.toLowerCase();
    
    // Log raw response for debugging
    console.log('[Gemini] Raw response (first 200 chars):', trimmedResponse.substring(0, 200));
    console.log('[Gemini] Response length:', trimmedResponse.length);

    // Check if response is just plain text (like algorithm name) with no JSON
    if (!trimmedResponse.includes('{') && !trimmedResponse.includes('[')) {
      console.error('[Gemini] Response contains no JSON structure. Full response:', trimmedResponse);
      throw new Error(`AI returned plain text instead of JSON. Response: "${trimmedResponse.substring(0, 100)}..."`);
    }

    // Check if response looks like an error message or non-JSON text
    // Check for common error prefixes (case-insensitive) - check the first 100 chars
    const first100Chars = trimmedResponse.substring(0, 100).toLowerCase();
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
    // Also check if first 100 chars contain error keywords
    const containsErrorKeywords = first100Chars.includes('initialization') || 
                                   first100Chars.includes('loading') ||
                                   first100Chars.includes('processing') ||
                                   first100Chars.includes('please wait') ||
                                   first100Chars.includes('error');
    
    // If response starts with error or contains error keywords before any JSON, handle it
    if (startsWithError || (containsErrorKeywords && trimmedResponse.indexOf('{') > 50 && trimmedResponse.indexOf('[') > 50)) {
      console.error('[Gemini] Response appears to be an error or status message:', trimmedResponse.substring(0, 200));
      
      // Retry if it's an initialization/loading message
      if (retryCount < maxRetries && (responseTextLower.includes('initialization') || 
                                      responseTextLower.includes('loading') ||
                                      responseTextLower.includes('processing') ||
                                      responseTextLower.includes('initializing'))) {
        const waitTime = 2000 * (retryCount + 1); // 2s, 4s, 6s
        console.log(`[Gemini] Retrying after initialization/loading message (attempt ${retryCount + 1}/${maxRetries}, waiting ${waitTime}ms)...`);
        await sleep(waitTime);
        return generateContentWithErrorHandling(client, options, retryCount + 1, maxRetries);
      }
      
      throw new Error(`AI service returned a status message instead of JSON: "${trimmedResponse.substring(0, 100)}..."`);
    }

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
    let extractedJSON = extractJSON(responseText);
    
    // If extraction failed, try with original response text
    if (!extractedJSON) {
      extractedJSON = extractJSON(responseTextStr);
    }
    
    // Only proceed if we found valid JSON - don't try to parse text that doesn't contain JSON
    if (!extractedJSON) {
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
          if (extractedJSON) break;
        } else if (responseTextStr[i] === '[') {
          extractedJSON = tryExtractFromPosition(i, false);
          if (extractedJSON) break;
        }
      }
    }
    
    // If we still don't have JSON, throw a clear error
    if (!extractedJSON) {
      console.error('[Gemini] No valid JSON found in response. Full response:', responseTextStr.substring(0, 500));
      throw new Error(`AI returned a response that doesn't contain valid JSON. Response starts with: "${responseTextStr.substring(0, 50)}..."`);
    }
    
    // Validate extracted JSON starts with { or [
    const trimmedExtracted = extractedJSON.trim();
    if (!trimmedExtracted.startsWith('{') && !trimmedExtracted.startsWith('[')) {
      console.error('[Gemini] Extracted text does not start with { or [. Extracted:', trimmedExtracted.substring(0, 200));
      console.error('[Gemini] Full response:', responseTextStr.substring(0, 500));
      throw new Error(`AI returned a response that doesn't contain valid JSON. Extracted text starts with: "${trimmedExtracted.substring(0, 50)}..."`);
    }
    
    // Use extracted JSON
    responseText = trimmedExtracted;
    
    // Final safety check - ensure we're not trying to parse non-JSON text
    const firstChar = responseText.trim().charAt(0);
    if (firstChar !== '{' && firstChar !== '[') {
      console.error('[Gemini] CRITICAL: About to parse non-JSON text! First char:', firstChar);
      console.error('[Gemini] Full response:', responseTextStr);
      console.error('[Gemini] Extracted text:', responseText);
      throw new Error(`Cannot parse non-JSON text. Text starts with: "${responseText.substring(0, 50)}..."`);
    }
    
    // Additional safety check: ensure extracted text doesn't start with error keywords
    const trimmedForCheck = responseText.trim();
    const first100ForCheck = trimmedForCheck.substring(0, 100).toLowerCase();
    if (first100ForCheck.includes('initialization') || 
        first100ForCheck.includes('loading') ||
        first100ForCheck.includes('processing') ||
        first100ForCheck.includes('please wait') ||
        first100ForCheck.includes('error') ||
        first100ForCheck.includes('failed')) {
      console.error('[Gemini] CRITICAL: Extracted text contains error keywords!');
      console.error('[Gemini] Extracted text:', trimmedForCheck.substring(0, 200));
      console.error('[Gemini] Full response:', responseTextStr.substring(0, 500));
      
      // Retry if it's an initialization/loading message
      if (retryCount < maxRetries && (first100ForCheck.includes('initialization') || 
                                      first100ForCheck.includes('loading') ||
                                      first100ForCheck.includes('processing'))) {
        const waitTime = 2000 * (retryCount + 1); // 2s, 4s, 6s
        console.log(`[Gemini] Retrying after detecting error keywords in extracted text (attempt ${retryCount + 1}/${maxRetries}, waiting ${waitTime}ms)...`);
        await sleep(waitTime);
        return generateContentWithErrorHandling(client, options, retryCount + 1, maxRetries);
      }
      
      throw new Error(`AI service returned a response with error keywords. Extracted text starts with: "${trimmedForCheck.substring(0, 100)}..."`);
    }
    
    // Log what we're about to parse (for debugging)
    console.log('[Gemini] Attempting to parse extracted JSON. Length:', responseText.length);
    console.log('[Gemini] First 100 chars of extracted JSON:', responseText.substring(0, 100));
    
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError: any) {
      // Log the full response for debugging (first 500 chars)
      console.error('[Gemini] Failed to parse JSON response. Full response:', responseTextStr.substring(0, 500));
      console.error('[Gemini] Extracted text (first 200 chars):', responseText.substring(0, 200));
      console.error('[Gemini] Extracted text (last 200 chars):', responseText.substring(Math.max(0, responseText.length - 200)));
      console.error('[Gemini] Parse error:', parseError.message);
      
      // Check if the error is due to error keywords in the response
      const errorMsg = parseError.message?.toLowerCase() || '';
      const extractedLower = responseText.substring(0, 200).toLowerCase();
      if (errorMsg.includes('unexpected token') && 
          (extractedLower.includes('initialization') || 
           extractedLower.includes('loading') ||
           extractedLower.includes('processing') ||
           extractedLower.includes('error'))) {
        console.error('[Gemini] Parse error appears to be due to error keywords in response');
        
        // Retry if it's an initialization/loading message
        if (retryCount < maxRetries && (extractedLower.includes('initialization') || 
                                        extractedLower.includes('loading') ||
                                        extractedLower.includes('processing'))) {
          const waitTime = 2000 * (retryCount + 1); // 2s, 4s, 6s
          console.log(`[Gemini] Retrying after JSON parse error with error keywords (attempt ${retryCount + 1}/${maxRetries}, waiting ${waitTime}ms)...`);
          await sleep(waitTime);
          return generateContentWithErrorHandling(client, options, retryCount + 1, maxRetries);
        }
        
        throw new Error(`AI service returned a response that cannot be parsed as JSON. The response appears to contain error or status messages. Please try again. Original error: ${parseError.message}`);
      }
      
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
      for (let i = 0; i < responseTextStr.length; i++) {
        if (responseTextStr[i] === '{') {
          const extracted = tryExtractFromPosition(i, true);
          if (extracted) {
            try {
              parsedResponse = JSON.parse(extracted);
              console.log('[Gemini] Successfully extracted JSON using position-based extraction');
              break;
            } catch (e) {
              // Continue searching
            }
          }
        } else if (responseTextStr[i] === '[') {
          const extracted = tryExtractFromPosition(i, false);
          if (extracted) {
            try {
              parsedResponse = JSON.parse(extracted);
              console.log('[Gemini] Successfully extracted JSON using position-based extraction');
              break;
            } catch (e) {
              // Continue searching
            }
          }
        }
      }
      
      // If we still can't parse, throw error
      if (!parsedResponse) {
        throw new Error(`AI returned invalid JSON. The response may contain non-JSON text. Please try again. Original error: ${parseError.message}`);
      }
    }

    // Validate and transform response to ensure arrays are arrays
    if (parsedResponse.steps && typeof parsedResponse.steps === 'string') {
      // If steps is a string, try to split by comma or convert to array
      parsedResponse.steps = parsedResponse.steps.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    }
    if (parsedResponse.applications && typeof parsedResponse.applications === 'string') {
      parsedResponse.applications = parsedResponse.applications.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    }
    if (parsedResponse.tags && typeof parsedResponse.tags === 'string') {
      parsedResponse.tags = parsedResponse.tags.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    }

    return parsedResponse;
  } catch (error: any) {
    const statusCode = error.status || error.error?.code || error.code;
    const isRateLimit = statusCode === 429 || error.error?.status === 'RESOURCE_EXHAUSTED';
    const isInvalidKey = isInvalidApiKeyError(error);
    
    // Don't retry on invalid API key errors - they won't succeed
    if (isInvalidKey) {
      console.error('[Gemini] ❌ Invalid/leaked API key detected - stopping retries');
      const errorMessage = extractErrorMessage(error);
      const apiError = new Error(errorMessage);
      (apiError as any).status = statusCode;
      (apiError as any).isInvalidApiKey = true;
      throw apiError;
    }
    
    // Retry logic for rate limit errors
    if (isRateLimit && retryCount < maxRetries) {
      const retryDelay = extractRetryDelay(error);
      const delay = retryDelay || Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
      
      // Wait for retry delay before retrying
      console.log(`[Gemini] Rate limit hit, retrying in ${delay/1000}s (attempt ${retryCount + 1}/${maxRetries})...`);
      await sleep(delay);
      
      // Retry the request
      return generateContentWithErrorHandling(client, options, retryCount + 1, maxRetries);
    }
    
    // Extract user-friendly error message
    const errorMessage = extractErrorMessage(error);
    const apiError = new Error(errorMessage);
    
    // Preserve status code for quota detection
    if (statusCode) {
      (apiError as any).status = statusCode;
    }
    
    throw apiError;
  }
};

export const processGenerateJob = async (inputData: {
  inspiration: string;
  domain: string;
}, userId?: number): Promise<any> => {
  const ai = await getAIClient(userId);
  
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
  const ai = await getAIClient(userId);

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
}, pool: mysql.Pool, userId?: number): Promise<any> => {
  const [algorithms] = await pool.query(
    `SELECT name, inspiration, domain, description, principle, steps, pseudo_code
    FROM algorithms WHERE id = ?`,
    [inputData.algorithmId]
  ) as any[];

  if (algorithms.length === 0) {
    throw new Error('Algorithm not found');
  }

  const algo = algorithms[0];
  const steps = JSON.parse(algo.steps);
  const ai = await getAIClient(userId);

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

  const result = await generateContentWithErrorHandling(ai, {
    contents: prompt,
    responseMimeType: "application/json",
    responseSchema: schema
  });

  // Save analysis to database
  await pool.query(
    `INSERT INTO algorithm_analysis (algorithm_id, analysis_type, result)
    VALUES (?, ?, ?)`,
    [inputData.algorithmId, inputData.analysisType, JSON.stringify(result)]
  );

  return result;
};

export const processImproveJob = async (inputData: {
  algorithmId: number;
  improvementDescription: string;
  improvementType?: string;
}, pool: mysql.Pool, userId?: number): Promise<any> => {
  const [algorithms] = await pool.query(
    `SELECT name, inspiration, domain, description, principle, steps, pseudo_code, applications, tags
    FROM algorithms WHERE id = ?`,
    [inputData.algorithmId]
  ) as any[];

  if (algorithms.length === 0) {
    throw new Error('Algorithm not found');
  }

  const algo = algorithms[0];
  
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
  
  const ai = await getAIClient(userId);

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

  const result = await generateContentWithErrorHandling(ai, {
    contents: prompt,
    responseMimeType: "application/json",
    responseSchema: {
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
    }
  });

  return result;
};

