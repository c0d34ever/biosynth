# Database Schema

The database consists of **6 tables** that are automatically created on first backend startup.

## Table Overview

### Core Tables
1. **users** - User accounts and authentication
2. **algorithms** - Generated and hybrid algorithms
3. **algorithm_versions** - Version history for algorithms
4. **algorithm_analysis** - Analysis results (sanity checks, blind spots, extensions)
5. **jobs** - Async job queue status tracking
6. **sessions** - JWT session management (for token blacklisting)

### Organization & Collaboration
7. **projects** - Organize algorithms into projects ⭐ NEW
8. **project_algorithms** - Many-to-many: projects ↔ algorithms ⭐ NEW
9. **collections** - User-created collections ⭐ NEW
10. **collection_algorithms** - Many-to-many: collections ↔ algorithms ⭐ NEW

### Social Features
11. **comments** - Comments and discussions on algorithms ⭐ NEW
12. **favorites** - User favorites/bookmarks ⭐ NEW
13. **shares** - Share algorithms with users ⭐ NEW
14. **algorithm_likes** - Like system ⭐ NEW
15. **notifications** - User notifications ⭐ NEW

### Additional Features
16. **exports** - Export history tracking ⭐ NEW
17. **templates** - Reusable algorithm templates ⭐ NEW
18. **user_profiles** - Extended user information ⭐ NEW
19. **activity_log** - Activity tracking and audit trail ⭐ NEW

### Problem-Solving & Analytics ⭐⭐ NEW
20. **problems** - Real-world problems to solve ⭐⭐ NEW
21. **problem_algorithms** - Algorithms used for problems ⭐⭐ NEW
22. **problem_solutions** - Solution tracking ⭐⭐ NEW
23. **algorithm_improvements** - Improvement tracking ⭐⭐ NEW
24. **algorithm_scores** - Comprehensive scoring system ⭐⭐ NEW
25. **algorithm_gaps** - Gap analysis ⭐⭐ NEW
26. **algorithm_strengths** - Strength analysis ⭐⭐ NEW
27. **algorithm_weaknesses** - Weakness analysis ⭐⭐ NEW
28. **algorithm_metrics** - Performance metrics ⭐⭐ NEW
29. **algorithm_combinations** - Algorithm combinations ⭐⭐ NEW
30. **combination_algorithms** - Algorithms in combinations ⭐⭐ NEW

---

## 1. `users` Table

Stores user accounts and authentication information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK, AUTO_INCREMENT) | Unique user ID |
| `email` | VARCHAR(255) UNIQUE | User email (unique) |
| `password_hash` | VARCHAR(255) | Bcrypt hashed password |
| `name` | VARCHAR(255) | User's display name (optional) |
| `role` | ENUM('user', 'admin') | User role (default: 'user') |
| `created_at` | TIMESTAMP | Account creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Indexes:**
- `idx_email` - Fast email lookups
- `idx_role` - Fast role-based queries

---

## 2. `algorithms` Table

Stores all generated and hybrid algorithms.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK, AUTO_INCREMENT) | Unique algorithm ID |
| `user_id` | INT (FK) | Owner user ID → `users.id` |
| `name` | VARCHAR(255) | Algorithm name |
| `inspiration` | VARCHAR(255) | Biological/physical inspiration source |
| `domain` | VARCHAR(255) | Problem domain |
| `description` | TEXT | Algorithm description |
| `principle` | TEXT | Core principle/mechanism |
| `steps` | JSON | Array of algorithm steps |
| `applications` | JSON | Array of use cases |
| `pseudo_code` | TEXT | Pseudocode representation |
| `tags` | JSON | Array of tags/keywords |
| `type` | ENUM('generated', 'hybrid') | Algorithm type |
| `parent_ids` | JSON | Array of parent algorithm IDs (for hybrids) |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Foreign Keys:**
- `user_id` → `users.id` (CASCADE DELETE)

**Indexes:**
- `idx_user_id` - Fast user algorithm queries
- `idx_type` - Filter by algorithm type
- `idx_created_at` - Sort by creation date

---

## 3. `algorithm_versions` Table

Stores version history when algorithms are edited.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK, AUTO_INCREMENT) | Version ID |
| `algorithm_id` | INT (FK) | Algorithm ID → `algorithms.id` |
| `name` | VARCHAR(255) | Algorithm name at this version |
| `description` | TEXT | Description at this version |
| `steps` | JSON | Steps at this version |
| `pseudo_code` | TEXT | Pseudocode at this version |
| `change_note` | TEXT | Optional note about what changed |
| `created_at` | TIMESTAMP | Version creation timestamp |

**Foreign Keys:**
- `algorithm_id` → `algorithms.id` (CASCADE DELETE)

**Indexes:**
- `idx_algorithm_id` - Fast version history queries

---

## 4. `algorithm_analysis` Table

