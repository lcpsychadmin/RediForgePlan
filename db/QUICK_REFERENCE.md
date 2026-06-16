# RediForge Database Quick Reference Guide

## Connection String

```
postgresql://user:password@localhost:5432/rediforge
```

## Basic psql Commands

```bash
# Connect to database
psql -U postgres -d rediforge

# List all tables
\dt

# List all views
\dv

# Describe table structure
\d table_name

# List indexes
\di

# Show table size
SELECT pg_size_pretty(pg_total_relation_size('table_name'));

# Exit psql
\q
```

## Common Database Operations

### Setup New Database

```bash
# Create database
createdb rediforge

# Run migrations
psql -U postgres -d rediforge -f db/migrations/001_initial_schema.sql

# Load seed data
psql -U postgres -d rediforge -f db/seeds/01_seed_data.sql

# Verify
psql -U postgres -d rediforge -c "SELECT COUNT(*) FROM programs;"
```

### Backup and Restore

```bash
# Full backup
pg_dump rediforge > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup with compression
pg_dump -F c rediforge > backup.custom

# Restore from backup
psql rediforge < backup.sql

# Restore from compressed backup
pg_restore -d rediforge backup.custom
```

### Check Database Health

```bash
-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for missing indexes
SELECT * FROM pg_stat_user_tables
WHERE n_seq_scans > n_idx_scans AND n_live_tup > 10000;

-- Check for slow queries (requires log_statement = 'all')
SELECT query, calls, mean_time FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;
```

---

## Critical Data Queries

### Create First Admin User

```bash
# Generate bcrypt hash (using Node.js)
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your_password', 10, (err, hash) => console.log(hash));"
```

```sql
INSERT INTO users (email, password_hash, role, mfa_enabled)
VALUES ('admin@example.com', '$2b$10$hashed_password_here', 'admin', false);
```

### Create Program Structure

```sql
-- Create program
INSERT INTO programs (name, description)
VALUES ('My Program', 'Program description')
RETURNING id;

-- Create mock cycle
INSERT INTO mock_cycles (program_id, name, start_date, end_date)
VALUES (
  'program_id',
  'Mock Cycle 1',
  '2026-06-01',
  '2026-08-31'
)
RETURNING id;

-- Create project
INSERT INTO projects (mock_cycle_id, name, description, start_date, end_date)
VALUES (
  'cycle_id',
  'Project Name',
  'Description',
  '2026-06-15',
  '2026-08-15'
)
RETURNING id;
```

### Add Data Objects

```sql
-- Add to global objects (canonical)
INSERT INTO global_objects (object_id, description, process_area)
VALUES ('OBJECT_CODE', 'Description', 'Finance')
RETURNING id;

-- Map object to project
INSERT INTO project_objects (
  project_id,
  global_object_id,
  complexity,
  build_type,
  status
)
VALUES (
  'project_id',
  'global_object_id',
  'medium',
  'SAP_STANDARD',
  'not_started'
)
RETURNING id;
```

### Create Task

```sql
-- Task under a data object
INSERT INTO tasks (
  project_id,
  project_object_id,
  task_type,
  name,
  status,
  end_date
)
VALUES (
  'project_id',
  'project_object_id',
  'load',
  'Load Data Objects',
  'not_started',
  '2026-06-30'
)
RETURNING id;

-- Task under a task group
INSERT INTO tasks (
  project_id,
  task_group_id,
  task_type,
  name,
  status,
  end_date
)
VALUES (
  'project_id',
  'task_group_id',
  'transform',
  'Transform Data',
  'not_started',
  '2026-06-20'
)
RETURNING id;
```

---

## Dashboard Queries

### Project Overview

```sql
SELECT * FROM project_status_view
WHERE project_id = 'your_project_id';
```

### Tasks Due This Week

```sql
SELECT * FROM prioritized_tasks_view
WHERE priority_category IN ('due_this_week', 'late')
ORDER BY end_date ASC;
```

### Late Tasks

```sql
SELECT
  p.name as project,
  t.name as task,
  t.end_date,
  t.status,
  CURRENT_DATE - t.end_date as days_overdue
FROM prioritized_tasks_view ptv
JOIN tasks t ON ptv.task_id = t.id
JOIN projects p ON t.project_id = p.id
WHERE ptv.priority_category = 'late'
ORDER BY t.end_date ASC;
```

