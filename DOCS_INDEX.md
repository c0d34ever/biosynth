# Documentation Index

Complete guide to BioSynth Architect documentation.

## 🚀 Getting Started

1. **[QUICK_START.md](QUICK_START.md)** ⭐
   - 5-minute setup guide
   - Essential steps to get running
   - First login instructions

2. **[SETUP.md](SETUP.md)**
   - Detailed setup instructions
   - Manual setup (without Docker)
   - Environment configuration
   - Admin user creation

3. **[ENV_SETUP.md](ENV_SETUP.md)**
   - Environment variables explained
   - Why frontend doesn't need API keys
   - File locations and setup

## 🏗️ Architecture & Design

4. **[ARCHITECTURE.md](ARCHITECTURE.md)**
   - Microservices overview
   - Data flow diagrams
   - Service communication
   - Security model
   - Scalability considerations

## 💾 Database

5. **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**
   - Complete table structure
   - Column descriptions
   - Relationships and foreign keys
   - Indexes and constraints

6. **[DATABASE_EXAMPLES.md](DATABASE_EXAMPLES.md)**
   - Common SQL queries
   - User management
   - Data export examples
   - Maintenance operations
   - Performance tips

## 🔧 Operations

7. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**
   - Common issues and solutions
   - Docker problems
   - Database connection errors
   - API key issues
   - Debug techniques

## 📚 API Reference

8. **[README.md](README.md)** (Main README)
   - API endpoints overview
   - Authentication
   - Algorithm operations
   - Job management
   - Admin endpoints

## Quick Reference

### Setup Checklist
- [ ] Copy `.env.example` files
- [ ] Set `GEMINI_API_KEY` in backend and queue-worker
- [ ] Set `JWT_SECRET` and `DB_PASSWORD`
- [ ] Run `docker-compose up -d`
- [ ] Create admin user: `docker-compose exec backend npm run seed`

### Key Files
- `docker-compose.yml` - Service orchestration
- `backend/.env` - Backend configuration
- `queue-worker/.env` - Queue worker configuration
- `.env` - Root level (for docker-compose)

### Important URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

### Common Commands
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart a service
docker-compose restart backend

# Access MySQL
docker-compose exec mysql mysql -u root -p

# Create admin user
docker-compose exec backend npm run seed
```

## Need Help?

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) first
2. Review service logs: `docker-compose logs`
3. Verify environment variables are set correctly
4. Check database connection and Redis connectivity

