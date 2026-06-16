# RediForge Database Schema Documentation

## Overview

The RediForge database is a fully normalized PostgreSQL schema that combines authentication and project planning functionality. The schema uses UUID primary keys, proper foreign key relationships, and comprehensive indexing for optimal performance.

## Table of Contents

1. [Architecture](#architecture)
2. [Data Model](#data-model)
3. [Table Specifications](#table-specifications)
4. [Views](#views)
5. [Constraints and Validation](#constraints-and-validation)
6. [Relationships and Cascading](#relationships-and-cascading)
7. [Indexes](#indexes)
8. [Enumerations](#enumerations)
9. [Setup and Migration](#setup-and-migration)
10. [Querying Examples](#querying-examples)

---

## Architecture

### Design Principles

- **Normalization:** 3NF normalized schema to eliminate data redundancy
- **UUID Primary Keys:** All tables use UUID (gen_random_uuid()) for distributed/scalable design
- **Foreign Keys:** Explicit relationships with cascading delete where appropriate
- **Audit Trail:** Complete audit logging for compliance
- **Temporal Data:** Timestamps on all mutable entities
- **Type Safety:** Strict ENUM types for status and role fields
- **Performance:** Strategic indexing on all foreign keys and composite searches

### Schema Layers

```
Authentication Layer (users, sessions)
    ↓
Program Hierarchy (programs → mock_cycles → projects)
    ↓
Object Inventory (global_objects → project_objects)
    ↓
Task Management (task_groups, tasks)
    ↓
Execution (schedule_items, object_dependencies)
    ↓
Audit Trail (audit_logs)
```

---

## Data Model

### Entity Relationship Diagram (conceptual)

```
users (id, email, password_hash, role, mfa_enabled)
  ├── sessions (jwt_token, user_id → users)
  ├── project_objects (dra_user_id, developer_user_id → users)
  ├── tasks (dra_user_id, developer_user_id → users)
  └── audit_logs (user_id → users)

programs (id, name, description)
  └── mock_cycles (program_id → programs)
      └── projects (mock_cycle_id → mock_cycles)
          ├── project_objects (project_id → projects)
          │   └── object_dependencies (project_object_id → project_objects)
          ├── tasks (project_id → projects)
          │   ├── project_object_id → project_objects
          │   └── task_group_id → task_groups
          ├── task_groups (project_id → projects)
          └── schedule_items (project_id → projects)

global_objects (id, object_id)
  └── project_objects (global_object_id → global_objects)
```

---

## Table Specifications

### Authentication Tables

#### `users`
Core authentication and user profile information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| role | user_role | NOT NULL, DEFAULT 'viewer' | User permission level (admin, analyst, viewer) |
| mfa_secret | TEXT | NULLABLE | Encrypted TOTP secret for MFA |
| mfa_enabled | BOOLEAN | DEFAULT FALSE | Whether MFA is active |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Last profile update |

**Indexes:**
- `idx_users_email` on (email)

---

#### `sessions`
Active JWT sessions for authenticated users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Session identifier |
| user_id | UUID | FK → users.id, NOT NULL | User owning this session |
| jwt_token | TEXT | UNIQUE, NOT NULL | JWT access token |
| expires_at | TIMESTAMP | NOT NULL | Session expiration time (7 days) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Session creation time |

**Cascade Behavior:** ON DELETE CASCADE (sessions deleted when user deleted)

**Indexes:**
- `idx_sessions_user_id` on (user_id)
- `idx_sessions_token` on (jwt_token)
- `idx_sessions_expires_at` on (expires_at)

---

### Program Hierarchy Tables

#### `programs`
Top-level organizational unit grouping mock cycles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Program identifier |
| name | VARCHAR(255) | NOT NULL | Program name |
| description | TEXT | NULLABLE | Program description |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

---

#### `mock_cycles`
Time-bounded cycles within a program (e.g., "Mock Cycle 1 - Q2 2026").

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Cycle identifier |
| program_id | UUID | FK → programs.id, NOT NULL | Parent program |
| name | VARCHAR(255) | NOT NULL | Cycle name/phase |
| start_date | DATE | NOT NULL | Cycle start date |
| end_date | DATE | NOT NULL | Cycle end date |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Constraints:**
- `valid_date_range` CHECK (start_date <= end_date)

**Cascade Behavior:** ON DELETE CASCADE (cycles deleted with parent program)

**Indexes:**
- `idx_mock_cycles_program_id` on (program_id)

---

#### `projects`
Projects within mock cycles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Project identifier |
| mock_cycle_id | UUID | FK → mock_cycles.id, NOT NULL | Parent mock cycle |
| name | VARCHAR(255) | NOT NULL | Project name |
| description | TEXT | NULLABLE | Project description |
| start_date | DATE | NOT NULL | Project start date |
| end_date | DATE | NOT NULL | Project end date |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Constraints:**
- `valid_date_range` CHECK (start_date <= end_date)

**Cascade Behavior:** ON DELETE CASCADE (projects deleted with parent cycle)

**Indexes:**
- `idx_projects_mock_cycle_id` on (mock_cycle_id)

---

### Global Object Inventory

#### `global_objects`
Canonical registry of data objects (single source of truth).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Object identifier |
| object_id | VARCHAR(255) | UNIQUE, NOT NULL | Canonical object identifier (e.g., "GL_MASTER") |
| description | TEXT | NULLABLE | Object description |
| process_area | VARCHAR(255) | NULLABLE | Business process area |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes:**
- `idx_global_objects_object_id` on (object_id)
- `idx_global_objects_process_area` on (process_area)

**Notes:** This is the canonical reference. Deleting from here restricts project_objects (ON DELETE RESTRICT).

---

### Project-Based Object Inventory

#### `project_objects`
Execution-layer representation of data objects within a project.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Project object identifier |
| project_id | UUID | FK → projects.id, NOT NULL | Parent project |
| global_object_id | UUID | FK → global_objects.id, NOT NULL | Reference to canonical object |
| complexity | VARCHAR(50) | NULLABLE | Complexity level (low, medium, high) |
| deployment_disposition | VARCHAR(255) | NULLABLE | Deployment approach |
| build_type | VARCHAR(255) | NULLABLE | Build type (SAP_STANDARD, CUSTOM, etc.) |
| object_type | VARCHAR(255) | NULLABLE | Object classification |
| cutover_phase | VARCHAR(255) | NULLABLE | Cutover phase assignment |
| ddm_approach | VARCHAR(255) | NULLABLE | Data Defect Management approach |
| risk_security_type | VARCHAR(255) | NULLABLE | Risk/security classification |
| migration_type | VARCHAR(255) | NULLABLE | Migration method |
| factor_type | VARCHAR(255) | NULLABLE | Factor type classification |
| load_method | VARCHAR(255) | NULLABLE | Data load method |
| start_date | DATE | NULLABLE | Project object start date |
| end_date | DATE | NULLABLE | Project object end date |
| status | VARCHAR(50) | NULLABLE | Current status |
| dra_user_id | UUID | FK → users.id, NULLABLE | Data Readiness Analyst |
| developer_user_id | UUID | FK → users.id, NULLABLE | Developer/technical resource |
| notes | TEXT | NULLABLE | Free-form notes |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Constraints:**
- `valid_date_range` CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)

**Cascade Behavior:** ON DELETE CASCADE (removes with project), ON DELETE RESTRICT (from global_objects)

**Indexes:**
- `idx_project_objects_project_id` on (project_id)
- `idx_project_objects_global_object_id` on (global_object_id)
- `idx_project_objects_composite` on (project_id, global_object_id)
- `idx_project_objects_dra_user_id` on (dra_user_id)
- `idx_project_objects_developer_user_id` on (developer_user_id)

---

### Dependencies

#### `object_dependencies`
Tracks dependencies between project objects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Dependency identifier |
| project_object_id | UUID | FK → project_objects.id, NOT NULL | Dependent object |
| depends_on_project_object_id | UUID | FK → project_objects.id, NOT NULL | Object that is depended on |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Constraints:**
- UNIQUE(project_object_id, depends_on_project_object_id) - prevents duplicates
- `no_self_dependency` CHECK (project_object_id != depends_on_project_object_id) - prevents self-references

**Cascade Behavior:** ON DELETE CASCADE (removes with dependent or dependency)

**Indexes:**
- `idx_object_dependencies_project_object_id` on (project_object_id)
- `idx_object_dependencies_depends_on` on (depends_on_project_object_id)

---

### Task Management

#### `task_groups`
Logical grouping container for related tasks (parallel to data objects).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Task group identifier |
| project_id | UUID | FK → projects.id, NOT NULL | Parent project |
| name | VARCHAR(255) | NOT NULL | Task group name |
| description | TEXT | NULLABLE | Task group description |
| start_date | DATE | NULLABLE | Group start date |
| end_date | DATE | NULLABLE | Group end date |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Constraints:**
- `valid_date_range` CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)

**Cascade Behavior:** ON DELETE CASCADE (removes with project)

**Indexes:**
- `idx_task_groups_project_id` on (project_id)

---

#### `tasks`
Individual tasks under either a project object OR a task group.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Task identifier |
| project_id | UUID | FK → projects.id, NOT NULL | Parent project |
| project_object_id | UUID | FK → project_objects.id, NULLABLE | Parent data object (if applicable) |
| task_group_id | UUID | FK → task_groups.id, NULLABLE | Parent task group (if applicable) |
| task_type | task_type_enum | NOT NULL | Task type (extract, transform, preload_validation, load, postload_validation, custom) |
| name | VARCHAR(255) | NULLABLE | Task name (for custom tasks) |
| status | task_status_enum | NOT NULL, DEFAULT 'not_started' | Current status (not_started, in_progress, blocked, complete) |
| start_date | DATE | NULLABLE | Task start date |
| end_date | DATE | NULLABLE | Task end date |
| dra_user_id | UUID | FK → users.id, NULLABLE | Data Readiness Analyst assigned |
| developer_user_id | UUID | FK → users.id, NULLABLE | Developer assigned |
| notes | TEXT | NULLABLE | Free-form task notes |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Constraints:**
- `valid_date_range` CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
- `at_least_one_parent` CHECK (project_object_id IS NOT NULL OR task_group_id IS NOT NULL) - enforces either parent

**Cascade Behavior:** ON DELETE CASCADE (removes with project, project object, or task group)

**Indexes:**
- `idx_tasks_project_id` on (project_id)
- `idx_tasks_project_object_id` on (project_object_id)
- `idx_tasks_task_group_id` on (task_group_id)
- `idx_tasks_composite` on (project_id, project_object_id, task_group_id)
- `idx_tasks_status` on (status)
- `idx_tasks_dra_user_id` on (dra_user_id)
- `idx_tasks_developer_user_id` on (developer_user_id)

---

### Schedule

#### `schedule_items`
Weekly view scheduling - maps tasks to scheduled dates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Schedule item identifier |
| project_id | UUID | FK → projects.id, NOT NULL | Parent project |
| task_id | UUID | FK → tasks.id, NOT NULL | Associated task |
| scheduled_date | DATE | NOT NULL | Date task is scheduled for |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Constraints:**
- UNIQUE(task_id, scheduled_date) - prevents duplicate schedules

**Cascade Behavior:** ON DELETE CASCADE (removes with project or task)

**Indexes:**
- `idx_schedule_items_project_id` on (project_id)
- `idx_schedule_items_task_id` on (task_id)
- `idx_schedule_items_scheduled_date` on (scheduled_date)

---

### Audit Logging

#### `audit_logs`
Complete audit trail for compliance and debugging.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Log entry identifier |
| user_id | UUID | FK → users.id, NULLABLE | User performing action |
| entity_type | VARCHAR(255) | NOT NULL | Type of entity modified (table name) |
| entity_id | UUID | NOT NULL | ID of entity modified |
| action | VARCHAR(50) | NOT NULL | Action performed (create, update, delete) |
| before_data | JSONB | NULLABLE | Entity data before change |
| after_data | JSONB | NULLABLE | Entity data after change |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Action timestamp |

**Cascade Behavior:** ON DELETE SET NULL (user_id set to NULL if user deleted)

**Indexes:**
- `idx_audit_logs_user_id` on (user_id)
- `idx_audit_logs_entity` on (entity_type, entity_id)
- `idx_audit_logs_created_at` on (created_at)

---

## Views

### `prioritized_tasks_view`
Categorizes tasks by priority for dashboard display.

| Column | Type | Description |
|--------|------|-------------|
| task_id | UUID | Task identifier |
| project_id | UUID | Parent project |
| project_object_id | UUID | Parent data object (if applicable) |
| task_group_id | UUID | Parent task group (if applicable) |
| status | task_status_enum | Current task status |
| start_date | DATE | Task start date |
| end_date | DATE | Task end date |
| priority_category | VARCHAR | Category: 'late', 'in_progress', 'due_this_week', 'on_track' |

**Logic:**
- `late` = end_date < TODAY AND status != 'complete'
- `in_progress` = status = 'in_progress'
- `due_this_week` = end_date between TODAY and TODAY + 7 days
- `on_track` = all others

**Usage:** Dashboard display, priority filtering, risk identification

---

### `project_status_view`
High-level project statistics and completion metrics.

| Column | Type | Description |
|--------|------|-------------|
| project_id | UUID | Project identifier |
| project_name | VARCHAR | Project name |
| start_date | DATE | Project start date |
| end_date | DATE | Project end date |
| total_tasks | INTEGER | Total number of tasks |
| completed_tasks | INTEGER | Tasks with status 'complete' |
| in_progress_tasks | INTEGER | Tasks with status 'in_progress' |
| blocked_tasks | INTEGER | Tasks with status 'blocked' |
| not_started_tasks | INTEGER | Tasks with status 'not_started' |
| completion_percentage | NUMERIC | (completed_tasks / total_tasks) * 100 |

**Usage:** Project overview, status dashboards, completion tracking

---

## Constraints and Validation

### Check Constraints

| Table | Constraint | Logic |
|-------|-----------|-------|
| mock_cycles | valid_date_range | start_date <= end_date |
| projects | valid_date_range | start_date <= end_date |
| project_objects | valid_date_range | start_date IS NULL OR end_date IS NULL OR start_date <= end_date |
| task_groups | valid_date_range | start_date IS NULL OR end_date IS NULL OR start_date <= end_date |
| tasks | valid_date_range | start_date IS NULL OR end_date IS NULL OR start_date <= end_date |
| tasks | at_least_one_parent | project_object_id IS NOT NULL OR task_group_id IS NOT NULL |
| object_dependencies | no_self_dependency | project_object_id != depends_on_project_object_id |

### Unique Constraints

| Table | Columns |
|-------|---------|
| users | email |
| global_objects | object_id |
| sessions | jwt_token |
| object_dependencies | (project_object_id, depends_on_project_object_id) |
| schedule_items | (task_id, scheduled_date) |

---

## Relationships and Cascading

### Cascade Behavior

**ON DELETE CASCADE:** Changes propagate downward (parent deletion removes children)
- programs → mock_cycles
- mock_cycles → projects
- projects → project_objects, task_groups, tasks, schedule_items
- project_objects → object_dependencies (as project_object_id)
- task_groups → tasks
- users → sessions

**ON DELETE RESTRICT:** Prevents deletion if referenced
- global_objects (cannot delete if referenced by project_objects)

**ON DELETE SET NULL:** Removes reference but keeps record
- users (audit_logs.user_id, tasks.dra_user_id, tasks.developer_user_id, project_objects.dra_user_id, project_objects.developer_user_id)

### Referential Integrity

All foreign keys are enforced at the database level. It's impossible to:
- Create a mock cycle without a valid program
- Create a project without a valid mock cycle
- Create a project object without a valid project and global object
- Create a task without a valid project and at least one parent (object or group)
- Create a schedule item without a valid task
- Create a session without a valid user

---

## Indexes

### Primary Indexes (Foreign Keys)

Automatically created on all foreign key columns for join performance.

### Secondary Indexes (Query Optimization)

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| global_objects | idx_global_objects_object_id | object_id | Quick object lookup by identifier |
| global_objects | idx_global_objects_process_area | process_area | Filter by business area |
| project_objects | idx_project_objects_composite | (project_id, global_object_id) | Common join pattern |
| tasks | idx_tasks_composite | (project_id, project_object_id, task_group_id) | Multi-level filtering |
| tasks | idx_tasks_status | status | Status-based queries |
| schedule_items | idx_schedule_items_scheduled_date | scheduled_date | Week view queries |
| audit_logs | idx_audit_logs_entity | (entity_type, entity_id) | Change history lookups |
| audit_logs | idx_audit_logs_created_at | created_at | Temporal queries |

### Index Statistics

Indexes are automatically analyzed by PostgreSQL's autovacuum process. To manually refresh:

```sql
ANALYZE;  -- Update table statistics
REINDEX;  -- Rebuild all indexes
```

---

## Enumerations

### `user_role`
User permission levels.

```sql
CREATE TYPE user_role AS ENUM ('admin', 'analyst', 'viewer');
```

| Value | Description |
|-------|-------------|
| admin | Full system access, user management |
| analyst | Project analysis and reporting |
| viewer | Read-only access |

---

### `task_type_enum`
Classification of task types based on ETL/data pipeline stages.

```sql
CREATE TYPE task_type_enum AS ENUM (
  'extract',
  'transform',
  'preload_validation',
  'load',
  'postload_validation',
  'custom'
);
```

| Value | Description |
|-------|-------------|
| extract | Extract data from source system |
| transform | Transform/map data to target format |
| preload_validation | Validate data before load |
| load | Load data into target system |
| postload_validation | Validate data after load |
| custom | Custom task not in standard pipeline |

---

### `task_status_enum`
Execution status of individual tasks.

```sql
CREATE TYPE task_status_enum AS ENUM (
  'not_started',
  'in_progress',
  'blocked',
  'complete'
);
```

| Value | Description |
|-------|-------------|
| not_started | Task has not begun |
| in_progress | Task is currently executing |
| blocked | Task cannot proceed (dependency issue) |
| complete | Task finished successfully |

---

## Setup and Migration

### First-Time Setup

```bash
# Create database
createdb rediforge

# Run migrations
psql -U postgres -d rediforge -f db/migrations/001_initial_schema.sql

# Verify schema created
psql -U postgres -d rediforge -c "\dt"  # List tables
psql -U postgres -d rediforge -c "\dv"  # List views

# Load seed data (optional)
psql -U postgres -d rediforge -f db/seeds/01_seed_data.sql
```

### Migration Workflow

1. **Write migration file** (e.g., `002_add_new_table.sql`)
2. **Wrap in transaction:** BEGIN; ... COMMIT;
3. **Test locally:** psql -f migration.sql
4. **Version in git**
5. **Deploy:** Run on production in order

### Backup and Recovery

```bash
# Backup
pg_dump rediforge > rediforge_backup_$(date +%Y%m%d).sql

# Restore
psql rediforge < rediforge_backup_20260615.sql

# Point-in-time recovery (with WAL archiving enabled)
pg_restore -d rediforge_recovery rediforge_backup.custom
```

---

## Querying Examples

### Find Late Tasks

```sql
SELECT * FROM prioritized_tasks_view
WHERE priority_category = 'late'
ORDER BY end_date ASC;
```

### Project Status Dashboard

```sql
SELECT * FROM project_status_view
WHERE completion_percentage < 100
ORDER BY completion_percentage ASC;
```

### Tasks for a User

```sql
SELECT t.*, p.name as project_name
FROM tasks t
JOIN projects p ON t.project_id = p.id
WHERE t.developer_user_id = $1
  AND t.status != 'complete'
ORDER BY t.end_date ASC;
```

### Object Dependencies Chain

```sql
WITH RECURSIVE dep_chain AS (
  SELECT project_object_id, depends_on_project_object_id, 1 as depth
  FROM object_dependencies
  WHERE project_object_id = $1
  
  UNION ALL
  
  SELECT od.project_object_id, od.depends_on_project_object_id, dc.depth + 1
  FROM object_dependencies od
  JOIN dep_chain dc ON od.project_object_id = dc.depends_on_project_object_id
  WHERE dc.depth < 10  -- Prevent infinite loops
)
SELECT DISTINCT po.id, go.object_id, depth
FROM dep_chain
JOIN project_objects po ON dep_chain.depends_on_project_object_id = po.id
JOIN global_objects go ON po.global_object_id = go.id
ORDER BY depth;
```

### Week Ahead Schedule

```sql
SELECT
  p.name as project,
  t.name as task,
  gt.task_type,
  t.status,
  si.scheduled_date
FROM schedule_items si
JOIN tasks t ON si.task_id = t.id
JOIN projects p ON si.project_id = p.id
WHERE si.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
ORDER BY si.scheduled_date, p.name;
```

### Audit Trail for Entity

```sql
SELECT
  u.email,
  al.action,
  al.created_at,
  al.before_data,
  al.after_data
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.entity_type = 'tasks' AND al.entity_id = $1
ORDER BY al.created_at DESC;
```

### Find Objects Missing Developers

```sql
SELECT
  p.name as project,
  go.object_id,
  po.complexity,
  po.status
FROM project_objects po
JOIN projects p ON po.project_id = p.id
JOIN global_objects go ON po.global_object_id = go.id
WHERE po.developer_user_id IS NULL
  AND po.status != 'complete'
ORDER BY p.name, po.complexity DESC;
```

### Task Summary by Type

```sql
SELECT
  p.name as project,
  t.task_type,
  t.status,
  COUNT(*) as count
FROM tasks t
JOIN projects p ON t.project_id = p.id
GROUP BY p.id, p.name, t.task_type, t.status
ORDER BY p.name, t.task_type, t.status;
```

---

## Performance Tips

1. **Always use WHERE on indexed columns:** Drastically improves query speed
2. **Use EXPLAIN ANALYZE:** Understand query performance before deployment
3. **Batch inserts:** Use multi-row INSERT for better throughput
4. **Archive old audit logs:** Keep audit_logs table trimmed
5. **Regenerate statistics:** Run ANALYZE after large bulk operations
6. **Connection pooling:** Use PgBouncer for application connection management

---

## Security Considerations

1. **Password storage:** Use bcrypt with 10+ salt rounds (handled by auth service)
2. **JWT tokens:** Store in secure storage, use HTTPS only
3. **MFA secrets:** Encrypted with AES-256-CBC before storage
4. **Audit logs:** Keep complete history, restrict access to admins
5. **SQL injection:** Always use parameterized queries (e.g., $1, $2 in psql)
6. **Principle of least privilege:** Database users should have minimal necessary permissions

---

## Future Enhancements

1. **Partitioning:** Partition audit_logs by date for large-scale deployments
2. **Full-text search:** Add search capabilities on descriptions/notes
3. **JSON columns:** Expand JSONB usage for flexible metadata
4. **Materialized views:** Refresh summaries periodically for faster dashboards
5. **Change data capture (CDC):** Enable logical replication for real-time sync
6. **Read replicas:** Setup read-only replicas for reporting
7. **Incremental backups:** Implement WAL archiving for faster recovery

---

## Support

For database issues:
- Check `audit_logs` for recent changes
- Review PostgreSQL logs: `/var/log/postgresql/`
- Use `EXPLAIN ANALYZE` for slow queries
- Verify referential integrity: `ANALYZE;`
