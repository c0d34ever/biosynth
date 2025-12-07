# Gemini Model Configuration

## Current Model: `gemini-2.5-flash`

The application uses **`gemini-2.5-flash`** as the default model across all services.

### Why `gemini-2.5-flash`?

1. **Better Free Tier Support**: Higher rate limits on the free tier
2. **Faster Responses**: Optimized for speed
3. **Cost Effective**: Lower cost per request
4. **Good Quality**: Sufficient for algorithm generation and analysis tasks

### Model Comparison

| Model | Free Tier Rate Limit | Cost | Speed | Quality |
|-------|---------------------|------|-------|---------|
| `gemini-2.5-flash` | ✅ 15 requests/minute | Low | Fast | Good |
| `gemini-3-pro-preview` | ❌ 0 requests/day (free tier) | High | Slower | Excellent |
| `gemini-1.5-pro` | Limited | Medium | Medium | Very Good |

**Note**: `gemini-3-pro-preview` has **0 requests/day** on the free tier, which is why it was hitting quota limits immediately.

## Configuration

### Default Model Settings

- **Backend**: `backend/src/services/geminiService.ts` → `DEFAULT_MODEL = 'gemini-2.5-flash'`
- **Queue Worker**: `queue-worker/src/geminiService.ts` → `DEFAULT_MODEL = 'gemini-2.5-flash'` ✅ **Fixed**
- **AI Processor**: Uses `process.env.GEMINI_MODEL || 'gemini-2.5-flash'`

### Override via Environment Variable

You can override the model using the `GEMINI_MODEL` environment variable:

```bash
# In docker-compose.yml or .env
GEMINI_MODEL=gemini-1.5-pro
```

## Rate Limits

### Free Tier (Default API Key)

- **`gemini-2.5-flash`**: 15 requests per minute
- **`gemini-1.5-pro`**: 2 requests per minute
- **`gemini-3-pro-preview`**: 0 requests per day ❌

### Paid Tier

Rate limits are significantly higher with a paid API key. See: https://ai.google.dev/gemini-api/docs/rate-limits

## Why Quota Was Hit Easily

1. **Wrong Model**: Queue worker was using `gemini-3-pro-preview` (0 requests/day on free tier) ✅ **Fixed**
2. **Shared API Key**: All users sharing the same default API key
3. **No Rate Limiting**: Multiple concurrent requests hitting the same quota
4. **Retry Logic**: Failed requests retry immediately, consuming more quota

## Solutions

### 1. Use User-Specific API Keys

Each user can set their own API key in the database:
```sql
UPDATE users SET gemini_api_key = 'YOUR_API_KEY' WHERE id = USER_ID;
```

### 2. Set Global API Key in Database

Set a better API key in `global_settings`:
```sql
INSERT INTO global_settings (setting_key, setting_value, description)
VALUES ('gemini_api_key', 'YOUR_PAID_API_KEY', 'Default Gemini API key')
ON DUPLICATE KEY UPDATE setting_value = 'YOUR_PAID_API_KEY';
```

### 3. Add Request Throttling

The current retry logic uses exponential backoff, but you could add:
- Request queuing
- Per-user rate limiting
- Request batching

### 4. Upgrade API Key

Get a paid API key with higher rate limits from: https://makersuite.google.com/app/apikey

## Current Status

✅ **Fixed**: Queue worker now uses `gemini-2.5-flash` instead of `gemini-3-pro-preview`

## Next Steps

1. **Run database migration** to add `gemini_api_key` column:
   ```bash
   docker exec biosynth-backend npm run migrate-gemini-key
   ```

2. **Restart services**:
   ```bash
   docker-compose restart backend queue-worker
   ```

3. **Set your own API key** (recommended):
   - Via database: Update `users` or `global_settings` table
   - Via environment: Set `GEMINI_API_KEY` in `.env`

