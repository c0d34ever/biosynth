# Automatic Algorithm Saving

## Current Implementation

The automation system **already automatically saves** all generated algorithms to the database. Here's how it works:

### 1. Daily Algorithm Generation (`generateDailyAlgorithms`)

- **Location**: `backend/src/services/automation.ts`
- **Function**: Generates 3-5 new algorithms daily
- **Saving**: ✅ Algorithms are automatically saved via `_saveAlgorithm()` at line 323
- **Database**: Saved to `algorithms` table with:
  - `user_id`: System user ID
  - `type`: 'generated'
  - `visibility`: 'public'
  - All algorithm fields (name, description, steps, etc.)

### 2. Auto-Synthesis (`autoSynthesizeAlgorithms`)

- **Location**: `backend/src/services/automation.ts`
- **Function**: Combines 2-3 top-performing algorithms into hybrid algorithms
- **Saving**: ✅ Hybrid algorithms are automatically saved via `_saveAlgorithm()` at line 396
- **Database**: Saved to `algorithms` table with:
  - `user_id`: System user ID
  - `type`: 'hybrid'
  - `parent_ids`: Array of parent algorithm IDs
  - `visibility`: 'public'

### 3. Algorithm Improvement (`improveAlgorithms`)

- **Location**: `backend/src/services/automation.ts`
- **Function**: Analyzes algorithms for gaps and improvements
- **Saving**: ⚠️ Currently only logs analysis results, doesn't create new improved versions
- **Note**: This could be enhanced to automatically create improved versions

## Database Schema

Algorithms are saved to the `algorithms` table with these fields:

```sql
INSERT INTO algorithms 
(user_id, name, inspiration, domain, description, principle, 
 steps, applications, pseudo_code, tags, type, parent_ids, visibility)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

## Verification

To verify algorithms are being saved:

```sql
-- Check system-generated algorithms
SELECT id, name, type, created_at, user_id 
FROM algorithms 
WHERE user_id = (SELECT id FROM users WHERE email = 'system@biosynth.ai')
ORDER BY created_at DESC
LIMIT 10;

-- Count by type
SELECT type, COUNT(*) as count 
FROM algorithms 
WHERE user_id = (SELECT id FROM users WHERE email = 'system@biosynth.ai')
GROUP BY type;
```

## Automation Logs

All automation activities are logged in the `automation_logs` table:

```sql
SELECT task_type, status, details, algorithm_id, created_at
FROM automation_logs
ORDER BY created_at DESC
LIMIT 20;
```

## Current Status

✅ **Working**: Daily generation and auto-synthesis automatically save algorithms
⚠️ **Could be enhanced**: Algorithm improvement could create new improved versions automatically

## Schedule

The automation runs daily via cron jobs configured in `backend/src/services/scheduler.ts`:
- Daily generation: Runs once per day
- Auto-synthesis: Runs once per day
- Algorithm improvement: Runs once per day

## Troubleshooting

If algorithms aren't being saved:

1. **Check automation logs**:
   ```bash
   docker logs biosynth-backend | grep -i "automation\|generated\|synthesized"
   ```

2. **Check database connection**:
   ```bash
   docker exec biosynth-backend npm run check-users
   ```

3. **Verify scheduler is running**:
   ```bash
   docker logs biosynth-backend | grep -i "scheduler\|cron"
   ```

4. **Check for errors**:
   ```bash
   docker logs biosynth-backend | grep -i "error\|failed"
   ```

5. **Manually trigger automation** (for testing):
   ```bash
   curl -X POST http://localhost:3001/api/automation/trigger \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"task": "generate"}'
   ```

