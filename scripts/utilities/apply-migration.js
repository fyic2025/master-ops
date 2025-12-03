#!/usr/bin/env node
/**
 * Apply SQL Migration to Supabase
 * Usage: node scripts/apply-migration.js <migration_file>
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('Usage: node scripts/apply-migration.js <migration_file>');
    process.exit(1);
  }

  const fullPath = path.resolve(migrationFile);
  if (!fs.existsSync(fullPath)) {
    console.error(`Migration file not found: ${fullPath}`);
    process.exit(1);
  }

  // Load credentials
  const creds = require('../creds.js');
  await creds.load('global');

  // Master Supabase connection
  // The project ref is qcvfxxsnqvdfmpbcgdni
  const connectionString = process.env.MASTER_SUPABASE_CONNECTION_STRING ||
    `postgresql://postgres.qcvfxxsnqvdfmpbcgdni:${process.env.MASTER_SUPABASE_DB_PASSWORD}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`;

  // If no connection string, try direct mode with transaction pooler
  const client = new Client({
    host: 'db.qcvfxxsnqvdfmpbcgdni.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.MASTER_SUPABASE_DB_PASSWORD || 'REQUIRED',
    ssl: { rejectUnauthorized: false }
  });

  console.log(`\n📋 Applying migration: ${path.basename(fullPath)}`);

  const sql = fs.readFileSync(fullPath, 'utf8');
  console.log(`   SQL length: ${sql.length} bytes`);

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Execute migration
    await client.query(sql);
    console.log('✅ Migration applied successfully!');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    // Try to give more detail
    if (err.position) {
      const pos = parseInt(err.position);
      const context = sql.substring(Math.max(0, pos - 50), pos + 50);
      console.error('   Near:', context);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration().catch(console.error);
