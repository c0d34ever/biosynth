# BioSynth Architect - API Reference

Complete API reference for all endpoints, including the 6 new major features.

## Base URL
```
http://localhost:3001/api
```

## Authentication
Most endpoints require authentication. Include JWT token in header:
```
Authorization: Bearer <token>
```

---

## 🔐 Authentication

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Get Current User
```http
GET /api/auth/me
```

---

## 💻 Code Generation & Execution

### Generate Code
```http
POST /api/code/generate/:algorithmId
Content-Type: application/json

{
  "language": "python",  // python, javascript, java, cpp, typescript, go, rust
  "version": "1.0.0"     // optional
}
```

**Response:**
```json
{
  "id": 1,
  "code": "def algorithm(...): ...",
  "language": "python"
}
```

### Get Code Generations
```http
GET /api/code/generations/:algorithmId
```

### Get Code Generation Details
```http
GET /api/code/generations/:generationId/details
```

### Update Code Generation
```http
PUT /api/code/generations/:generationId
Content-Type: application/json

{
  "code": "updated code...",
  "version": "1.1.0"
}
```

### Delete Code Generation
```http
DELETE /api/code/generations/:generationId
```

### Execute Code
```http
POST /api/code/execute/:generationId
Content-Type: application/json

{
  "inputData": {},      // optional
  "timeout": 30000,     // optional, milliseconds
  "language": "python"  // optional
}
```

**Response:**
```json
{
  "id": 1,
  "status": "completed",
  "output": "result...",
  "error": null
}
```

### Get Execution History
```http
GET /api/code/executions/:generationId?limit=50
```

### Get Execution Details
```http
GET /api/code/executions/:executionId/details
```

---

## 🧪 Testing & Validation

### Generate Tests
```http
POST /api/testing/generate/:algorithmId
Content-Type: application/json

{
  "testType": "unit"  // unit, integration, performance, regression
}
```

**Response:**
```json
[
  {
    "id": 1,
    "testName": "Test Algorithm Basic",
    "testCode": "def test_algorithm(): ..."
  }
]
```

### Get Tests
```http
GET /api/testing/:algorithmId
```

### Run Tests
```http
POST /api/testing/run
Content-Type: application/json

{
  "testIds": [1, 2, 3],
  "codeGenerationId": 5  // optional, null to skip execution
}
```

**Response:**
```json
[
  {
    "testId": 1,
    "resultId": 10,
    "status": "passed",
    "executionTime": 150,
    "actualResult": {...}
  }
]
```

### Get Test Results
```http
GET /api/testing/results/:testId?limit=50
```

---

## 🌿 Version Control & Branching

### Create Branch
```http
POST /api/version-control/branches/:algorithmId
Content-Type: application/json

{
  "branchName": "feature-optimization",
  "description": "Optimization improvements",
  "parentBranchId": 1,      // optional
  "parentVersionId": 5       // optional
}
```

### Get Branches
```http
GET /api/version-control/branches/:algorithmId
```

### Get Branch with Versions
```http
GET /api/version-control/branches/:branchId/details
```

### Create Version
```http
POST /api/version-control/branches/:branchId/versions
Content-Type: application/json

{
  "name": "Version 2.0",
  "description": "Improved algorithm",
  "steps": [...],
  "pseudoCode": "...",
  "changeNote": "Optimized performance"
}
```

### Merge Branch
```http
POST /api/version-control/branches/:sourceBranchId/merge
Content-Type: application/json

{
  "targetBranchId": 2,
  "strategy": "merge"  // fast-forward, merge, squash
}
```

### Compare Versions
```http
GET /api/version-control/compare/:versionId1/:versionId2
```

**Response:**
```json
{
  "differences": [
    {
      "field": "steps",
      "oldValue": [...],
      "newValue": [...]
    }
  ],
  "similarity": 85.5
}
```

---

## 👥 Real-Time Collaboration

