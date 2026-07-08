#!/usr/bin/env node

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../db/migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map((row) => row.filename));
}

async function hasLegacySchema(client) {
  const result = await client.query(
    "SELECT to_regclass('public.programs') AS table_name"
  );
  return !!result.rows[0]?.table_name;
}

async function baselineAllMigrations(client, files) {
  if (files.length === 0) return;
  for (const filename of files) {
    await client.query(
      `INSERT INTO schema_migrations (filename)
       VALUES ($1)
       ON CONFLICT (filename) DO NOTHING`,
      [filename]
    );
  }
}

function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  return files;
}

async function applyMigration(client, filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf8');

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    console.log(`Applied migration: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Migration failed (${filename}): ${error.message}`);
  }
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL is required to run migrations.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const allMigrations = getMigrationFiles();

    // Existing environments historically managed migrations outside this script.
    // If legacy schema is present and no tracking rows exist, baseline all current
    // migration files so only newly added files are applied going forward.
    if (applied.size === 0 && (await hasLegacySchema(client))) {
      await baselineAllMigrations(client, allMigrations);
      console.log(`Legacy schema detected. Baselined ${allMigrations.length} migration files.`);
      return;
    }

    const pending = allMigrations.filter((file) => !applied.has(file));

    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    console.log(`Pending migrations: ${pending.length}`);
    for (const filename of pending) {
      await applyMigration(client, filename);
    }

    console.log('Migration run complete.');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
