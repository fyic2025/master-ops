/**
 * Apply CRM Schema to Supabase
 *
 * This script applies the CRM schema SQL to the BOO Supabase database
 * using a direct PostgreSQL connection.
 *
 * Run: npx tsx apply-crm-schema.ts
 */

import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

// Database connection string for BOO Supabase
// Try direct connection first, fallback to pooler
const connectionString = process.env.BOO_SUPABASE_CONNECTION_STRING ||
  `postgresql://postgres:${encodeURIComponent('Welcome1A20301qaz')}@db.usibnysqelovfuctmkqw.supabase.co:5432/postgres`

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
})

/**
 * Execute a single SQL statement
 */
async function executeSql(sql: string, statementNum: number, total: number): Promise<boolean> {
  const client = await pool.connect()
  try {
    await client.query(sql)
    return true
  } catch (error: any) {
    // Ignore "already exists" errors
    if (error.message.includes('already exists') ||
        error.message.includes('duplicate key') ||
        error.message.includes('relation') && error.message.includes('already exists')) {
      console.log(`   [${statementNum}/${total}] Skipped (already exists)`)
      return true
    }
    console.error(`   [${statementNum}/${total}] Error: ${error.message.substring(0, 100)}`)
    return false
  } finally {
    client.release()
  }
}

/**
 * Split SQL file into individual statements
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let currentStatement = ''
  let inDollarQuote = false
  let dollarQuoteTag = ''

  const lines = sql.split('\n')

  for (const line of lines) {
    // Skip pure comment lines
    if (line.trim().startsWith('--') && !inDollarQuote) {
      continue
    }

    // Check for dollar quoting (used in functions)
    const dollarMatches = line.match(/\$[\w]*\$/g)
    if (dollarMatches) {
      for (const match of dollarMatches) {
        if (!inDollarQuote) {
          inDollarQuote = true
          dollarQuoteTag = match
        } else if (match === dollarQuoteTag) {
          inDollarQuote = false
          dollarQuoteTag = ''
        }
      }
    }

    currentStatement += line + '\n'

    // Check if statement is complete
    if (line.trim().endsWith(';') && !inDollarQuote) {
      const stmt = currentStatement.trim()
      if (stmt.length > 1 && !stmt.match(/^--/)) {
        statements.push(stmt)
      }
      currentStatement = ''
    }
  }

  // Add any remaining statement
  if (currentStatement.trim().length > 1) {
    const stmt = currentStatement.trim()
    if (!stmt.match(/^--/)) {
      statements.push(stmt)
    }
  }

  return statements
}

/**
 * Group related statements (like CREATE TABLE with its indexes)
 */
