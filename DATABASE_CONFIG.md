# Database Configuration

## Current Setup: Remote Database

The application is configured to use a **remote MySQL database** instead of a local Docker container.

### Remote Database Details:
- **Host**: `162.241.86.188`
- **Port**: `3306`
- **User**: `youtigyk_bioalgo`
- **Password**: `Sun12day46fun`
- **Database**: `youtigyk_bioalgo`

## Configuration Files

### 1. `docker-compose.yml`
- **Backend** and **Queue-Worker** services are configured to use the remote database
- MySQL service is commented out (not needed)
- Default values point to the remote database

### 2. `backend/env.example`
- Contains the remote database credentials
- Copy to `backend/.env` for local development

### 3. Environment Variables

You can override the database settings using environment variables:

```bash
# In docker-compose.yml or .env file
DB_HOST=162.241.86.188
DB_PORT=3306
DB_USER=youtigyk_bioalgo
DB_PASSWORD=Sun12day46fun
DB_NAME=youtigyk_bioalgo
```

## Connecting to the Database

### Direct MySQL Connection:
```bash
mysql -h 162.241.86.188 -u youtigyk_bioalgo -p youtigyk_bioalgo
# Password: Sun12day46fun
```

### Check Users:
```sql
SELECT id, email, name, role, created_at FROM users;
```

### Create User via Backend:
```bash
# If backend is running locally
cd backend
npm run seed  # Creates admin@biosynth.com / admin123

# Or create custom user
npm run create-user your@email.com password YourName admin
```

### Create User via API:
```bash
curl -X POST https://biosynth.youtilitybox.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password",
    "name": "Your Name"
  }'
```

## Switching to Local Database

If you want to use a local MySQL Docker container instead:

1. **Uncomment MySQL service** in `docker-compose.yml`:
   ```yaml
   mysql:
     image: mysql:8.0
     container_name: biosynth-mysql
     # ... rest of config
   ```

2. **Update backend/queue-worker** to use local MySQL:
   ```yaml
   DB_HOST: mysql  # Docker service name
   DB_USER: root
   DB_PASSWORD: your_password
   DB_NAME: biosynth
   ```

3. **Update depends_on** to include MySQL:
   ```yaml
   depends_on:
     mysql:
       condition: service_healthy
     redis:
       condition: service_healthy
   ```

## Troubleshooting

### Connection Issues

1. **Check if remote database is accessible:**
   ```bash
   mysql -h 162.241.86.188 -u youtigyk_bioalgo -p youtigyk_bioalgo
   ```

2. **Check backend logs:**
   ```bash
   docker logs biosynth-backend | grep -i "database\|connection\|error"
   ```

3. **Verify environment variables:**
   ```bash
   docker exec biosynth-backend env | grep DB_
   ```

### No Users Found

If you can't find users in the database:

1. **Check if users table exists:**
   ```sql
   SHOW TABLES LIKE 'users';
   ```

2. **Create a user:**
   - Via API registration (easiest)
   - Via backend seed script
   - Via direct SQL (requires password hashing)

## Security Notes

⚠️ **Important**: 
- Database credentials are in plain text in configuration files
- For production, use environment variables or secrets management
- Never commit `.env` files with real credentials to version control
- Change default passwords immediately

