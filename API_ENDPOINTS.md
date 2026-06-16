# RediForge Planning API Documentation

Complete REST API reference for the RediForge planning application.

## Base URL

```
http://localhost:5000/api
```

## Authentication

All endpoints (except health checks) require:

```
Authorization: Bearer {jwt_token}
```

Get JWT token from `/auth/login` and `/auth/mfa/verify`.

## Response Format

### Success Response (List)
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "count": 50
  }
}
```

### Success Response (Single)
```json
{
  "data": {...}
}
```

### Success Response (Delete)
```json
{
  "success": true
}
```

### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## Programs

### GET /programs
List all programs.

**Auth:** Required  
**Role:** Any  
**Query Params:** None

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Program Name",
      "description": "Description",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z"
    }
  ],
  "meta": {...}
}
```

### POST /programs
Create a new program (admin only).

**Auth:** Required  
**Role:** admin  

**Request Body:**
```json
{
  "name": "Program Name",
  "description": "Optional description"
}
```

**Response:** 201 Created
```json
{
  "data": {...}
}
```

### GET /programs/:programId
Get program by ID with statistics.

**Auth:** Required  
**Role:** Any

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Program Name",
    "description": "Description",
    "createdAt": "2026-06-15T10:00:00Z",
    "updatedAt": "2026-06-15T10:00:00Z",
    "stats": {
      "mockCycleCount": 3,
      "projectCount": 12
    }
  }
}
```

### PATCH /programs/:programId
Update program (admin only).

**Auth:** Required  
**Role:** admin

**Request Body:**
```json
{
  "name": "New Name",
  "description": "New description"
}
```

### DELETE /programs/:programId
Delete program (admin only). Fails if mock cycles exist.

**Auth:** Required  
**Role:** admin

---

## Mock Cycles

### GET /programs/:programId/mock-cycles
List mock cycles for a program.

**Auth:** Required  
**Role:** Any

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "programId": "uuid",
      "name": "Mock Cycle 1 - Q2 2026",
      "startDate": "2026-04-01",
      "endDate": "2026-06-30",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z"
    }
  ],
  "meta": {...}
}
```

### POST /programs/:programId/mock-cycles
Create mock cycle (admin only).

**Auth:** Required  
**Role:** admin

**Request Body:**
```json
{
  "name": "Mock Cycle 1 - Q2 2026",
  "startDate": "2026-04-01",
  "endDate": "2026-06-30"
}
```

### GET /mock-cycles/:mockCycleId
Get mock cycle by ID with project stats.

**Auth:** Required  
**Role:** Any

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "programId": "uuid",
    "name": "Mock Cycle 1 - Q2 2026",
    "startDate": "2026-04-01",
    "endDate": "2026-06-30",
    "stats": {
      "projectCount": 5
    }
  }
}
```

### PATCH /mock-cycles/:mockCycleId
Update mock cycle (admin only).

**Auth:** Required  
**Role:** admin

### DELETE /mock-cycles/:mockCycleId
Delete mock cycle (admin only). Fails if projects exist.

**Auth:** Required  
**Role:** admin

---

## Projects

### GET /projects/by-cycle/:mockCycleId
List projects in a mock cycle.

**Auth:** Required  
**Role:** Any

### POST /projects/by-cycle/:mockCycleId
Create project (admin only).

**Auth:** Required  
**Role:** admin

**Request Body:**
```json
{
  "name": "Project Name",
  "description": "Optional description",
  "startDate": "2026-04-15",
  "endDate": "2026-06-15"
}
```

### GET /projects/:projectId
Get project by ID with stats.

**Auth:** Required  
**Role:** Any

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "mockCycleId": "uuid",
    "name": "Finance Module Migration",
    "description": "Migrate GL, AP, AR to SAP",
    "startDate": "2026-04-15",
    "endDate": "2026-06-15",
    "stats": {
      "objectCount": 8,
      "taskGroupCount": 3,
      "taskCount": 42,
      "completedTasks": 15
    }
  }
}
```

### PATCH /projects/:projectId
Update project (admin only).

**Auth:** Required  
**Role:** admin

### DELETE /projects/:projectId
Delete project (admin only). Fails if objects, task groups, or tasks exist.

**Auth:** Required  
**Role:** admin

---

## Global Objects (Canonical)

### GET /global-objects
List all global objects with optional filters.

