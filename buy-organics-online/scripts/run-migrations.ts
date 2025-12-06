/**
 * Run Supabase SQL Migrations
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

// Use PostgreSQL connection via Supabase client
const { Pool } = require('pg')

// Connection parameters for Supabase Pooler (transaction mode port 6543)
const pool = new Pool({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.usibnysqelovfuctmkqw',
  password: 'poVQq7tNNtbbDlkn',
  ssl: {
    rejectUnauthorized: false
  }
})

async function runMigration(filePath: string) {
  const fileName = path.basename(filePath)
  console.log(`\n📄 Running ${fileName}...`)

  const sql = fs.readFileSync(filePath, 'utf-8')

  try {
    const client = await pool.connect()
    await client.query(sql)
    client.release()
    console.log(`✅ ${fileName} completed`)
    return true
  } catch (error: any) {
    // Check if error is because table already exists
    if (error.message.includes('already exists')) {
      console.log(`⚠️  ${fileName} - tables already exist (skipping)`)
      return true
    }
    console.error(`❌ ${fileName} failed:`, error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Running Supabase Migrations')
  console.log('================================\n')

  const migrationsDir = path.join(__dirname, 'supabase-migrations')

  const migrations = [
    '001_create_ecommerce_products.sql',
    '002_create_supplier_products.sql',
    '003_create_product_supplier_links.sql',
    '004_create_helper_tables.sql',
    '005_create_enriched_products.sql'
  ]

  let success = 0
  let failed = 0

  for (const migration of migrations) {
    const filePath = path.join(migrationsDir, migration)

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filePath}`)
      failed++
      continue
    }

    const result = await runMigration(filePath)
    if (result) {
      success++
    } else {
      failed++
    }
  }

  await pool.end()

  console.log(`\n\n📊 Migration Summary`)
  console.log(`===================`)
  console.log(`✅ Successful: ${success}`)
  console.log(`❌ Failed: ${failed}`)

  if (failed === 0) {
    console.log(`\n🎉 All migrations completed successfully!`)
    console.log(`\nNext step: Run the product sync script:`)
    console.log(`  npx tsx sync-bc-to-supabase.ts`)
  } else {
    process.exit(1)
  }
}

main()
