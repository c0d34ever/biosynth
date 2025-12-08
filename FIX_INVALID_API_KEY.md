# Fix: Invalid/Leaked API Key Error Handling

## Problem

The system was experiencing repeated failures due to a leaked/invalid Gemini API key:
- Error: `403 - Your API key was reported as leaked. Please use another API key.`
- Automation tasks were continuously retrying and failing
- Logs were spammed with error messages

## Solution Implemented

### 1. **Invalid API Key Detection**
- Added `isInvalidApiKeyError()` function to detect 403 errors with "leaked" or "invalid API key" messages
- Updated error handling to immediately stop retries when invalid API keys are detected
- Prevents wasted API calls and log spam

### 2. **Graceful Automation Handling**
- Automation services now detect invalid API keys and stop gracefully
- Instead of throwing fatal errors, automation logs the issue and exits cleanly
- Each automation function (generation, synthesis, improvement) handles invalid keys independently

### 3. **Improved Error Messages**
- Clear error messages indicating the API key needs to be updated
- Guidance on where to update the key (user settings or environment variables)
- Better logging to help diagnose issues

### 4. **Updated Files**
- `backend/src/services/geminiService.ts` - Added invalid API key detection
- `backend/src/services/aiProcessor.ts` - Stops retries on invalid keys
- `backend/src/services/automation.ts` - Graceful handling in automation
- `queue-worker/src/geminiService.ts` - Same improvements for queue worker
- `queue-worker/src/aiProcessor.ts` - Same improvements for queue worker

## What You Need to Do

### Option 1: Update API Key in Database (Recommended)
1. Get a new Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Update the global API key in your database:
   ```sql
   UPDATE global_settings 
   SET setting_value = 'YOUR_NEW_API_KEY' 
   WHERE setting_key = 'gemini_api_key';
   ```

### Option 2: Update Environment Variable
1. Get a new Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Update your `.env` file or `docker-compose.yml`:
   ```env
   GEMINI_API_KEY=YOUR_NEW_API_KEY
   ```
3. Restart your containers:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Option 3: Update User Settings (For User-Specific Keys)
1. Users can update their API key in the application settings
2. This takes precedence over global/environment keys

## How It Works Now

1. **API Key Priority** (in order):
   - User's API key from database (if userId provided)
   - Global API key from database settings
   - `GEMINI_API_KEY` environment variable
   - Default hardcoded key (fallback - should be replaced)

2. **Error Handling**:
   - Invalid API keys (403 with "leaked" message) are detected immediately
   - No retries are attempted for invalid keys
   - Automation stops gracefully with clear error messages
   - Logs indicate where to update the API key

3. **Automation Behavior**:
   - If API key is invalid, automation stops after first failure
   - Clear error messages in logs
   - No more spam of repeated failures

## Testing

After updating your API key:
1. Check logs - should see `[Gemini] Using API key from: global` (or `environment`/`user`)
2. Automation should run successfully
3. No more 403 errors in logs

## Notes

- The hardcoded default API key in the code is a fallback and should be replaced
- Consider removing the default key once you have a valid key configured
- Multiple API keys can be used (user-specific, global, or environment)

