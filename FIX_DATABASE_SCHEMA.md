# Fix Database Schema - Add gemini_api_key Column

## Problem

The `users` table is missing the `gemini_api_key` column, causing this error:
```
Unknown column 'gemini_api_key' in 'field list'
```

## Solution

Run the migration script to add the missing column to your existing database.

### Option 1: Using Docker (Recommended)

```bash
# Run migration inside backend container
docker exec biosynth-backend npm run migrate-gemini-key
```

### Option 2: Direct MySQL Connection

Connect to your database and run:

```sql
-- Check if column exists
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'gemini_api_key';

-- If no results, add the column
ALTER TABLE users 
ADD COLUMN gemini_api_key VARCHAR(500) NULL;
```

### Option 3: Local Development

If running backend locally (not in Docker):

```bash
cd backend
npm run migrate-gemini-key
```

## Verify Fix

After running the migration, verify the column exists:

```sql
DESCRIBE users;
-- Should show gemini_api_key column
```

Or check via backend:

```bash
docker exec biosynth-backend npm run check-users
```

## Also Check: global_settings Table

The migration script will also create the `global_settings` table if it doesn't exist and add a default API key. This is used as a fallback when users don't have their own API key.

## Restart Services

After running the migration, restart the services:

```bash
docker-compose restart backend queue-worker
```

## Additional Notes

- The `gemini_api_key` column is optional (NULL) - users can have their own API key or use the global default
- The migration is idempotent - safe to run multiple times
- The schema file has been updated to automatically add this column for new databases

