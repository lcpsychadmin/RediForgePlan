-- Migration: 003_add_progress_to_projects.sql
-- Purpose: Add progress_percentage column to projects table
-- Date: 2026-06-16

BEGIN;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

COMMIT;