**Auth:** Required  
**Role:** Any  
**Query Params:**
- `processArea`: Filter by process area (e.g., "Finance")
- `search`: Search in objectId or description

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "objectId": "GL_MASTER",
      "description": "General Ledger Master Data",
      "processArea": "Finance",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z"
    }
  ],
  "meta": {...}
}
```

### POST /global-objects
Create global object (admin only).

**Auth:** Required  
**Role:** admin

**Request Body:**
```json
{
  "objectId": "GL_MASTER",
  "description": "General Ledger Master Data",
  "processArea": "Finance"
}
```

### GET /global-objects/:globalObjectId
Get global object by ID.

**Auth:** Required  
**Role:** Any

### PATCH /global-objects/:globalObjectId
Update global object (admin only).

**Auth:** Required  
**Role:** admin

### DELETE /global-objects/:globalObjectId
Delete global object (admin only). Fails if referenced by project objects.

**Auth:** Required  
**Role:** admin

---

## Project Objects (Execution Layer)

### GET /project-objects/project/:projectId
List project objects with optional filters.

**Auth:** Required  
**Role:** Any  
**Query Params:**
- `status`: Filter by status
- `draUserId`: Filter by DRA user
- `developerUserId`: Filter by developer
- `processArea`: Filter by process area

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "globalObjectId": "uuid",
      "objectId": "GL_MASTER",
      "processArea": "Finance",
      "complexity": "medium",
      "deploymentDisposition": "Lift & Shift",
      "buildType": "SAP_STANDARD",
      "status": "in_progress",
      "startDate": "2026-04-15",
      "endDate": "2026-05-30",
      "draUserId": "uuid",
      "developerUserId": "uuid",
      "notes": "Migration notes",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z"
    }
  ],
  "meta": {...}
}
```

### POST /project-objects/project/:projectId
Create project object (analyst or admin).

**Auth:** Required  
**Role:** analyst, admin

**Request Body:**
```json
{
  "globalObjectId": "uuid",
  "complexity": "medium",
  "deploymentDisposition": "Lift & Shift",
  "buildType": "SAP_STANDARD",
  "objectType": "Master",
  "cutoverPhase": "Wave 1",
  "ddmApproach": "ETL",
  "riskSecurityType": "Low",
  "migrationType": "One-time",
  "factorType": "Transactional",
  "loadMethod": "Direct Load",
  "startDate": "2026-04-15",
  "endDate": "2026-05-30",
  "status": "not_started",
  "draUserId": "uuid",
  "developerUserId": "uuid",
  "notes": "Optional notes"
}
```

### GET /project-objects/:projectObjectId
Get project object by ID with stats and dependencies.

**Auth:** Required  
**Role:** Any

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "...",
    "stats": {
      "taskCount": 8,
      "completedTasks": 3,
      "dependencyCount": 2,
      "dependentCount": 1
    }
  }
}
```

### PATCH /project-objects/:projectObjectId
Update project object (analyst or admin).

**Auth:** Required  
**Role:** analyst, admin

**Request Body:** Any subset of creation fields

### DELETE /project-objects/:projectObjectId
Delete project object (admin only). Fails if tasks exist.

**Auth:** Required  
**Role:** admin

---

## Dependencies

### GET /project-objects/:projectObjectId/dependencies
List dependencies for a project object.

**Auth:** Required  
**Role:** Any

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "projectObjectId": "uuid",
      "dependsOnProjectObjectId": "uuid",
      "dependsOnObjectId": "GL_MASTER",
      "createdAt": "2026-06-15T10:00:00Z"
    }
  ],
  "meta": {...}
}
```

### POST /project-objects/:projectObjectId/dependencies
Add dependency (analyst or admin).

**Auth:** Required  
**Role:** analyst, admin

**Request Body:**
```json
{
  "dependsOnProjectObjectId": "uuid"
}
```

### DELETE /project-objects/dependency/:dependencyId
Remove dependency (analyst or admin).

**Auth:** Required  
**Role:** analyst, admin

---

## Task Groups

### GET /tasks/groups/project/:projectId
List task groups in a project.

