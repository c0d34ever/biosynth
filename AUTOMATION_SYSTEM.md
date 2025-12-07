# Automation System

The BioSynth Architect system includes automatic daily algorithm generation and combination.

## Automatic Daily Tasks

### 1. Algorithm Generation
- **Schedule**: Daily at 3:00 AM UTC (configurable via `GENERATION_CRON` env variable)
- **Count**: 3-5 algorithms per day (configurable via `DAILY_ALGORITHMS_MIN` and `DAILY_ALGORITHMS_MAX`)
- **Process**:
  - Uses AI to generate diverse problem ideas from database problems or creates new ones
  - Generates bio-inspired algorithms for each problem
  - Saves algorithms as public, system-generated content
  - Logs all activities in `automation_logs` table

### 2. Algorithm Synthesis/Combination
- **Schedule**: Daily at 4:00 AM UTC (configurable via `SYNTHESIS_CRON` env variable)
- **Count**: 2-4 hybrid algorithms per day (configurable via `DAILY_SYNTHESES_MIN` and `DAILY_SYNTHESES_MAX`)
- **Process**:
  - Selects top-performing algorithms (by likes, views, scores)
  - Combines 2-3 algorithms to create hybrid solutions
  - Focuses on complex problem domains
  - Saves as hybrid type algorithms with parent references
  - Logs all activities

### 3. Full Automation Cycle
- **Schedule**: Daily at 2:00 AM UTC (configurable via `AUTOMATION_CRON` env variable)
- **Process**: Runs all automation tasks (generation + synthesis + improvement analysis)

## Configuration

### Environment Variables

```env
# Enable/disable automation (default: enabled)
AUTOMATION_ENABLED=true

# Cron schedules (default: daily at specified times)
AUTOMATION_CRON=0 2 * * *      # Full automation at 2 AM
GENERATION_CRON=0 3 * * *      # Generation at 3 AM
SYNTHESIS_CRON=0 4 * * *       # Synthesis at 4 AM

# Algorithm counts per day
DAILY_ALGORITHMS_MIN=3         # Minimum algorithms to generate
DAILY_ALGORITHMS_MAX=5         # Maximum algorithms to generate
DAILY_SYNTHESES_MIN=2          # Minimum syntheses to perform
DAILY_SYNTHESES_MAX=4          # Maximum syntheses to perform

# Other settings
TOP_ALGORITHMS_FOR_SYNTHESIS=15  # Top algorithms to consider for synthesis
UNANALYZED_ALGORITHMS_LIMIT=5    # Algorithms to analyze for improvement
ANALYSIS_INTERVAL_DAYS=7         # Days before re-analyzing algorithms
```

### Constants (backend/src/constants.ts)

The automation configuration can also be adjusted in the constants file, with environment variable overrides taking precedence.

## System User

All automated algorithms are created by a system user:
- **Email**: `system@biosynth.ai`
- **Name**: `BioSynth System`
- **Role**: `admin`

This user is automatically created if it doesn't exist.

## Monitoring

### Admin Panel

The Admin panel (System tab) provides:
- **Scheduler Status**: View if automation is active
- **Schedule Times**: See when tasks are scheduled
- **Statistics**: View success/failure counts
- **Manual Triggers**: Run automation tasks immediately
- **Recent Logs**: View recent automation activity

### Automation Logs

All automation activities are logged in the `automation_logs` table with:
- Task type (daily_generation, auto_synthesis, algorithm_improvement)
- Status (success, failed, analysis_complete)
- Details (JSON with algorithm IDs, names, etc.)
- Timestamps

## Manual Triggers

Admins can manually trigger automation tasks via:
1. **Admin Panel**: System tab → Manual Triggers section
2. **API**: `POST /api/automation/trigger` with `task` parameter:
   - `generate` - Generate algorithms only
   - `synthesize` - Synthesize algorithms only
   - `improve` - Analyze and improve algorithms only
   - `all` - Run all tasks

## Verification

To verify automation is working:
1. Check server logs for scheduler startup messages
2. Check Admin panel → System tab for scheduler status
3. View automation logs in the Admin panel
4. Check for new algorithms created by `system@biosynth.ai`

## Troubleshooting

### Automation Not Running

1. Check `AUTOMATION_ENABLED` is not set to `false`
2. Verify scheduler started (check server startup logs)
3. Check timezone settings (`TZ` environment variable)
4. Review automation logs for errors

### Low Algorithm Count

1. Check AI service (Gemini API) is working
2. Verify database connection
3. Check for errors in automation logs
4. Ensure system user exists

### Synthesis Not Working

1. Verify there are at least 2 public algorithms
2. Check algorithm scores/likes/views exist
3. Review synthesis logs for specific errors
