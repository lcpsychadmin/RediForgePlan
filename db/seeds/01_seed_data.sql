-- Seed data for RediForge database
-- Date: 2026-06-15

BEGIN;

-- =====================================================
-- SEED USERS (for testing)
-- =====================================================

INSERT INTO users (id, email, password_hash, role, mfa_enabled)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@rediforge.com', '$2b$10$hashed_password_admin', 'admin', true),
  ('22222222-2222-2222-2222-222222222222', 'analyst@rediforge.com', '$2b$10$hashed_password_analyst', 'analyst', true),
  ('33333333-3333-3333-3333-333333333333', 'viewer@rediforge.com', '$2b$10$hashed_password_viewer', 'viewer', false)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- SEED PROGRAMS
-- =====================================================

INSERT INTO programs (id, name, description)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ERP Migration - SAP Implementation', 'Company-wide migration from legacy systems to SAP S/4HANA'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Cloud Migration Initiative', 'Move all on-premises workloads to AWS/Azure'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Data Modernization Program', 'Modernize data infrastructure and analytics')
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED MOCK CYCLES
-- =====================================================

INSERT INTO mock_cycles (id, program_id, name, start_date, end_date)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mock Cycle 1 - Q2 2026', '2026-04-01', '2026-06-30'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mock Cycle 2 - Q3 2026', '2026-07-01', '2026-09-30'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Cloud Pilot - Wave 1', '2026-05-01', '2026-07-31')
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED PROJECTS
-- =====================================================