### Tasks by User

```sql
SELECT
  p.name as project,
  t.name as task,
  t.task_type,
  t.status,
  t.end_date
FROM tasks t
JOIN projects p ON t.project_id = p.id
WHERE t.developer_user_id = 'user_id'
  AND t.status != 'complete'
ORDER BY t.end_date ASC;
```

### Task Completion by Status

```sql
SELECT
  project_id,
  status,
  COUNT(*) as count
FROM tasks
GROUP BY project_id, status
ORDER BY project_id;
```

---

## Maintenance Queries

### Archive Old Sessions

```sql
-- Delete expired sessions
DELETE FROM sessions
WHERE expires_at < NOW();

-- View when last cleanup happened
SELECT MAX(expires_at) FROM sessions;
```

### Archive Audit Logs (keep last 90 days)

```sql
-- Delete old audit logs
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- Check current size
SELECT
  pg_size_pretty(pg_total_relation_size('audit_logs')) as size,
  COUNT(*) as record_count
FROM audit_logs;
```

### Refresh Statistics

```sql
-- Update table statistics for query planner
ANALYZE;

-- Or specific table
ANALYZE tasks;
```

### Check Index Usage

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

### Rebuild Indexes

```sql
-- Rebuild all indexes
REINDEX DATABASE rediforge;

-- Or specific table
REINDEX TABLE tasks;
```

---

## Data Integrity Checks

### Find Orphaned Records

```sql
-- Tasks with invalid project
SELECT * FROM tasks
WHERE project_id NOT IN (SELECT id FROM projects);

-- Project objects with invalid project
SELECT * FROM project_objects
WHERE project_id NOT IN (SELECT id FROM projects);

-- Sessions for deleted users
SELECT * FROM sessions
WHERE user_id NOT IN (SELECT id FROM users);
```

### Check for Circular Dependencies

```sql
-- Find circular dependencies
WITH RECURSIVE dep_cycle AS (
  SELECT
    project_object_id as source,
    depends_on_project_object_id as target,
    1 as depth,
    ARRAY[project_object_id, depends_on_project_object_id] as path
  FROM object_dependencies
  
  UNION ALL
  
  SELECT
    dc.source,
    od.depends_on_project_object_id,
    dc.depth + 1,
    dc.path || od.depends_on_project_object_id
  FROM object_dependencies od
  JOIN dep_cycle dc ON od.project_object_id = dc.target
  WHERE NOT od.depends_on_project_object_id = ANY(dc.path)
    AND dc.depth < 20
)
SELECT * FROM dep_cycle
WHERE source = target;
```

### Tasks Violating Constraints

```sql
-- Tasks without parent (violates at_least_one_parent constraint)
SELECT * FROM tasks
WHERE project_object_id IS NULL AND task_group_id IS NULL;

-- Tasks with invalid dates
SELECT * FROM tasks
WHERE start_date > end_date;

-- Expired schedule items (date in past)
SELECT * FROM schedule_items
WHERE scheduled_date < CURRENT_DATE
  AND task_id NOT IN (
    SELECT id FROM tasks WHERE status = 'complete'
  );
```

---

## Performance Tuning

### Identify Slow Queries

```sql
-- Long-running connections
SELECT
  pid,
  usename,
  query,
  EXTRACT(EPOCH FROM (NOW() - query_start)) as duration_seconds
FROM pg_stat_activity
WHERE state = 'active'
  AND EXTRACT(EPOCH FROM (NOW() - query_start)) > 60
ORDER BY duration_seconds DESC;

-- Kill long-running query
SELECT pg_terminate_backend(pid);
```

### Check Query Execution Plan

```sql
-- View execution plan
EXPLAIN SELECT * FROM tasks WHERE project_id = 'some_id';

-- View plan with actual execution stats
EXPLAIN ANALYZE SELECT * FROM tasks WHERE project_id = 'some_id';
```

### Monitor Cache Hit Ratio

```sql
-- Cache hit ratio (should be > 99%)
SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```

---

## Common Errors and Solutions

### "Foreign key constraint is violated"

**Cause:** Trying to insert/update a record with invalid foreign key

