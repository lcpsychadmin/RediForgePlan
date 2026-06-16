# Database Migrations

This directory contains all database migrations for the RediForge application.

## Structure

- `migrations/` - Versioned SQL migration files
- `seeds/` - Sample data for development

## Running Migrations

### Local Development

```bash
# Run all migrations
psql -U postgres -d rediforge -f schema.sql

# Or run individual migrations
psql -U postgres -d rediforge -f migrations/001_initial_schema.sql
```

### Heroku Production

```bash
# Heroku will run migrations automatically on deployment
# To manually run migrations:
heroku pg:psql --app YOUR_APP_NAME < db/migrations/001_initial_schema.sql
```

## Creating New Migrations

1. Create a new file in `migrations/` with naming convention: `NNN_description.sql`
2. Write your SQL migration using `BEGIN;` and `COMMIT;` for transactions
3. Test locally before deploying
4. Deploy to Heroku

Example:
```sql
-- Migration: 002_add_new_table
-- Description: Add a new feature table
-- Created: 2024-06-15

BEGIN;

CREATE TABLE new_table (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
```

## Seeding Data

Run seed scripts in the `seeds/` directory for development:

```bash
psql -U postgres -d rediforge -f seeds/01_users.sql
```

**Note:** Seeds are for local development only. Do not run on production.
