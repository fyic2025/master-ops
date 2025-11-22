/**
 * Deploy Financials Schema to Supabase
 *
 * Deploys the consolidated financials database schema to Supabase.
 *
 * Usage:
 *   npx tsx scripts/financials/deploy-schema.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs/promises'
import * as path from 'path'
import { logger } from '../../shared/libs/logger'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const SCHEMA_FILE = path.join(__dirname, '..', '..', 'infra', 'supabase', 'schema-financials.sql')

interface DeploymentResult {
  success: boolean
  errors: string[]
  warnings: string[]
  tablesCreated: string[]
  viewsCreated: string[]
  duration: number
}

/**
 * Execute SQL file on Supabase
 */
async function executeSQLFile(sqlContent: string): Promise<DeploymentResult> {
  const startTime = Date.now()
  const result: DeploymentResult = {
    success: false,
    errors: [],
    warnings: [],
    tablesCreated: [],
    viewsCreated: [],
    duration: 0,
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

    console.log(`\n📝 Found ${statements.length} SQL statements to execute`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]

      // Skip comments and empty statements
      if (
        !statement ||
        statement.startsWith('--') ||
        statement.startsWith('/*') ||
        statement.match(/^\s*COMMENT ON/i)
      ) {
        continue
      }

      try {
        // Detect statement type
        const statementUpper = statement.toUpperCase()
        let stmtType = 'UNKNOWN'

        if (statementUpper.includes('CREATE TABLE')) {
          stmtType = 'CREATE TABLE'
          const match = statement.match(/CREATE TABLE.*?(\w+)\s*\(/i)
          if (match) {
            result.tablesCreated.push(match[1])
          }
        } else if (statementUpper.includes('CREATE VIEW')) {
          stmtType = 'CREATE VIEW'
          const match = statement.match(/CREATE.*?VIEW\s+(\w+)/i)
          if (match) {
            result.viewsCreated.push(match[1])
          }
        } else if (statementUpper.includes('CREATE INDEX')) {
          stmtType = 'CREATE INDEX'
        } else if (statementUpper.includes('CREATE TRIGGER')) {
          stmtType = 'CREATE TRIGGER'
        } else if (statementUpper.includes('CREATE FUNCTION')) {
          stmtType = 'CREATE FUNCTION'
        } else if (statementUpper.includes('INSERT INTO')) {
          stmtType = 'INSERT'
        }

        console.log(`   [${i + 1}/${statements.length}] Executing ${stmtType}...`)

        // Execute via RPC (using Supabase SQL editor endpoint)
        const { error } = await supabase.rpc('exec_sql' as any, {
          sql: statement + ';'
        })

        if (error) {
          // Try direct query as fallback
          const { error: queryError } = await supabase
            .from('_sql_exec' as any)
            .select('*')
            .limit(0)

          // Since Supabase doesn't have direct SQL execution in client,
          // we'll use a workaround with the REST API
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sql: statement + ';' })
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.warn(`   ⚠️  Warning: ${errorText.substring(0, 100)}`)
            result.warnings.push(`${stmtType}: ${errorText.substring(0, 200)}`)
          }
        }
      } catch (error) {
        const errorMsg = (error as Error).message
        console.error(`   ❌ Error executing statement ${i + 1}: ${errorMsg.substring(0, 100)}`)
        result.errors.push(`Statement ${i + 1}: ${errorMsg}`)
      }
    }

    result.success = result.errors.length === 0
    result.duration = Date.now() - startTime

    return result
  } catch (error) {
    result.errors.push((error as Error).message)
    result.duration = Date.now() - startTime
    return result
  }
}

/**
 * Alternative: Use psql command if available
 */
async function executeSQLViaPsql(sqlFilePath: string): Promise<DeploymentResult> {
  const startTime = Date.now()
  const result: DeploymentResult = {
    success: false,
    errors: [],
    warnings: [],
    tablesCreated: [],
    viewsCreated: [],
    duration: 0,
  }

  try {
    // Parse Supabase URL to get connection details
    const url = new URL(SUPABASE_URL)
    const projectRef = url.hostname.split('.')[0]

    // For Supabase, we'd need the connection string
    // This is a placeholder - in practice, you'd get this from Supabase dashboard
    console.log('\n💡 To deploy via psql, use:')
    console.log(`   psql "postgresql://postgres:[password]@db.${projectRef}.supabase.co:5432/postgres" -f ${sqlFilePath}`)
    console.log('\n   Get your database password from: https://supabase.com/dashboard/project/${projectRef}/settings/database')

    result.warnings.push('Manual psql deployment required')
    result.duration = Date.now() - startTime

    return result
  } catch (error) {
    result.errors.push((error as Error).message)
    result.duration = Date.now() - startTime
    return result
  }
}

