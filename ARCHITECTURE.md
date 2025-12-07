# Architecture Overview

## Microservices Structure

### 1. Frontend Service
- **Technology**: React + TypeScript + Vite
- **Port**: 5173 (dev) / 80 (production)
- **Responsibilities**:
  - User interface
  - Authentication UI
  - Algorithm visualization
  - Admin panel
- **Communication**: REST API calls to backend

### 2. Backend API Service
- **Technology**: Node.js + Express + TypeScript
- **Port**: 3001
- **Responsibilities**:
  - REST API endpoints
  - Authentication (JWT)
  - Database operations
  - Job queue management
  - Admin endpoints
- **Endpoints**:
  - `/api/auth/*` - Authentication
  - `/api/algorithms/*` - Algorithm CRUD
  - `/api/jobs/*` - Job management
  - `/api/admin/*` - Admin operations

### 3. Queue Worker Service
- **Technology**: Node.js + TypeScript + BullMQ
- **Responsibilities**:
  - Process async AI generation jobs
  - Handle algorithm synthesis
  - Run algorithm analysis
- **Queue**: Redis-based job queue

### 4. MySQL Database
- **Port**: 3306
- **Tables**:
  - `users` - User accounts
  - `algorithms` - Generated algorithms
  - `algorithm_versions` - Version history
  - `algorithm_analysis` - Analysis results
  - `jobs` - Job status tracking
  - `sessions` - Session management

### 5. Redis
- **Port**: 6379
- **Purpose**: Message queue for async job processing

## Data Flow

### Algorithm Generation Flow
1. User submits generation request → Frontend
2. Frontend → Backend API (`POST /api/jobs`)
3. Backend creates job record → MySQL
4. Backend adds job → Redis queue
5. Queue Worker picks up job
6. Worker calls Gemini API
7. Worker saves result → MySQL
8. Frontend polls job status
9. Frontend displays result

### Authentication Flow
1. User logs in → Frontend
2. Frontend → Backend (`POST /api/auth/login`)
3. Backend validates credentials → MySQL
4. Backend generates JWT token
5. Frontend stores token
6. Frontend includes token in API requests

## Security

- **Authentication**: JWT tokens
- **Password Hashing**: bcryptjs
- **CORS**: Configured for frontend origin
- **Input Validation**: Zod schemas
- **SQL Injection**: Parameterized queries

## Scalability

- **Horizontal Scaling**: 
  - Multiple backend instances behind load balancer
  - Multiple queue workers for parallel processing
- **Database**: Connection pooling
- **Queue**: Redis supports distributed workers

## Deployment

### Docker Compose
All services are containerized and orchestrated via `docker-compose.yml`:
- Services communicate via Docker network
- Volumes for persistent data
- Health checks for dependencies

### Environment Variables
- Database credentials
- JWT secret
- API keys
- Service URLs

## Monitoring

- Health check endpoint: `/health`
- Job status tracking in database
- Error logging to console (can be extended to logging service)

## Future Enhancements

- WebSocket for real-time job updates
- Rate limiting
- Caching layer (Redis)
- File storage for exports
- Email notifications
- Advanced analytics

