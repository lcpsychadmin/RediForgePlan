-- Migration: 002_add_accent_color_to_projects.sql
-- Purpose: Add accent_color column to projects table
-- Date: 2026-06-16

BEGIN;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7);

COMMIT;