Stores analysis results (sanity checks, blind spots, extensions).

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK, AUTO_INCREMENT) | Analysis ID |
| `algorithm_id` | INT (FK) | Algorithm ID → `algorithms.id` |
| `analysis_type` | ENUM('sanity', 'blind_spot', 'extension') | Type of analysis |
| `result` | JSON | Analysis result data |
| `created_at` | TIMESTAMP | Analysis timestamp |

**Foreign Keys:**
- `algorithm_id` → `algorithms.id` (CASCADE DELETE)

**Indexes:**
- `idx_algorithm_id` - Fast analysis queries
- `idx_analysis_type` - Filter by analysis type

**Result JSON Structure:**
- **sanity**: `{ score, verdict, analysis, gaps[] }`
- **blind_spot**: `{ risks[] }` where each risk has `{ risk, explanation, severity }`
- **extension**: `{ ideas[] }` where each idea has `{ name, description, benefit }`

---

## 5. `jobs` Table

Tracks async AI generation/analysis jobs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK, AUTO_INCREMENT) | Job ID |
| `user_id` | INT (FK) | User who created the job → `users.id` |
| `job_type` | ENUM('generate', 'synthesize', 'analyze') | Type of job |
| `status` | ENUM('pending', 'processing', 'completed', 'failed') | Current status |
| `input_data` | JSON | Input parameters for the job |
| `result_data` | JSON | Result data (when completed) |
| `error_message` | TEXT | Error message (if failed) |
| `created_at` | TIMESTAMP | Job creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |
| `completed_at` | TIMESTAMP | Completion timestamp (NULL if not completed) |

**Foreign Keys:**
- `user_id` → `users.id` (CASCADE DELETE)

**Indexes:**
- `idx_user_id` - Fast user job queries
- `idx_status` - Filter by job status
- `idx_job_type` - Filter by job type
- `idx_created_at` - Sort by creation date

**Job Flow:**
1. Created with status `pending`
2. Queue worker picks up → status `processing`
3. Completed → status `completed` with `result_data`
4. Failed → status `failed` with `error_message`

---

## 6. `sessions` Table

Stores JWT session information (for token blacklisting/logout).

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK, AUTO_INCREMENT) | Session ID |
| `user_id` | INT (FK) | User ID → `users.id` |
| `token_hash` | VARCHAR(255) | Hashed JWT token |
| `expires_at` | TIMESTAMP | Token expiration time |
| `created_at` | TIMESTAMP | Session creation timestamp |

**Foreign Keys:**
- `user_id` → `users.id` (CASCADE DELETE)

**Indexes:**
- `idx_user_id` - Fast user session queries
- `idx_expires_at` - Cleanup expired sessions

---

## Relationships Diagram

```
users (1) ──< (many) algorithms
                │
                ├──< (many) algorithm_versions
                │
                ├──< (many) algorithm_analysis
                │
users (1) ──< (many) jobs
                │
users (1) ──< (many) sessions
```

---

## Example Queries

### Get all algorithms for a user
```sql
SELECT * FROM algorithms WHERE user_id = 1 ORDER BY created_at DESC;
```

### Get algorithm with analysis
```sql
SELECT a.*, 
       (SELECT result FROM algorithm_analysis 
        WHERE algorithm_id = a.id AND analysis_type = 'sanity' 
        ORDER BY created_at DESC LIMIT 1) as sanity_check
FROM algorithms a
WHERE a.id = 1;
```

### Get pending jobs
```sql
SELECT * FROM jobs 
WHERE status = 'pending' 
ORDER BY created_at ASC;
```

### Get user statistics
```sql
SELECT 
  COUNT(*) as total_algorithms,
  COUNT(CASE WHEN type = 'hybrid' THEN 1 END) as hybrid_count
FROM algorithms
WHERE user_id = 1;
```

---

## New Tables (v2.0)

### 7. `projects` Table ⭐ NEW