**Auth:** Required  
**Role:** Any

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "name": "Data Extraction & Validation",
      "description": "Extract and validate data",
      "startDate": "2026-04-15",
      "endDate": "2026-05-10",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z"
    }
  ],
  "meta": {...}
}
```

### POST /tasks/groups/project/:projectId
Create task group (analyst or admin).

**Auth:** Required  
**Role:** analyst, admin

**Request Body:**
```json
{
  "name": "Data Extraction & Validation",
  "description": "Extract and validate data",
  "startDate": "2026-04-15",
  "endDate": "2026-05-10"
}
```

### GET /tasks/groups/:taskGroupId
Get task group by ID with task stats.

**Auth:** Required  
**Role:** Any

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "...",
    "stats": {
      "taskCount": 5,
      "completedTasks": 2
    }
  }
}
```

### PATCH /tasks/groups/:taskGroupId
Update task group (analyst or admin).

**Auth:** Required  
**Role:** analyst, admin

### DELETE /tasks/groups/:taskGroupId
Delete task group (analyst or admin). Fails if tasks exist.

**Auth:** Required  
**Role:** analyst, admin

---

## Tasks

### GET /tasks/project/:projectId
List tasks in a project with optional filters.

**Auth:** Required  
**Role:** Any  
**Query Params:**
- `status`: Filter by status (not_started, in_progress, blocked, complete)
- `taskType`: Filter by type (extract, transform, preload_validation, load, postload_validation, custom)
- `draUserId`: Filter by DRA user
- `developerUserId`: Filter by developer
- `projectObjectId`: Filter by project object
- `taskGroupId`: Filter by task group

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "projectObjectId": "uuid",
      "taskGroupId": null,
      "taskType": "extract",
      "name": null,
      "status": "in_progress",
      "startDate": "2026-04-26",
      "endDate": "2026-05-05",
      "draUserId": "uuid",
      "developerUserId": "uuid",
      "notes": "Validating data quality",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z"
    }
  ],
  "meta": {...}
}
```

### POST /tasks/project/:projectId
Create task (analyst or admin). Must have either projectObjectId OR taskGroupId.

**Auth:** Required  
**Role:** analyst, admin

**Request Body:**
```json
{
  "taskType": "load",
  "projectObjectId": "uuid",
  "taskGroupId": null,
  "name": "Load Data Objects",
  "status": "not_started",
  "startDate": "2026-05-06",
  "endDate": "2026-05-10",
  "draUserId": "uuid",
  "developerUserId": "uuid",
  "notes": "Load configuration"
}
```

### GET /tasks/:taskId
Get task by ID.

**Auth:** Required  
**Role:** Any

### PATCH /tasks/:taskId
Update task (analyst or admin).

**Auth:** Required  
**Role:** analyst, admin

**Request Body:** Any subset of fields (status, dates, assignments, notes)

### DELETE /tasks/:taskId
Delete task (analyst or admin).

**Auth:** Required  
**Role:** analyst, admin

---

## Schedule

### GET /schedule/project/:projectId
List schedule items for a project.

**Auth:** Required  
**Role:** Any

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "taskId": "uuid",
      "taskType": "load",
      "taskName": "Load GL Data",
      "taskStatus": "in_progress",
      "projectObjectId": "uuid",
      "objectId": "GL_MASTER",
      "scheduledDate": "2026-05-10",
      "createdAt": "2026-06-15T10:00:00Z"
    }
  ],
  "meta": {...}
}
```

### POST /schedule/project/:projectId
Create schedule item (analyst or admin).

**Auth:** Required  
**Role:** analyst, admin

**Request Body:**
```json
{
  "taskId": "uuid",
  "scheduledDate": "2026-05-10"
}
```

### PATCH /schedule/:scheduleItemId
Update schedule item date (analyst or admin).

**Auth:** Required  
**Role:** analyst, admin

**Request Body:**
```json
{
  "scheduledDate": "2026-05-11"
}
```

### DELETE /schedule/:scheduleItemId
Delete schedule item (analyst or admin).

**Auth:** Required  
**Role:** analyst, admin

---

## Priorities

### GET /priorities/project/:projectId
Get prioritized tasks grouped by category.

**Auth:** Required  
**Role:** Any

**Response:**
```json
{
  "data": {
    "late": [
      {
        "taskId": "uuid",
        "taskType": "load",
        "taskName": "Load GL",
        "projectObjectId": "uuid",
        "objectId": "GL_MASTER",
        "status": "blocked",
        "startDate": "2026-04-15",
        "endDate": "2026-05-05",
        "priorityCategory": "late"
      }
    ],
    "in_progress": [
      {...}
    ],
    "due_this_week": [
      {...}
    ],
    "on_track": [
      {...}
    ]
  }
}
```

