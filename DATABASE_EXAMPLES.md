# Database Usage Examples

## Common Database Operations

### 1. View All Users

```sql
SELECT id, email, name, role, created_at 
FROM users 
ORDER BY created_at DESC;
```

### 2. Create Admin User Manually

```sql
-- First, hash a password using bcrypt (use Node.js or online tool)
-- Example hash for password "admin123": $2a$10$...

INSERT INTO users (email, password_hash, name, role) 
VALUES (
  'admin@example.com',
  '$2a$10$YourBcryptHashHere',
  'Admin User',
  'admin'
);
```

Or use the seed script:
```bash
cd backend
npm run seed
```

### 3. Get User's Algorithms with Statistics

```sql
SELECT 
  a.id,
  a.name,
  a.type,
  a.created_at,
  COUNT(DISTINCT av.id) as version_count,
  COUNT(DISTINCT aa.id) as analysis_count
FROM algorithms a
LEFT JOIN algorithm_versions av ON a.id = av.algorithm_id
LEFT JOIN algorithm_analysis aa ON a.id = aa.algorithm_id
WHERE a.user_id = 1
GROUP BY a.id
ORDER BY a.created_at DESC;
```

### 4. Get Algorithm with Latest Analysis

```sql
SELECT 
  a.*,
  (SELECT result FROM algorithm_analysis 
   WHERE algorithm_id = a.id 
   AND analysis_type = 'sanity' 
   ORDER BY created_at DESC LIMIT 1) as latest_sanity_check
FROM algorithms a
WHERE a.id = 1;
```

### 5. View Job Queue Status

```sql
-- Pending jobs
SELECT id, user_id, job_type, created_at 
FROM jobs 
WHERE status = 'pending' 
ORDER BY created_at ASC;

-- Failed jobs
SELECT id, user_id, job_type, error_message, created_at 
FROM jobs 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;

-- Job statistics
SELECT 
  job_type,
  status,
  COUNT(*) as count,
  AVG(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as avg_duration_seconds
FROM jobs
WHERE completed_at IS NOT NULL
GROUP BY job_type, status;
```

### 6. Clean Up Old Data

```sql
-- Delete expired sessions
DELETE FROM sessions 
WHERE expires_at < NOW();

-- Delete old failed jobs (older than 30 days)
DELETE FROM jobs 
WHERE status = 'failed' 
AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Archive old algorithm versions (keep only last 10 per algorithm)
DELETE av FROM algorithm_versions av
INNER JOIN (
  SELECT algorithm_id, id
  FROM algorithm_versions
  WHERE algorithm_id = av.algorithm_id
  ORDER BY created_at DESC
  LIMIT 999999 OFFSET 10
) to_delete ON av.id = to_delete.id;
```

### 7. Export User Data

```sql
-- Export all user's algorithms as JSON
SELECT 
  JSON_OBJECT(
    'id', a.id,
    'name', a.name,
    'type', a.type,
    'inspiration', a.inspiration,
    'domain', a.domain,
    'description', a.description,
    'steps', a.steps,
    'applications', a.applications,
    'tags', a.tags,
    'created_at', a.created_at
  ) as algorithm_json
FROM algorithms a
WHERE a.user_id = 1
ORDER BY a.created_at DESC;
```

### 8. Database Maintenance

```sql
-- Check table sizes
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.TABLES
WHERE table_schema = 'biosynth'
ORDER BY size_mb DESC;

-- Optimize tables
OPTIMIZE TABLE users, algorithms, algorithm_versions, algorithm_analysis, jobs, sessions;

-- Check foreign key constraints
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'biosynth'
AND REFERENCED_TABLE_NAME IS NOT NULL;
```

### 9. Backup and Restore

```bash
# Backup database
docker-compose exec mysql mysqldump -u root -p biosynth > backup.sql

# Restore database
docker-compose exec -T mysql mysql -u root -p biosynth < backup.sql
```

### 10. Reset Database (Development Only!)

```sql
-- WARNING: This deletes ALL data!
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE sessions;
TRUNCATE TABLE jobs;
TRUNCATE TABLE algorithm_analysis;
TRUNCATE TABLE algorithm_versions;
TRUNCATE TABLE algorithms;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;
```

## Using MySQL Client

### Connect to MySQL Container

```bash
# Using docker-compose
docker-compose exec mysql mysql -u root -p

# Or from host
mysql -h localhost -P 3306 -u root -p
```

### Common MySQL Commands

```sql
-- Show databases
SHOW DATABASES;

-- Use database
USE biosynth;

-- Show tables
SHOW TABLES;

-- Describe table structure
DESCRIBE algorithms;

-- Show table creation SQL
SHOW CREATE TABLE algorithms;

-- Count records
SELECT COUNT(*) FROM algorithms;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM jobs WHERE status = 'pending';
```

## Performance Tips

1. **Indexes**: Already created on frequently queried columns
2. **JSON Columns**: Use JSON functions for querying:
   ```sql
   SELECT * FROM algorithms 
   WHERE JSON_CONTAINS(tags, '"Optimization"');
   ```
3. **Pagination**: Always use LIMIT for large result sets
   ```sql
   SELECT * FROM algorithms 
   WHERE user_id = 1 
   ORDER BY created_at DESC 
   LIMIT 20 OFFSET 0;
   ```

## Monitoring Queries

```sql
-- Show running queries
SHOW PROCESSLIST;

-- Show table status
SHOW TABLE STATUS FROM biosynth;

-- Show index usage
SHOW INDEX FROM algorithms;
```