Organize algorithms into projects for better workflow management.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Project ID |
| `user_id` | INT (FK) | Owner → `users.id` |
| `name` | VARCHAR(255) | Project name |
| `description` | TEXT | Project description |
| `color` | VARCHAR(7) | Hex color code (default: #10b981) |
| `is_archived` | BOOLEAN | Archive status |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update |

### 8. `project_algorithms` Table ⭐ NEW

Links algorithms to projects (many-to-many).

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Link ID |
| `project_id` | INT (FK) | → `projects.id` |
| `algorithm_id` | INT (FK) | → `algorithms.id` |
| `added_at` | TIMESTAMP | When added |

### 9. `collections` Table ⭐ NEW

User-created collections of algorithms (can be public).

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Collection ID |
| `user_id` | INT (FK) | Creator → `users.id` |
| `name` | VARCHAR(255) | Collection name |
| `description` | TEXT | Description |
| `is_public` | BOOLEAN | Public visibility |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update |

### 10. `collection_algorithms` Table ⭐ NEW

Links algorithms to collections.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Link ID |
| `collection_id` | INT (FK) | → `collections.id` |
| `algorithm_id` | INT (FK) | → `algorithms.id` |
| `added_at` | TIMESTAMP | When added |

### 11. `comments` Table ⭐ NEW

Threaded comments on algorithms.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Comment ID |
| `algorithm_id` | INT (FK) | → `algorithms.id` |
| `user_id` | INT (FK) | Author → `users.id` |
| `parent_id` | INT (FK, NULL) | Parent comment (for replies) |
| `content` | TEXT | Comment text |
| `is_edited` | BOOLEAN | Edit flag |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update |

### 12. `favorites` Table ⭐ NEW

User favorites/bookmarks.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Favorite ID |
| `user_id` | INT (FK) | User → `users.id` |
| `algorithm_id` | INT (FK) | Algorithm → `algorithms.id` |
| `created_at` | TIMESTAMP | When favorited |

### 13. `shares` Table ⭐ NEW

Algorithm sharing system.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Share ID |
| `algorithm_id` | INT (FK) | → `algorithms.id` |
| `shared_by_user_id` | INT (FK) | Sharer → `users.id` |
| `shared_with_user_id` | INT (FK, NULL) | Recipient (NULL = public) |
| `share_token` | VARCHAR(255) | Public share token |
| `permission` | ENUM | 'view', 'edit', 'comment' |
| `expires_at` | TIMESTAMP (NULL) | Expiration (NULL = never) |
| `is_public` | BOOLEAN | Public link flag |
| `created_at` | TIMESTAMP | Share time |

### 14. `notifications` Table ⭐ NEW

User notifications.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Notification ID |
| `user_id` | INT (FK) | Recipient → `users.id` |
| `type` | ENUM | 'comment', 'share', 'mention', 'system' |
| `title` | VARCHAR(255) | Notification title |
| `message` | TEXT | Notification message |
| `related_algorithm_id` | INT (FK, NULL) | Related algorithm |
| `related_user_id` | INT (FK, NULL) | Related user |
| `is_read` | BOOLEAN | Read status |
| `created_at` | TIMESTAMP | Creation time |

### 15. `exports` Table ⭐ NEW

Export history tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Export ID |
| `user_id` | INT (FK) | User → `users.id` |
| `algorithm_id` | INT (FK, NULL) | Single algorithm (NULL = multiple) |
| `export_type` | ENUM | 'json', 'pdf', 'markdown', 'collection' |
| `file_name` | VARCHAR(255) | Export filename |
| `file_path` | VARCHAR(500) | File storage path |
| `file_size` | INT | File size in bytes |
| `created_at` | TIMESTAMP | Export time |

### 16. `templates` Table ⭐ NEW

Reusable algorithm templates.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Template ID |
| `user_id` | INT (FK, NULL) | Creator (NULL = system) |
| `name` | VARCHAR(255) | Template name |
| `description` | TEXT | Description |
| `inspiration` | VARCHAR(255) | Inspiration source |
| `domain` | VARCHAR(255) | Problem domain |
| `principle` | TEXT | Core principle |
| `steps_template` | JSON | Template steps structure |
| `is_public` | BOOLEAN | Public template flag |
| `usage_count` | INT | Usage counter |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update |

### 17. `user_profiles` Table ⭐ NEW

Extended user information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Profile ID |
| `user_id` | INT (FK, UNIQUE) | → `users.id` |
| `bio` | TEXT | User biography |
| `avatar_url` | VARCHAR(500) | Avatar image URL |
| `website` | VARCHAR(255) | Personal website |
| `location` | VARCHAR(255) | User location |
| `preferences` | JSON | User preferences |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update |

### 18. `activity_log` Table ⭐ NEW

Activity tracking and audit trail.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Log entry ID |
| `user_id` | INT (FK) | User → `users.id` |
| `action_type` | ENUM | 'create', 'update', 'delete', 'share', 'export', 'analyze' |
| `entity_type` | ENUM | 'algorithm', 'project', 'collection', 'comment' |
| `entity_id` | INT | Entity ID |
| `metadata` | JSON | Additional metadata |
| `created_at` | TIMESTAMP | Action time |

### 19. `algorithm_likes` Table ⭐ NEW

Algorithm like system.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Like ID |
| `algorithm_id` | INT (FK) | → `algorithms.id` |
| `user_id` | INT (FK) | User → `users.id` |
| `created_at` | TIMESTAMP | Like time |

### Enhanced `algorithms` Table

New columns added:
- `visibility` ENUM('private', 'public', 'unlisted') - Visibility setting
- `view_count` INT - View counter
- `like_count` INT - Like counter

## Notes

- All tables use **InnoDB** engine for foreign key support
- **CASCADE DELETE**: Deleting a user deletes all their data
- **JSON columns**: Used for flexible data storage (steps, tags, analysis results, preferences)
- **Timestamps**: Auto-managed with `CURRENT_TIMESTAMP`
- **Unique constraints**: Prevent duplicates (favorites, likes, project-algorithm links)
- Tables are created automatically on backend startup if they don't exist
- New columns are added safely (won't fail if already exist)

