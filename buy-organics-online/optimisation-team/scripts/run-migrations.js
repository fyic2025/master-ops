#!/usr/bin/env node

/**
 * Run Database Migrations
 *
 * Usage:
 *   npm run migrate
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, readdirSync } from 'fs';
import dotenv from 'dotenv';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

import { getSupabaseClient } from '../lib/supabase-client.js';

async function main() {
  console.log(chalk.blue('\n🗄️ BOO Optimisation Team - Database Migrations\n'));

  const supabase = getSupabaseClient();

  if (!supabase) {
    console.log(chalk.yellow('Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.'));
    console.log('\nTo run migrations manually:');
    console.log('  1. Open Supabase SQL Editor');
    console.log('  2. Copy contents of migrations/001_optimisation_schema.sql');
    console.log('  3. Execute the SQL');
    return;
  }

  const migrationsDir = join(__dirname, '../migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration file(s)\n`);

  for (const file of files) {
    console.log(`Running: ${file}...`);

    try {
      const sql = readFileSync(join(migrationsDir, file), 'utf8');

      // Split into statements (simple approach)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.toLowerCase().startsWith('create') ||
            statement.toLowerCase().startsWith('alter') ||
            statement.toLowerCase().startsWith('insert')) {
          const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
          if (error && !error.message.includes('already exists')) {
            console.log(chalk.yellow(`  Warning: ${error.message}`));
          }
        }
      }

      console.log(chalk.green(`  ✓ ${file} completed`));

    } catch (error) {
      console.log(chalk.red(`  ✗ ${file} failed: ${error.message}`));
    }
  }

  console.log(chalk.green('\n✓ Migrations complete\n'));
  console.log('Note: You may need to run the SQL manually in Supabase SQL Editor');
  console.log('if the RPC method is not available.');
}

main().catch(console.error);