INSERT INTO projects (id, mock_cycle_id, name, description, start_date, end_date)
VALUES
  ('11111111-2222-3333-4444-555555555555', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Finance Module Migration', 'Migrate Finance GL, AP, AR modules to SAP', '2026-04-15', '2026-06-15'),
  ('11111111-2222-3333-4444-666666666666', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'HR/Payroll Module Migration', 'Migrate HR, Payroll, Benefits to SAP', '2026-05-01', '2026-07-15'),
  ('11111111-2222-3333-4444-777777777777', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Production Workloads Migration', 'Move production systems to cloud', '2026-05-15', '2026-08-31')
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED GLOBAL OBJECTS (Canonical)
-- =====================================================

INSERT INTO global_objects (id, object_id, description, process_area)
VALUES
  ('aaaaaaaa-1111-1111-1111-111111111111', 'GL_MASTER', 'General Ledger Master Data', 'Finance'),
  ('aaaaaaaa-2222-2222-2222-222222222222', 'VENDOR_MASTER', 'Vendor Master Data', 'Procurement'),
  ('aaaaaaaa-3333-3333-3333-333333333333', 'CUSTOMER_MASTER', 'Customer Master Data', 'Sales'),
  ('aaaaaaaa-4444-4444-4444-444444444444', 'EMPLOYEE_MASTER', 'Employee Master Data', 'HR'),
  ('aaaaaaaa-5555-5555-5555-555555555555', 'PURCHASE_ORDERS', 'Purchase Orders', 'Procurement'),
  ('aaaaaaaa-6666-6666-6666-666666666666', 'SALES_ORDERS', 'Sales Orders', 'Sales'),
  ('aaaaaaaa-7777-7777-7777-777777777777', 'INVOICES', 'Customer Invoices', 'Finance'),
  ('aaaaaaaa-8888-8888-8888-888888888888', 'PAYMENTS', 'Vendor Payments', 'Finance')
ON CONFLICT (object_id) DO NOTHING;

-- =====================================================
-- SEED PROJECT OBJECTS
-- =====================================================

INSERT INTO project_objects (
  id, project_id, global_object_id, complexity, build_type, status,
  dra_user_id, developer_user_id, start_date, end_date
)
VALUES
  (
    'pppppppp-1111-1111-1111-111111111111',
    '11111111-2222-3333-4444-555555555555',
    'aaaaaaaa-1111-1111-1111-111111111111',
    'medium',
    'SAP_STANDARD',
    'in_progress',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '2026-04-15',
    '2026-05-30'
  ),
  (
    'pppppppp-2222-2222-2222-222222222222',
    '11111111-2222-3333-4444-555555555555',
    'aaaaaaaa-2222-2222-2222-222222222222',
    'high',
    'CUSTOM',
    'not_started',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '2026-05-01',
    '2026-06-15'
  ),
  (
    'pppppppp-3333-3333-3333-333333333333',
    '11111111-2222-3333-4444-666666666666',
    'aaaaaaaa-4444-4444-4444-444444444444',
    'medium',
    'SAP_STANDARD',
    'blocked',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '2026-05-01',
    '2026-07-15'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED OBJECT DEPENDENCIES
-- =====================================================

INSERT INTO object_dependencies (id, project_object_id, depends_on_project_object_id)
VALUES
  (
    'dddddddd-1111-1111-1111-111111111111',
    'pppppppp-2222-2222-2222-222222222222',
    'pppppppp-1111-1111-1111-111111111111'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED TASK GROUPS
-- =====================================================

INSERT INTO task_groups (id, project_id, name, description, start_date, end_date)
VALUES
  (
    'tgtgtgtg-1111-1111-1111-111111111111',
    '11111111-2222-3333-4444-555555555555',
    'Data Extraction and Validation',
    'Extract data from legacy GL system and validate completeness',
    '2026-04-15',
    '2026-05-10'
  ),
  (
    'tgtgtgtg-2222-2222-2222-222222222222',
    '11111111-2222-3333-4444-555555555555',
    'SAP Configuration and Testing',
    'Configure GL module in SAP and execute functional tests',
    '2026-05-11',
    '2026-05-30'
  ),
  (
    'tgtgtgtg-3333-3333-3333-333333333333',
    '11111111-2222-3333-4444-666666666666',
    'HR System Integration',
    'Integrate HR system with payroll processing',
    '2026-05-01',
    '2026-06-30'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED TASKS
-- =====================================================

-- Tasks under project objects
INSERT INTO tasks (
  id, project_id, project_object_id, task_type, status,
  dra_user_id, developer_user_id, start_date, end_date, notes
)
VALUES
  (
    'tttttttt-1111-1111-1111-111111111111',
    '11111111-2222-3333-4444-555555555555',
    'pppppppp-1111-1111-1111-111111111111',
    'extract',
    'complete',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '2026-04-15',
    '2026-04-25',
    'GL master data extraction completed successfully'
  ),
  (
    'tttttttt-2222-2222-2222-222222222222',
    '11111111-2222-3333-4444-555555555555',
    'pppppppp-1111-1111-1111-111111111111',
    'preload_validation',
    'in_progress',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '2026-04-26',
    '2026-05-05',
    'Validating data quality before load'
  ),
  (
    'tttttttt-3333-3333-3333-333333333333',
    '11111111-2222-3333-4444-555555555555',
    'pppppppp-1111-1111-1111-111111111111',
    'load',
    'not_started',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '2026-05-06',
    '2026-05-10',
    NULL
  )
ON CONFLICT DO NOTHING;

-- Tasks under task groups
INSERT INTO tasks (
  id, project_id, task_group_id, task_type, status,
  dra_user_id, developer_user_id, start_date, end_date, notes
)
VALUES
  (
    'tttttttt-4444-4444-4444-444444444444',
    '11111111-2222-3333-4444-555555555555',
    'tgtgtgtg-2222-2222-2222-222222222222',
    'transform',
    'not_started',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '2026-05-11',
    '2026-05-20',
    'Transform GL data for SAP format'
  ),
  (
    'tttttttt-5555-5555-5555-555555555555',
    '11111111-2222-3333-4444-555555555555',
    'tgtgtgtg-2222-2222-2222-222222222222',
    'custom',
    'blocked',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '2026-05-21',
    '2026-05-30',
    'Testing GL transactions in SAP'
  ),
  (
    'tttttttt-6666-6666-6666-666666666666',
    '11111111-2222-3333-4444-666666666666',
    'tgtgtgtg-3333-3333-3333-333333333333',
    'custom',
    'in_progress',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '2026-05-15',
    '2026-06-15',
    'Integrating employee data with payroll'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED SCHEDULE ITEMS
-- =====================================================

INSERT INTO schedule_items (id, project_id, task_id, scheduled_date)
VALUES
  (
    'ssssssss-1111-1111-1111-111111111111',
    '11111111-2222-3333-4444-555555555555',
    'tttttttt-1111-1111-1111-111111111111',
    '2026-04-25'
  ),
  (
    'ssssssss-2222-2222-2222-222222222222',
    '11111111-2222-3333-4444-555555555555',
    'tttttttt-2222-2222-2222-222222222222',
    '2026-05-05'
  ),
  (
    'ssssssss-3333-3333-3333-333333333333',
    '11111111-2222-3333-4444-555555555555',
    'tttttttt-3333-3333-3333-333333333333',
    '2026-05-10'
  ),
  (
    'ssssssss-4444-4444-4444-444444444444',
    '11111111-2222-3333-4444-555555555555',
    'tttttttt-4444-4444-4444-444444444444',
    '2026-05-20'
  ),
  (
    'ssssssss-5555-5555-5555-555555555555',
    '11111111-2222-3333-4444-555555555555',
    'tttttttt-5555-5555-5555-555555555555',
    '2026-05-30'
  ),
  (
    'ssssssss-6666-6666-6666-666666666666',
    '11111111-2222-3333-4444-666666666666',
    'tttttttt-6666-6666-6666-666666666666',
    '2026-06-15'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED AUDIT LOGS (sample entries)
-- =====================================================

INSERT INTO audit_logs (
  id, user_id, entity_type, entity_id, action, after_data
)
VALUES
  (
    'llllllll-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'projects',
    '11111111-2222-3333-4444-555555555555',
    'create',
    '{"name": "Finance Module Migration", "status": "created"}'::jsonb
  ),
  (
    'llllllll-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'tasks',
    'tttttttt-1111-1111-1111-111111111111',
    'update',
    '{"status": "complete", "completed_at": "2026-04-25"}'::jsonb
  ),
  (
    'llllllll-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'project_objects',
    'pppppppp-1111-1111-1111-111111111111',
    'update',
    '{"status": "in_progress", "updated_at": "2026-04-20"}'::jsonb
  )
ON CONFLICT DO NOTHING;

COMMIT;