### GET /priorities/status/:projectId
Get project status overview.

**Auth:** Required  
**Role:** Any

**Response:**
```json
{
  "data": {
    "projectId": "uuid",
    "projectName": "Finance Module Migration",
    "startDate": "2026-04-15",
    "endDate": "2026-06-15",
    "totalTasks": 42,
    "completedTasks": 15,
    "inProgressTasks": 20,
    "blockedTasks": 2,
    "notStartedTasks": 5,
    "completionPercentage": 35.71
  }
}
```

---

## Audit Logs (Admin Only)

### GET /audit
List audit logs with optional filters.

**Auth:** Required  
**Role:** admin  
**Query Params:**
- `entityType`: Filter by entity type (e.g., "projects", "tasks")
- `entityId`: Filter by entity ID
- `userId`: Filter by user
- `startDate`: Filter by date (ISO format)
- `endDate`: Filter by date (ISO format)
- `limit`: Pagination limit (default 100)
- `offset`: Pagination offset (default 0)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userEmail": "user@example.com",
      "entityType": "projects",
      "entityId": "uuid",
      "action": "create",
      "beforeData": null,
      "afterData": {"name": "Project", "status": "created"},
      "createdAt": "2026-06-15T10:00:00Z"
    }
  ],
  "meta": {...}
}
```

### GET /audit/:auditLogId
Get single audit log (admin only).

**Auth:** Required  
**Role:** admin

---

## Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| MISSING_FIELD | 400 | Required field is missing |
| VALIDATION_ERROR | 400 | Invalid input data |
| NOT_FOUND | 404 | Resource not found |
| CONSTRAINT_VIOLATION | 409 | Cannot perform action (e.g., delete with dependencies) |
| DUPLICATE_RESOURCE | 409 | Resource already exists |
| INVALID_REFERENCE | 400 | Invalid reference to related resource |
| UNAUTHORIZED | 401 | Missing or invalid JWT token |
| FORBIDDEN | 403 | Insufficient permissions (wrong role) |
| INTERNAL_ERROR | 500 | Server error |

---

## Common Workflows

### Create a project and add objects

```bash
# 1. Create global object (if not exists)
curl -X POST http://localhost:5000/api/global-objects \
  -H "Authorization: Bearer {jwt}" \
  -H "Content-Type: application/json" \
  -d '{
    "objectId": "GL_MASTER",
    "description": "GL Master Data",
    "processArea": "Finance"
  }'

# 2. Create project
curl -X POST http://localhost:5000/api/projects/by-cycle/{mockCycleId} \
  -H "Authorization: Bearer {jwt}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Finance Module",
    "startDate": "2026-04-15",
    "endDate": "2026-06-15"
  }'

# 3. Add project object
curl -X POST http://localhost:5000/api/project-objects/project/{projectId} \
  -H "Authorization: Bearer {jwt}" \
  -H "Content-Type: application/json" \
  -d '{
    "globalObjectId": "{globalObjectId}",
    "complexity": "medium",
    "buildType": "SAP_STANDARD",
    "status": "not_started"
  }'

# 4. Create task for the object
curl -X POST http://localhost:5000/api/tasks/project/{projectId} \
  -H "Authorization: Bearer {jwt}" \
  -H "Content-Type: application/json" \
  -d '{
    "taskType": "extract",
    "projectObjectId": "{projectObjectId}",
    "status": "not_started",
    "startDate": "2026-04-15",
    "endDate": "2026-04-25"
  }'
```

### Get project dashboard

```bash
curl -X GET http://localhost:5000/api/priorities/project/{projectId} \
  -H "Authorization: Bearer {jwt}"
```

---

## Rate Limiting

Not currently implemented. Recommended limits:
- 100 requests per minute per user
- 1000 requests per minute per IP

---

## Pagination

List endpoints support pagination via query params:
- `limit`: Items per page (default 100, max 500)
- `offset`: Number of items to skip (default 0)

Example:
```
GET /api/projects?limit=50&offset=100
```

---

## Data Formatting

- Dates: ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)
- UUIDs: v4 format
- Timestamps: ISO 8601 with timezone (YYYY-MM-DDTHH:MM:SSZ)
- All JSON uses camelCase for API responses
- Database uses snake_case

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-15 | Initial release |

---

## Support

For issues or questions, contact the development team or create an issue in the project repository.
