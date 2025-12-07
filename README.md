# BioSynth Architect - Microservices Architecture

A bio-inspired algorithm generation platform built with microservices architecture, featuring authentication, admin panel, and async job processing.

## Architecture

The application consists of the following microservices:

- **Frontend**: React + TypeScript + Vite
- **Backend API**: Node.js + Express + TypeScript
- **Queue Worker**: Background job processor for AI generation tasks
- **MySQL**: Database for persistent storage
- **Redis**: Message queue for async job processing

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- MySQL server (or use Docker)
- Redis (or use Docker)

## Quick Start with Docker

1. **Clone and setup environment:**

```bash
# Copy environment file (root level for docker-compose)
cp .env.example .env

# Copy backend environment file
cp backend/env.example backend/.env

# Copy queue-worker environment file  
cp queue-worker/env.example queue-worker/.env

# Edit .env files and set your GEMINI_API_KEY and other variables
# NOTE: GEMINI_API_KEY is only needed in backend/.env and queue-worker/.env, NOT in frontend!
```

2. **Start all services:**

```bash
docker-compose up -d
```

3. **Access the application:**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- MySQL: localhost:3306
- Redis: localhost:6379

## Local Development

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Queue Worker

```bash
cd queue-worker
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Frontend

```bash
npm install
cp .env.example .env.local
# Edit .env.local with VITE_API_URL
npm run dev
```

## Database Setup

The database schema is automatically created on first run. Tables include:

- `users` - User accounts and authentication
- `algorithms` - Generated and hybrid algorithms
- `algorithm_versions` - Version history
- `algorithm_analysis` - Analysis results
- `jobs` - Async job queue status
- `sessions` - JWT session management

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Algorithms
- `GET /api/algorithms` - List user's algorithms
- `GET /api/algorithms/:id` - Get algorithm details
- `POST /api/algorithms` - Create algorithm
- `PUT /api/algorithms/:id` - Update algorithm
- `DELETE /api/algorithms/:id` - Delete algorithm

### Jobs
- `POST /api/jobs` - Create async job (generate/synthesize/analyze)
- `GET /api/jobs` - List user's jobs
- `GET /api/jobs/:id` - Get job status

### Problems & Problem-Solving ⭐ NEW
- `GET /api/problems` - List problems
- `POST /api/problems` - Create problem
- `GET /api/problems/:id` - Get problem with algorithms
- `POST /api/problems/:id/algorithms` - Add algorithm to problem
- `GET /api/problems/:id/recommendations` - Get recommended algorithms

### Analytics & Scoring ⭐ NEW
- `GET /api/analytics/:id/scores` - Get algorithm scores
- `POST /api/analytics/:id/scores` - Score algorithm
- `GET /api/analytics/:id/gaps` - Get gaps
- `POST /api/analytics/:id/gaps` - Identify gap
- `GET /api/analytics/:id/strengths` - Get strengths
- `POST /api/analytics/:id/strengths` - Document strength
- `GET /api/analytics/:id/weaknesses` - Get weaknesses
- `POST /api/analytics/:id/weaknesses` - Document weakness
- `GET /api/analytics/:id/analytics` - Comprehensive analytics

### Improvements ⭐ NEW
- `GET /api/improvements/algorithm/:id` - Get improvements
- `POST /api/improvements/algorithm/:id` - Suggest improvement
- `PATCH /api/improvements/:id` - Update improvement status

### Combinations ⭐ NEW
- `GET /api/combinations` - List combinations
- `POST /api/combinations` - Create combination
- `GET /api/combinations/recommendations/problem/:id` - Get recommendations

### Metrics ⭐ NEW
- `GET /api/metrics/algorithm/:id` - Get metrics
- `POST /api/metrics/algorithm/:id` - Add metric
- `GET /api/metrics/algorithm/:id/statistics` - Get statistics

### Admin (requires admin role)
- `GET /api/admin/users` - List all users
- `GET /api/admin/stats/*` - System statistics
- `PATCH /api/admin/users/:id/role` - Update user role
- `DELETE /api/admin/users/:id` - Delete user

## Environment Variables

See `.env.example` for all required environment variables.

## Features

### Core Features
- ✅ User authentication (JWT)
- ✅ Algorithm generation via AI
- ✅ Algorithm synthesis (hybrid systems)
- ✅ Async job processing with Redis queue
- ✅ Admin panel for user management
- ✅ Database persistence with MySQL
- ✅ Docker deployment ready

### Organization & Collaboration
- ✅ Projects - Organize algorithms into projects
- ✅ Collections - Create public/private collections
- ✅ Comments - Threaded discussions
- ✅ Favorites - Bookmark algorithms
- ✅ Sharing - Share with users or public links
- ✅ Likes - Like algorithms

### Problem-Solving & Analytics ⭐ NEW
- ✅ **Problems** - Define real-world problems and solve them
- ✅ **Algorithm Combinations** - Combine algorithms for complex solutions
- ✅ **Improvements** - Track and implement algorithm improvements
- ✅ **Scoring System** - Multi-dimensional algorithm scoring
- ✅ **Gap Analysis** - Identify gaps in algorithms
- ✅ **Strengths/Weaknesses** - Comprehensive analysis
- ✅ **Performance Metrics** - Track execution metrics
- ✅ **Solution Tracking** - Track problem-solving attempts

## Production Deployment

1. Update all secrets in `.env`
2. Set `NODE_ENV=production`
3. Use a reverse proxy (nginx) for frontend
4. Configure SSL certificates
5. Set up database backups
6. Monitor logs and health endpoints

## Documentation

- **[QUICK_START.md](QUICK_START.md)** - Get started in 5 minutes
- **[SETUP.md](SETUP.md)** - Detailed setup instructions
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture overview
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Complete database schema (19 tables!)
- **[DATABASE_EXAMPLES.md](DATABASE_EXAMPLES.md)** - SQL queries and examples
- **[ENV_SETUP.md](ENV_SETUP.md)** - Environment variables guide
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions
- **[NEW_FEATURES.md](NEW_FEATURES.md)** - New features and functionality ⭐
- **[PROBLEM_SOLVING_FEATURES.md](PROBLEM_SOLVING_FEATURES.md)** - Problem-solving workflows & analytics ⭐⭐

## License

MIT
