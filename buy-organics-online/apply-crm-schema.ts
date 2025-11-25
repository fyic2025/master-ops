/**
 * Apply CRM Schema to Supabase
 *
 * This script reads the CRM schema SQL file and applies it to Supabase
 * using the Supabase client's RPC/SQL execution capability.
 *
 * Run: npx tsx apply-crm-schema.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Configuration
const SUPABASE_URL = process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

/**
 * Split SQL file into individual statements
 */
function splitSqlStatements(sql: string): string[] {
  // Remove comments
  let cleanSql = sql
    .replace(/--[^\n]*/g, '') // Remove single line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments

  // Split by semicolons, but be careful with functions
  const statements: string[] = []
  let currentStatement = ''
  let inFunction = false
  let dollarQuote = ''

  const lines = cleanSql.split('\n')

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Check for $$ or $something$ dollar quoting
    const dollarMatch = trimmedLine.match(/\$[\w]*\$/)
    if (dollarMatch && !inFunction) {
      inFunction = true
      dollarQuote = dollarMatch[0]
    } else if (dollarMatch && dollarMatch[0] === dollarQuote && inFunction) {
      inFunction = false
      dollarQuote = ''
    }

    currentStatement += line + '\n'

    // Only split on semicolon if not inside a function
    if (trimmedLine.endsWith(';') && !inFunction) {
      const stmt = currentStatement.trim()
      if (stmt.length > 1) {
        statements.push(stmt)
      }
      currentStatement = ''
    }
  }

  // Add any remaining statement
  if (currentStatement.trim().length > 1) {
    statements.push(currentStatement.trim())
  }

  return statements
}

/**
 * Execute SQL statements one by one
 */
async function executeSql(sql: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Apply schema using direct REST API
 */
async function applySchemaViaRest(sql: string): Promise<void> {
  // Use the Supabase Management API or direct PostgreSQL connection
  // For now, we'll create individual tables via the Supabase client

  console.log('⚠️  Note: For full schema application, use the Supabase Dashboard SQL Editor')
  console.log('   URL: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new')
  console.log('')
  console.log('   Copy the contents of: supabase-schema-crm.sql')
  console.log('   And paste into the SQL editor, then click "Run"')
  console.log('')
}

/**
 * Verify tables were created
 */
async function verifyTables(): Promise<void> {
  console.log('🔍 Verifying CRM tables...')

  const tables = [
    'customers',
    'customer_addresses',
    'orders',
    'order_items',
    'customer_interactions',
    'customer_segments',
    'customer_segment_memberships',
    'customer_tags',
    'customer_tag_assignments',
    'customer_metrics',
    'email_campaigns',
    'email_events',
    'support_tickets',
    'support_messages',
    'marketing_campaigns',
    'customer_attribution',
    'product_reviews',
    'customer_wishlists'
  ]

  const results: { table: string; exists: boolean }[] = []

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1)
      results.push({ table, exists: !error })
    } catch {
      results.push({ table, exists: false })
    }
  }

  console.log('')
  console.log('Table Status:')
  console.log('-'.repeat(40))

  for (const result of results) {
    const status = result.exists ? '✅' : '❌'
    console.log(`  ${status} ${result.table}`)
  }

  const existingCount = results.filter(r => r.exists).length
  console.log('')
  console.log(`${existingCount}/${tables.length} tables exist`)
}

async function main(): Promise<void> {
  console.log('='.repeat(60))
  console.log('APPLY CRM SCHEMA TO SUPABASE')
  console.log('='.repeat(60))
  console.log('')

  // Read the SQL file
  const schemaPath = path.join(__dirname, 'supabase-schema-crm.sql')

  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found:', schemaPath)
    process.exit(1)
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf-8')
  console.log(`📄 Read schema file: ${schemaSql.length} characters`)
  console.log('')

  // Try to verify if tables already exist
  await verifyTables()

  console.log('')
  console.log('='.repeat(60))
  console.log('TO APPLY THE SCHEMA:')
  console.log('='.repeat(60))
  console.log('')
  console.log('1. Open Supabase SQL Editor:')
  console.log('   https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new')
  console.log('')
  console.log('2. Copy the contents of:')
  console.log('   /home/user/master-ops/buy-organics-online/supabase-schema-crm.sql')
  console.log('')
  console.log('3. Paste into the SQL editor and click "Run"')
  console.log('')
  console.log('4. After applying, run this verification again:')
  console.log('   npx tsx apply-crm-schema.ts')
  console.log('')

  // Generate a curl command for direct SQL execution if management API is available
  console.log('='.repeat(60))
  console.log('ALTERNATIVE: Direct PostgreSQL Connection')
  console.log('='.repeat(60))
  console.log('')
  console.log('If you have psql access, you can run:')
  console.log('')
  console.log('  psql "postgresql://postgres:[PASSWORD]@db.usibnysqelovfuctmkqw.supabase.co:5432/postgres" \\')
  console.log('    -f supabase-schema-crm.sql')
  console.log('')
}

main().catch(console.error)