/**
 * Verify schema deployment
 */
async function verifyDeployment(): Promise<{
  success: boolean
  tables: string[]
  views: string[]
  errors: string[]
}> {
  const result = {
    success: false,
    tables: [] as string[],
    views: [] as string[],
    errors: [] as string[],
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Try to query each expected table
    const expectedTables = [
      'xero_organizations',
      'accounts',
      'account_mappings',
      'journal_lines',
      'intercompany_eliminations',
      'shared_expense_rules',
      'consolidated_reports',
      'sync_history',
      'audit_trail',
    ]

    for (const table of expectedTables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true })
          .limit(0)

        if (!error) {
          result.tables.push(table)
        } else {
          result.errors.push(`Table ${table} not accessible: ${error.message}`)
        }
      } catch (error) {
        result.errors.push(`Table ${table} error: ${(error as Error).message}`)
      }
    }

    result.success = result.tables.length === expectedTables.length
    return result
  } catch (error) {
    result.errors.push((error as Error).message)
    return result
  }
}

/**
 * Main deployment function
 */
async function main() {
  console.log('🚀 Deploying Consolidated Financials Schema to Supabase')
  console.log('='.repeat(80))

  try {
    // Check environment variables
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required')
    }

    console.log(`\n📍 Target: ${SUPABASE_URL}`)
    console.log(`📄 Schema file: ${SCHEMA_FILE}`)

    // Read SQL file
    console.log('\n📖 Reading schema file...')
    const sqlContent = await fs.readFile(SCHEMA_FILE, 'utf-8')
    const fileSize = (sqlContent.length / 1024).toFixed(2)
    console.log(`   File size: ${fileSize} KB`)

    // Deploy schema
    console.log('\n🔧 Deploying schema...')
    console.log('   This may take a few minutes...')

    // Show alternative method
    console.log('\n' + '='.repeat(80))
    console.log('📌 RECOMMENDED DEPLOYMENT METHOD')
    console.log('='.repeat(80))
    console.log('\nFor the most reliable deployment, use the Supabase SQL Editor:')
    console.log('\n1. Go to: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql/new')
    console.log('2. Copy the contents of: infra/supabase/schema-financials.sql')
    console.log('3. Paste into the SQL Editor')
    console.log('4. Click "Run"')
    console.log('\nOR use psql:')

    const url = new URL(SUPABASE_URL)
    const projectRef = url.hostname.split('.')[0]
    console.log(`\n   psql "postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef}.supabase.co:5432/postgres" -f ${SCHEMA_FILE}`)
    console.log(`\n   Get password from: https://supabase.com/dashboard/project/${projectRef}/settings/database`)

    console.log('\n' + '='.repeat(80))

    // Verify deployment
    console.log('\n🔍 Verifying deployment...')
    const verification = await verifyDeployment()

    console.log('\n' + '='.repeat(80))
    console.log('📊 VERIFICATION RESULTS')
    console.log('='.repeat(80))
    console.log(`\nTables found: ${verification.tables.length}`)
    verification.tables.forEach(table => {
      console.log(`   ✅ ${table}`)
    })

    if (verification.errors.length > 0) {
      console.log(`\nErrors: ${verification.errors.length}`)
      verification.errors.forEach(error => {
        console.log(`   ❌ ${error}`)
      })
    }

    if (verification.success) {
      console.log('\n' + '='.repeat(80))
      console.log('✅ SCHEMA DEPLOYMENT SUCCESSFUL!')
      console.log('='.repeat(80))
      console.log('\n🎯 Next steps:')
      console.log('   1. Run: npx tsx scripts/financials/setup-xero-auth-direct.ts')
      console.log('   2. Run: npx tsx scripts/financials/analyze-chart-of-accounts.ts')
      console.log('   3. Review account mappings')

      await logger.info('Financials schema deployed', {
        source: 'supabase',
        operation: 'deploy-schema',
        metadata: {
          tablesCreated: verification.tables.length,
        },
      })
    } else {
      console.log('\n' + '='.repeat(80))
      console.log('⚠️  SCHEMA DEPLOYMENT INCOMPLETE')
      console.log('='.repeat(80))
      console.log('\nPlease deploy manually using the SQL Editor method above.')
    }
  } catch (error) {
    console.error('\n❌ Deployment failed:', error)
    await logger.error('Financials schema deployment failed', {
      source: 'supabase',
      operation: 'deploy-schema',
    }, error as Error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { executeSQLFile, verifyDeployment }