### Create Session
```http
POST /api/collaboration/sessions/:algorithmId
Content-Type: application/json

{
  "expiresInHours": 24  // optional
}
```

**Response:**
```json
{
  "id": 1,
  "sessionToken": "abc123..."
}
```

### Join Session
```http
POST /api/collaboration/sessions/join/:sessionToken
```

### Update Presence
```http
PUT /api/collaboration/presence/:sessionId
Content-Type: application/json

{
  "cursorPosition": {
    "line": 10,
    "column": 5
  }
}
```

### Get Active Users
```http
GET /api/collaboration/presence/:sessionId
```

**Response:**
```json
[
  {
    "userId": 1,
    "name": "User Name",
    "email": "user@example.com",
    "cursorPosition": {"line": 10, "column": 5},
    "lastActivity": "2024-01-01T12:00:00Z"
  }
]
```

### Leave Session
```http
DELETE /api/collaboration/sessions/:sessionId/leave
```

### End Session
```http
DELETE /api/collaboration/sessions/:sessionId
```

### Get Session Details
```http
GET /api/collaboration/sessions/:sessionToken
```

---

## 📊 Advanced Analytics

### Predict Performance
```http
POST /api/advanced-analytics/predict/:algorithmId
```

**Response:**
```json
{
  "predictedValue": 85.5,
  "confidenceScore": 92.3
}
```

### Analyze Trends
```http
GET /api/advanced-analytics/trends/:algorithmId?periodDays=30&trendType=performance
```

**Query Parameters:**
- `periodDays`: 1-365 (default: 30)
- `trendType`: performance, usage, popularity, score (default: performance)

**Response:**
```json
[
  {
    "date": "2024-01-01",
    "avg_value": 75.5,
    "data_points": 10,
    "direction": "increasing",
    "changePercentage": 5.2
  }
]
```

### Forecast Performance
```http
POST /api/advanced-analytics/forecast/:algorithmId
Content-Type: application/json

{
  "forecastDays": 30  // 1-90
}
```

**Response:**
```json
[
  {
    "date": "2024-02-01",
    "predictedValue": 88.5,
    "confidence": 85.2
  }
]
```

---

## 🤖 AI-Powered Recommendations

### Get Recommendations for Problem
```http
GET /api/recommendations/problem/:problemId?limit=5
```

**Response:**
```json
[
  {
    "id": 1,
    "algorithmId": 5,
    "confidenceScore": 92.5,
    "reason": "This algorithm is well-suited for optimization problems"
  }
]
```

### Get Optimization Recommendations
```http
GET /api/recommendations/optimizations/:algorithmId
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "Optimize memory usage",
    "description": "Switch to adjacency list for sparse graphs",
    "expectedBenefit": "Reduce memory usage by 60%",
    "priority": "high",
    "confidenceScore": 88.5
  }
]
```

### Find Similar Algorithms
```http
GET /api/recommendations/similar/:algorithmId?limit=5
```

### Get User Recommendations
```http
GET /api/recommendations/user?limit=10
```

### Mark Recommendation as Viewed
```http
PATCH /api/recommendations/:recommendationId/viewed
```

### Accept Recommendation
```http
PATCH /api/recommendations/:recommendationId/accept
```

---

## 📝 Algorithms

### Get Algorithms
```http
GET /api/algorithms?visibility=public&type=hybrid&search=optimization
```

### Get Algorithm
```http
GET /api/algorithms/:id
```

### Create Algorithm
```http
POST /api/algorithms
Content-Type: application/json

{
  "name": "Algorithm Name",
  "inspiration": "Biological inspiration",
  "domain": "Problem domain",
  "description": "Description",
  "principle": "Core principle",
  "steps": ["step1", "step2"],
  "applications": ["app1", "app2"],
  "pseudoCode": "pseudocode...",
  "tags": ["tag1", "tag2"],
  "type": "generated",
  "visibility": "private"
}
```

