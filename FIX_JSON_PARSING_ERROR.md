# Fix: JSON Parsing Error in Analysis Jobs

## Problem

When running analysis, ideate, and other AI-powered features, you were getting errors like:
```
❌ Job 21 (analyze) failed: Unexpected token 'I', "Initializa"... is not valid JSON
```

## Root Cause

The Gemini API sometimes returns responses that:
1. Start with text like "Initialization..." instead of valid JSON
2. Have extra text before or after the JSON
3. Return error messages instead of the expected JSON format

## Solution

I've improved the JSON parsing logic in both `backend/src/services/aiProcessor.ts` and `queue-worker/src/aiProcessor.ts` to:

### 1. **Smart JSON Extraction**
- Automatically finds JSON objects/arrays even if surrounded by text
- Handles responses that have prefixes or suffixes
- Uses regex fallback if initial parsing fails

### 2. **Error Detection**
- Detects when responses are error messages (starting with "error", "initialization", "failed", etc.)
- Provides clearer error messages
- Automatically retries on initialization errors

### 3. **Better Logging**
- Logs full response (first 500 chars) for debugging
- Shows extracted JSON text
- Displays parse errors clearly

## What Changed

The `generateContentWithErrorHandling` function now:
1. Checks if response is an error message before parsing
2. Extracts JSON from text that might have extra content
3. Retries on initialization errors
4. Provides better error messages

## Testing

Try running analysis/ideate again. The errors should be resolved. If you still see issues:

1. **Check backend logs** - Look for `[Gemini]` messages to see what's being returned
2. **Verify API key** - Make sure `GEMINI_API_KEY` is set correctly in `backend/.env`
3. **Check API quota** - The error might be due to rate limits or quota exhaustion

## Example Logs

You'll now see more detailed logs like:
```
[Gemini] Failed to parse JSON response. Full response: Initialization...
[Gemini] Extracted text: {...}
[Gemini] Parse error: Unexpected token...
```

Or if JSON is successfully extracted:
```
[Gemini] Successfully extracted JSON using regex fallback
```

## Next Steps

1. Restart your backend server to apply the changes
2. Try running analysis/ideate again
3. If errors persist, check the backend logs for detailed error messages