function groupStatements(statements: string[]): string[][] {
  const groups: string[][] = []
  let currentGroup: string[] = []
  let lastTableName = ''

  for (const stmt of statements) {
    const createTableMatch = stmt.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/i)
    const createIndexMatch = stmt.match(/CREATE INDEX.*ON\s+(\w+)/i)
    const alterTableMatch = stmt.match(/ALTER TABLE\s+(\w+)/i)

    if (createTableMatch) {
      // Start new group for table
      if (currentGroup.length > 0) {
        groups.push(currentGroup)
      }
      currentGroup = [stmt]
      lastTableName = createTableMatch[1]
    } else if ((createIndexMatch && createIndexMatch[1] === lastTableName) ||
               (alterTableMatch && alterTableMatch[1] === lastTableName)) {
      // Add to current group if related to current table
      currentGroup.push(stmt)
    } else {
      // Standalone statement
      if (currentGroup.length > 0) {
        groups.push(currentGroup)
        currentGroup = []
        lastTableName = ''
      }
      groups.push([stmt])
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  return groups
}

async function main(): Promise<void> {
  console.log('='.repeat(60))
  console.log('APPLY CRM SCHEMA TO BOO SUPABASE')
  console.log('='.repeat(60))
  console.log('')

  // Read the SQL file
  const schemaPath = path.join(__dirname, 'supabase-schema-crm.sql')

  if (!fs.existsSync(schemaPath)) {
    console.error('Schema file not found:', schemaPath)
    process.exit(1)
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf-8')
  console.log(`Read schema file: ${schemaSql.length} characters`)

  // Test connection
  console.log('')
  console.log('Testing database connection...')
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW() as time, current_database() as db')
    console.log(`Connected to: ${result.rows[0].db}`)
    console.log(`Server time: ${result.rows[0].time}`)
    client.release()
  } catch (error: any) {
    console.error('Connection failed:', error.message)
    process.exit(1)
  }

  // Split into statements
  console.log('')
  console.log('Parsing SQL statements...')
  const statements = splitSqlStatements(schemaSql)
  console.log(`Found ${statements.length} SQL statements`)

  // Execute statements
  console.log('')
  console.log('Executing schema...')
  console.log('-'.repeat(40))

  let successful = 0
  let failed = 0
  let skipped = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]

    // Extract what type of statement this is
    let stmtType = 'Unknown'
    if (stmt.match(/CREATE TABLE/i)) {
      const match = stmt.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/i)
      stmtType = `CREATE TABLE ${match?.[1] || ''}`
    } else if (stmt.match(/CREATE INDEX/i)) {
      const match = stmt.match(/CREATE INDEX(?:\s+IF NOT EXISTS)?\s+(\w+)/i)
      stmtType = `CREATE INDEX ${match?.[1] || ''}`
    } else if (stmt.match(/CREATE OR REPLACE FUNCTION/i)) {
      const match = stmt.match(/CREATE OR REPLACE FUNCTION\s+(\w+)/i)
      stmtType = `CREATE FUNCTION ${match?.[1] || ''}`
    } else if (stmt.match(/CREATE OR REPLACE VIEW/i)) {
      const match = stmt.match(/CREATE OR REPLACE VIEW\s+(\w+)/i)
      stmtType = `CREATE VIEW ${match?.[1] || ''}`
    } else if (stmt.match(/CREATE TRIGGER/i)) {
      const match = stmt.match(/CREATE TRIGGER\s+(\w+)/i)
      stmtType = `CREATE TRIGGER ${match?.[1] || ''}`
    } else if (stmt.match(/ALTER TABLE/i)) {
      const match = stmt.match(/ALTER TABLE\s+(\w+)/i)
      stmtType = `ALTER TABLE ${match?.[1] || ''}`
    } else if (stmt.match(/INSERT INTO/i)) {
      const match = stmt.match(/INSERT INTO\s+(\w+)/i)
      stmtType = `INSERT INTO ${match?.[1] || ''}`
    } else if (stmt.match(/CREATE EXTENSION/i)) {
      stmtType = 'CREATE EXTENSION'
    } else if (stmt.match(/GRANT/i)) {
      stmtType = 'GRANT'
    } else if (stmt.match(/CREATE POLICY/i)) {
      const match = stmt.match(/CREATE POLICY\s+"([^"]+)"/i)
      stmtType = `CREATE POLICY ${match?.[1] || ''}`
    } else if (stmt.match(/DROP TRIGGER/i)) {
      stmtType = 'DROP TRIGGER'
    } else if (stmt.match(/DROP POLICY/i)) {
      stmtType = 'DROP POLICY'
    } else if (stmt.match(/DO \$\$/i)) {
      stmtType = 'DO BLOCK'
    }

    process.stdout.write(`   [${i + 1}/${statements.length}] ${stmtType.padEnd(40)}`)

    try {
      const client = await pool.connect()
      try {
        await client.query(stmt)
        console.log('OK')
        successful++
      } catch (error: any) {
        if (error.message.includes('already exists') ||
            error.message.includes('duplicate key') ||
            error.code === '42P07' || // Relation already exists
            error.code === '42710' || // Object already exists
            error.code === '42P16') { // Policy already exists
          console.log('SKIP (exists)')
          skipped++
        } else {
          console.log(`FAIL: ${error.message.substring(0, 50)}`)
          failed++
        }
      } finally {
        client.release()
      }
    } catch (error: any) {
      console.log(`FAIL: ${error.message.substring(0, 50)}`)
      failed++
    }
  }

  // Summary
  console.log('')
  console.log('='.repeat(60))
  console.log('SCHEMA APPLICATION COMPLETE')
  console.log('='.repeat(60))
  console.log('')
  console.log(`   Successful: ${successful}`)
  console.log(`   Skipped:    ${skipped} (already exist)`)
  console.log(`   Failed:     ${failed}`)
  console.log('')

  // Verify tables
  console.log('Verifying CRM tables...')
  console.log('-'.repeat(40))

  const crmTables = [
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

  const client = await pool.connect()
  let existingCount = 0

  for (const table of crmTables) {
    try {
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
      `, [table])

      const exists = parseInt(result.rows[0].count) > 0
      const status = exists ? '  EXISTS' : '  MISSING'
      console.log(`   ${status} ${table}`)
      if (exists) existingCount++
    } catch (error) {
      console.log(`   ERROR  ${table}`)
    }
  }

  client.release()

  console.log('')
  console.log(`${existingCount}/${crmTables.length} CRM tables exist`)
  console.log('')

  // Close pool
  await pool.end()

  if (existingCount === crmTables.length) {
    console.log('CRM schema applied successfully!')
    console.log('')
    console.log('Next step: Run the data population script:')
    console.log('  npx tsx populate-crm-data.ts')
  } else {
    console.log('Some tables are missing. Check errors above.')
  }
}

main().catch(console.error)