### Update Algorithm
```http
PUT /api/algorithms/:id
```

### Delete Algorithm
```http
DELETE /api/algorithms/:id
```

---

## 🎯 Problems

### Get Problems
```http
GET /api/problems?status=active&priority=high
```

### Get Problem
```http
GET /api/problems/:id
```

### Create Problem
```http
POST /api/problems
Content-Type: application/json

{
  "title": "Problem Title",
  "description": "Problem description",
  "category": "Category",
  "domain": "Domain",
  "complexity": "complex",
  "priority": "high"
}
```

### Add Algorithm to Problem
```http
POST /api/problems/:id/algorithms
Content-Type: application/json

{
  "algorithmId": 5,
  "role": "primary",
  "effectivenessScore": 85.5
}
```

### Get Recommendations
```http
GET /api/problems/:id/recommendations
```

---

## 📈 Analytics

### Get Scores
```http
GET /api/analytics/:algorithmId/scores
```

### Create Score
```http
POST /api/analytics/:algorithmId/scores
Content-Type: application/json

{
  "feasibilityScore": 80,
  "efficiencyScore": 75,
  "innovationScore": 90,
  "applicabilityScore": 85,
  "robustnessScore": 70,
  "scalabilityScore": 80,
  "maintainabilityScore": 75
}
```

### Get Comprehensive Analytics
```http
GET /api/analytics/:algorithmId/analytics
```

---

## 🔄 Jobs

### Create Job
```http
POST /api/jobs
Content-Type: application/json

{
  "jobType": "generate",
  "inputData": {
    "inspiration": "...",
    "domain": "..."
  }
}
```

### Get Jobs
```http
GET /api/jobs
```

### Get Job
```http
GET /api/jobs/:id
```

---

## 📁 Projects

### Get Projects
```http
GET /api/projects
```

### Get Project
```http
GET /api/projects/:id
```

### Create Project
```http
POST /api/projects
Content-Type: application/json

{
  "name": "Project Name",
  "description": "Description",
  "color": "#10b981"
}
```

### Add Algorithm to Project
```http
POST /api/projects/:id/algorithms
Content-Type: application/json

{
  "algorithmId": 5
}
```

---

## 💾 Collections

### Get Collections
```http
GET /api/collections
```

### Get Public Collections
```http
GET /api/collections/public
```

### Create Collection
```http
POST /api/collections
Content-Type: application/json

{
  "name": "Collection Name",
  "description": "Description",
  "isPublic": false
}
```

---

## ❤️ Social Features

### Like Algorithm
```http
POST /api/likes/:algorithmId
```

### Unlike Algorithm
```http
DELETE /api/likes/:algorithmId
```

### Add to Favorites
```http
POST /api/favorites/:algorithmId
```

### Remove from Favorites
```http
DELETE /api/favorites/:algorithmId
```

### Create Comment
```http
POST /api/comments/algorithm/:algorithmId
Content-Type: application/json

{
  "content": "Comment text",
  "parentId": null  // optional, for replies
}
```

### Get Notifications
```http
GET /api/notifications
```

### Mark Notification as Read
```http
PATCH /api/notifications/:id/read
```

---

## 🔧 Admin

### Get Users
```http
GET /api/admin/users
```

### Update User Role
```http
PATCH /api/admin/users/:id/role
Content-Type: application/json

{
  "role": "admin"
}
```

### Get Automation Status
```http
GET /api/automation/status
```

### Trigger Automation
```http
POST /api/automation/trigger
Content-Type: application/json

{
  "task": "generate"  // generate, synthesize, improve, all
}
```

---

## Error Responses

All endpoints may return errors in the following format:

```json
{
  "error": "Error message",
  "details": [...]  // optional, for validation errors
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding rate limiting for production use.

---

## WebSocket Support

Real-time collaboration features currently use REST API with polling. For full real-time updates, WebSocket support should be added.

---

*Last Updated: After implementation of 6 major features*