**Solution:**
```sql
-- Verify referenced record exists
SELECT * FROM projects WHERE id = 'project_id';

-- Check constraints
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_name = 'tasks' AND constraint_type = 'FOREIGN KEY';
```

### "Unique constraint violated"

**Cause:** Duplicate value in unique column

**Solution:**
```sql
-- Check existing values
SELECT object_id, COUNT(*) as count
FROM global_objects
GROUP BY object_id HAVING COUNT(*) > 1;

-- Use ON CONFLICT to handle
INSERT INTO global_objects (object_id, description)
VALUES ('OBJECT_ID', 'Description')
ON CONFLICT (object_id) DO UPDATE SET
  description = EXCLUDED.description;
```

### "Division by zero" in view

**Cause:** Views with calculations on nullable/empty datasets

**Solution:** Already handled in views with NULLIF()

```sql
-- Example: safe division
ROUND(completed / NULLIF(total, 0) * 100, 2)
```

### "Check constraint is violated"

**Cause:** Invalid data for constraint

**Solution:**
```sql
-- For date constraints, ensure start_date <= end_date
SELECT * FROM projects
WHERE start_date > end_date;

-- For at_least_one_parent, ensure one parent exists
SELECT * FROM tasks
WHERE project_object_id IS NULL AND task_group_id IS NULL;
```

---

## Connection Management

### Show Active Connections

```sql
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state
FROM pg_stat_activity
WHERE datname = 'rediforge'
ORDER BY pid;
```

### Terminate All User Connections

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'rediforge'
  AND pid <> pg_backend_pid();
```

### Set Connection Limits

```sql
-- In postgresql.conf or set per database
ALTER DATABASE rediforge SET max_connections = 100;
```

---

## Useful Shortcuts

### View Definition

```sql
-- See view SQL
SELECT definition FROM pg_views
WHERE viewname = 'prioritized_tasks_view';

-- See table definition
\d+ tasks
```

### Export Data

```bash
# Export to CSV
psql -d rediforge -c "COPY tasks TO STDOUT WITH CSV HEADER" > tasks.csv

# Export to JSON
psql -d rediforge -c "SELECT json_agg(row_to_json(t)) FROM tasks t" > tasks.json
```

### Import Data

```bash
# Import from CSV
psql -d rediforge -c "COPY tasks FROM 'tasks.csv' WITH CSV HEADER"

# Import from JSON (requires jq + psql scripting)
jq -r '.[] | @csv' tasks.json | psql -d rediforge -c "COPY tasks FROM STDIN"
```

---

## Environment Variables

For connection pooling and application configuration:

```bash
# PostgreSQL standard
DATABASE_URL=postgresql://user:password@localhost:5432/rediforge
PGUSER=postgres
PGPASSWORD=your_password
PGHOST=localhost
PGPORT=5432
PGDATABASE=rediforge

# Connection pooling (PgBouncer)
DATABASE_POOL_URL=postgresql://pooling_user@pgbouncer:6432/rediforge
```

---

## Monitoring and Logging

### Enable Query Logging

```sql
-- In postgresql.conf
log_statement = 'all'              -- All statements
log_min_duration_statement = 1000  -- Queries over 1 second
log_duration = on                  -- Log duration of all statements

-- Or set per connection
SET log_statement = 'all';
```

### View Logs

```bash
# PostgreSQL logs location
tail -f /var/log/postgresql/postgresql.log

# Or in Docker
docker logs postgres_container | tail -f
```

### Monitor with Activity View

```sql
-- Real-time monitoring
SELECT
  datname,
  usename,
  query,
  state,
  query_start
FROM pg_stat_activity
WHERE state IS NOT NULL
ORDER BY query_start;
```

---

## Quick Troubleshooting Checklist

- [ ] Can I connect? `psql -U user -d rediforge -c "SELECT 1"`
- [ ] Are tables created? `\dt` in psql
- [ ] Are indexes present? `\di` in psql
- [ ] Check for constraint violations? Run integrity checks
- [ ] Are old sessions cleaned up? `SELECT COUNT(*) FROM sessions WHERE expires_at < NOW()`
- [ ] Is audit log growing too large? `SELECT pg_size_pretty(pg_total_relation_size('audit_logs'))`
- [ ] Are queries performant? Run ANALYZE and check slow_log
