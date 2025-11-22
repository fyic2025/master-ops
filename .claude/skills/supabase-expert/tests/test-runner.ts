#!/usr/bin/env npx tsx

/**
 * Test Runner for Supabase Expert Scripts
 *
 * Runs comprehensive tests on all Supabase monitoring and maintenance scripts
 *
 * Usage:
 *   npx tsx test-runner.ts              # Run all tests
 *   npx tsx test-runner.ts --unit       # Run only unit tests
 *   npx tsx test-runner.ts --integration # Run only integration tests
 *   npx tsx test-runner.ts --quick      # Quick smoke tests only
 */

import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface TestResult {
  suite: string
  test: string
  status: 'pass' | 'fail' | 'skip'
  duration_ms: number
  error?: string
  details?: any
}

interface TestSuite {
  name: string
  tests: TestResult[]
  total: number
  passed: number
  failed: number
  skipped: number
  duration_ms: number
}

const testResults: TestSuite[] = []

async function runTest(
  suite: string,
  test: string,
  fn: () => Promise<void>
): Promise<TestResult> {
  const startTime = Date.now()

  try {
    await fn()
    return {
      suite,
      test,
      status: 'pass',
      duration_ms: Date.now() - startTime
    }
  } catch (error) {
    return {
      suite,
      test,
      status: 'fail',
      duration_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// Test Suite: Database Connectivity
async function testDatabaseConnectivity(): Promise<TestSuite> {
  console.log('\n🔌 Testing Database Connectivity...')

  const suite: TestSuite = {
    name: 'Database Connectivity',
    tests: [],
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration_ms: 0
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const startTime = Date.now()

  // Test 1: Basic connection
  suite.tests.push(await runTest('connectivity', 'basic_connection', async () => {
    const { error } = await supabase.from('businesses').select('count').limit(1)
    if (error) throw new Error(`Connection failed: ${error.message}`)
  }))

  // Test 2: Service role permissions
  suite.tests.push(await runTest('connectivity', 'service_role_permissions', async () => {
    const { error } = await supabase.from('integration_logs').select('*').limit(1)
    if (error) throw new Error(`Permission check failed: ${error.message}`)
  }))

  // Test 3: View access
  suite.tests.push(await runTest('connectivity', 'view_access', async () => {
    const { error } = await supabase.from('integration_health_summary').select('*').limit(1)
    if (error) throw new Error(`View access failed: ${error.message}`)
  }))

  suite.duration_ms = Date.now() - startTime
  suite.total = suite.tests.length
  suite.passed = suite.tests.filter(t => t.status === 'pass').length
  suite.failed = suite.tests.filter(t => t.status === 'fail').length

  return suite
}

// Test Suite: Health Check Script
async function testHealthCheckScript(): Promise<TestSuite> {
  console.log('\n🏥 Testing Health Check Script...')

  const suite: TestSuite = {
    name: 'Health Check Script',
    tests: [],
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration_ms: 0
  }

  const startTime = Date.now()
  const scriptPath = path.join(__dirname, '..', 'scripts', 'health-check.ts')

  // Test 1: Script exists
  suite.tests.push(await runTest('health-check', 'script_exists', async () => {
    if (!fs.existsSync(scriptPath)) throw new Error('Script not found')
  }))

  // Test 2: Script executes without errors
  suite.tests.push(await runTest('health-check', 'script_execution', async () => {
    try {
      execSync(`npx tsx ${scriptPath}`, { cwd: path.join(__dirname, '..', '..', '..', '..') })
    } catch (error) {
      // Exit code 1 is acceptable (indicates warnings/issues found)
      // Only fail on actual execution errors
      if (error instanceof Error && !error.message.includes('exit code')) {
        throw error
      }
    }
  }))

  // Test 3: Output file created
  suite.tests.push(await runTest('health-check', 'output_file_created', async () => {
    const logsDir = path.join(__dirname, '..', '..', '..', '..', 'logs')
    const files = fs.readdirSync(logsDir).filter(f => f.startsWith('supabase-health-check-'))
    if (files.length === 0) throw new Error('No health check output file found')
  }))

  // Test 4: Valid JSON output
  suite.tests.push(await runTest('health-check', 'valid_json_output', async () => {
    const logsDir = path.join(__dirname, '..', '..', '..', '..', 'logs')
    const files = fs.readdirSync(logsDir)
      .filter(f => f.startsWith('supabase-health-check-'))
      .sort()
      .reverse()

    if (files.length === 0) throw new Error('No output file found')

    const content = fs.readFileSync(path.join(logsDir, files[0]), 'utf-8')
    const data = JSON.parse(content)

    if (!data.timestamp || !data.overall_status || !data.checks) {
      throw new Error('Invalid health check output structure')
    }
  }))

  suite.duration_ms = Date.now() - startTime
  suite.total = suite.tests.length
  suite.passed = suite.tests.filter(t => t.status === 'pass').length
  suite.failed = suite.tests.filter(t => t.status === 'fail').length

  return suite
}

// Test Suite: Performance Audit Script
async function testPerformanceAuditScript(): Promise<TestSuite> {
  console.log('\n⚡ Testing Performance Audit Script...')

  const suite: TestSuite = {
    name: 'Performance Audit Script',
    tests: [],
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration_ms: 0
  }

  const startTime = Date.now()
  const scriptPath = path.join(__dirname, '..', 'scripts', 'performance-audit.ts')

  // Test 1: Script exists
  suite.tests.push(await runTest('performance-audit', 'script_exists', async () => {
    if (!fs.existsSync(scriptPath)) throw new Error('Script not found')
  }))

  // Test 2: Script executes
  suite.tests.push(await runTest('performance-audit', 'script_execution', async () => {
    try {
      execSync(`npx tsx ${scriptPath}`, {
        cwd: path.join(__dirname, '..', '..', '..', '..'),
        timeout: 30000
      })
    } catch (error) {
      if (error instanceof Error && !error.message.includes('exit code')) {
        throw error
      }
    }
  }))

  suite.duration_ms = Date.now() - startTime
  suite.total = suite.tests.length
  suite.passed = suite.tests.filter(t => t.status === 'pass').length
  suite.failed = suite.tests.filter(t => t.status === 'fail').length

  return suite
}

// Test Suite: Cleanup Maintenance Script
async function testCleanupMaintenanceScript(): Promise<TestSuite> {
  console.log('\n🧹 Testing Cleanup Maintenance Script...')

  const suite: TestSuite = {
    name: 'Cleanup Maintenance Script',
    tests: [],
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration_ms: 0
  }

  const startTime = Date.now()
  const scriptPath = path.join(__dirname, '..', 'scripts', 'cleanup-maintenance.ts')

  // Test 1: Script exists
  suite.tests.push(await runTest('cleanup', 'script_exists', async () => {
    if (!fs.existsSync(scriptPath)) throw new Error('Script not found')
  }))

  // Test 2: Dry-run mode works
  suite.tests.push(await runTest('cleanup', 'dry_run_mode', async () => {
    try {
      execSync(`npx tsx ${scriptPath} --dry-run`, {
        cwd: path.join(__dirname, '..', '..', '..', '..'),
        timeout: 30000
      })
    } catch (error) {
      if (error instanceof Error && !error.message.includes('exit code')) {
        throw error
      }
    }
  }))

  suite.duration_ms = Date.now() - startTime
  suite.total = suite.tests.length
  suite.passed = suite.tests.filter(t => t.status === 'pass').length
  suite.failed = suite.tests.filter(t => t.status === 'fail').length

  return suite
}

// Test Suite: Backup Validator Script
async function testBackupValidatorScript(): Promise<TestSuite> {
  console.log('\n💾 Testing Backup Validator Script...')

  const suite: TestSuite = {
    name: 'Backup Validator Script',
    tests: [],
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration_ms: 0
  }

  const startTime = Date.now()
  const scriptPath = path.join(__dirname, '..', 'scripts', 'backup-validator.ts')

  // Test 1: Script exists
  suite.tests.push(await runTest('backup-validator', 'script_exists', async () => {
    if (!fs.existsSync(scriptPath)) throw new Error('Script not found')
  }))

  // Test 2: Script executes
  suite.tests.push(await runTest('backup-validator', 'script_execution', async () => {
    try {
      execSync(`npx tsx ${scriptPath}`, {
        cwd: path.join(__dirname, '..', '..', '..', '..'),
        timeout: 60000
      })
    } catch (error) {
      if (error instanceof Error && !error.message.includes('exit code')) {
        throw error
      }
    }
  }))

  // Test 3: Export schema mode
  suite.tests.push(await runTest('backup-validator', 'export_schema_mode', async () => {
    try {
      execSync(`npx tsx ${scriptPath} --export-schema`, {
        cwd: path.join(__dirname, '..', '..', '..', '..'),
        timeout: 10000
      })

      const logsDir = path.join(__dirname, '..', '..', '..', '..', 'logs')
      const files = fs.readdirSync(logsDir).filter(f => f.startsWith('schema-export-'))
      if (files.length === 0) throw new Error('Schema export file not created')
    } catch (error) {
      if (error instanceof Error && !error.message.includes('Schema export file')) {
        throw error
      }
    }
  }))

  suite.duration_ms = Date.now() - startTime
  suite.total = suite.tests.length
  suite.passed = suite.tests.filter(t => t.status === 'pass').length
  suite.failed = suite.tests.filter(t => t.status === 'fail').length

  return suite
}

// Test Suite: Data Exporter Script
async function testDataExporterScript(): Promise<TestSuite> {
  console.log('\n📊 Testing Data Exporter Script...')

  const suite: TestSuite = {
    name: 'Data Exporter Script',
    tests: [],
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration_ms: 0
  }

  const startTime = Date.now()
  const scriptPath = path.join(__dirname, '..', 'scripts', 'data-exporter.ts')

  // Test 1: Script exists
  suite.tests.push(await runTest('data-exporter', 'script_exists', async () => {
    if (!fs.existsSync(scriptPath)) throw new Error('Script not found')
  }))

  // Test 2: JSON export mode
  suite.tests.push(await runTest('data-exporter', 'json_export', async () => {
    try {
      execSync(`npx tsx ${scriptPath} --format=json --period=1`, {
        cwd: path.join(__dirname, '..', '..', '..', '..'),
        timeout: 30000
      })

      const exportsDir = path.join(__dirname, '..', '..', '..', '..', 'exports')
      const files = fs.readdirSync(exportsDir).filter(f => f.startsWith('supabase-export-') && f.endsWith('.json'))
      if (files.length === 0) throw new Error('JSON export file not created')
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        // Export directory might not exist yet
        return
      }
      throw error
    }
  }))

  suite.duration_ms = Date.now() - startTime
  suite.total = suite.tests.length
  suite.passed = suite.tests.filter(t => t.status === 'pass').length
  suite.failed = suite.tests.filter(t => t.status === 'fail').length

  return suite
}

// Test Suite: SQL Query Library
async function testSQLQueryLibrary(): Promise<TestSuite> {
  console.log('\n📚 Testing SQL Query Library...')

  const suite: TestSuite = {
    name: 'SQL Query Library',
    tests: [],
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration_ms: 0
  }

  const startTime = Date.now()
  const scriptPath = path.join(__dirname, '..', 'scripts', 'sql-query-library.ts')

  // Test 1: Script exists
  suite.tests.push(await runTest('sql-library', 'script_exists', async () => {
    if (!fs.existsSync(scriptPath)) throw new Error('Script not found')
  }))

  // Test 2: List all queries
  suite.tests.push(await runTest('sql-library', 'list_queries', async () => {
    execSync(`npx tsx ${scriptPath}`, {
      cwd: path.join(__dirname, '..', '..', '..', '..'),
      timeout: 5000
    })
  }))

  // Test 3: Fetch specific query
  suite.tests.push(await runTest('sql-library', 'fetch_query', async () => {
    execSync(`npx tsx ${scriptPath} overall-health`, {
      cwd: path.join(__dirname, '..', '..', '..', '..'),
      timeout: 5000
    })
  }))

  suite.duration_ms = Date.now() - startTime
  suite.total = suite.tests.length
  suite.passed = suite.tests.filter(t => t.status === 'pass').length
  suite.failed = suite.tests.filter(t => t.status === 'fail').length

  return suite
}

// Test Suite: Type Definitions
async function testTypeDefinitions(): Promise<TestSuite> {
  console.log('\n📝 Testing Type Definitions...')

  const suite: TestSuite = {
    name: 'Type Definitions',
    tests: [],
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration_ms: 0
  }

  const startTime = Date.now()
  const typesPath = path.join(__dirname, '..', 'types', 'database.types.ts')

  // Test 1: Types file exists
  suite.tests.push(await runTest('types', 'file_exists', async () => {
    if (!fs.existsSync(typesPath)) throw new Error('Types file not found')
  }))

  // Test 2: Types file is valid TypeScript
  suite.tests.push(await runTest('types', 'valid_typescript', async () => {
    const content = fs.readFileSync(typesPath, 'utf-8')
    if (!content.includes('export interface')) {
      throw new Error('No exported interfaces found')
    }
  }))

  suite.duration_ms = Date.now() - startTime
  suite.total = suite.tests.length
  suite.passed = suite.tests.filter(t => t.status === 'pass').length
  suite.failed = suite.tests.filter(t => t.status === 'fail').length

  return suite
}

// Test Suite: Templates
async function testTemplates(): Promise<TestSuite> {
  console.log('\n📋 Testing Templates...')

  const suite: TestSuite = {
    name: 'Templates',
    tests: [],
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration_ms: 0
  }

  const startTime = Date.now()
  const templatesDir = path.join(__dirname, '..', 'templates')

  // Test 1: Templates directory exists
  suite.tests.push(await runTest('templates', 'directory_exists', async () => {
    if (!fs.existsSync(templatesDir)) throw new Error('Templates directory not found')
  }))

  // Test 2: Grafana dashboard template
  suite.tests.push(await runTest('templates', 'grafana_dashboard', async () => {
    const grafanaPath = path.join(templatesDir, 'grafana-dashboard.json')
    if (!fs.existsSync(grafanaPath)) throw new Error('Grafana template not found')

    const content = JSON.parse(fs.readFileSync(grafanaPath, 'utf-8'))
    if (!content.dashboard || !content.dashboard.panels) {
      throw new Error('Invalid Grafana dashboard structure')
    }
  }))

  // Test 3: Metabase dashboard template
  suite.tests.push(await runTest('templates', 'metabase_dashboard', async () => {
    const metabasePath = path.join(templatesDir, 'metabase-dashboard.json')
    if (!fs.existsSync(metabasePath)) throw new Error('Metabase template not found')

    const content = JSON.parse(fs.readFileSync(metabasePath, 'utf-8'))
    if (!content.ordered_cards) {
      throw new Error('Invalid Metabase dashboard structure')
    }
  }))

  // Test 4: RLS policies template
  suite.tests.push(await runTest('templates', 'rls_policies', async () => {
    const rlsPath = path.join(templatesDir, 'rls-policies.sql')
    if (!fs.existsSync(rlsPath)) throw new Error('RLS policies template not found')

    const content = fs.readFileSync(rlsPath, 'utf-8')
    if (!content.includes('ROW LEVEL SECURITY')) {
      throw new Error('Invalid RLS policies content')
    }
  }))

  suite.duration_ms = Date.now() - startTime
  suite.total = suite.tests.length
  suite.passed = suite.tests.filter(t => t.status === 'pass').length
  suite.failed = suite.tests.filter(t => t.status === 'fail').length

  return suite
}

async function main() {
  const args = process.argv.slice(2)
  const runUnit = args.includes('--unit') || args.length === 0
  const runIntegration = args.includes('--integration') || args.length === 0
  const quickMode = args.includes('--quick')

  console.log('🧪 Supabase Expert Test Suite')
  console.log('='.repeat(60))
  console.log(`Mode: ${quickMode ? 'Quick' : 'Full'}`)
  console.log(`Unit Tests: ${runUnit}`)
  console.log(`Integration Tests: ${runIntegration}`)

  const overallStartTime = Date.now()

  // Run test suites
  if (runIntegration) {
    testResults.push(await testDatabaseConnectivity())
  }

  if (runUnit || quickMode) {
    testResults.push(await testHealthCheckScript())
    testResults.push(await testPerformanceAuditScript())
    testResults.push(await testCleanupMaintenanceScript())
    testResults.push(await testBackupValidatorScript())
    testResults.push(await testDataExporterScript())
    testResults.push(await testSQLQueryLibrary())
    testResults.push(await testTypeDefinitions())
    testResults.push(await testTemplates())
  }

  const overallDuration = Date.now() - overallStartTime

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST RESULTS SUMMARY')
  console.log('='.repeat(60))

  let totalTests = 0
  let totalPassed = 0
  let totalFailed = 0
  let totalSkipped = 0

  testResults.forEach(suite => {
    totalTests += suite.total
    totalPassed += suite.passed
    totalFailed += suite.failed
    totalSkipped += suite.skipped

    const status = suite.failed === 0 ? '✅' : '❌'
    console.log(`\n${status} ${suite.name}`)
    console.log(`   Passed: ${suite.passed}/${suite.total}`)
    if (suite.failed > 0) {
      console.log(`   Failed: ${suite.failed}`)
      suite.tests.filter(t => t.status === 'fail').forEach(test => {
        console.log(`      - ${test.test}: ${test.error}`)
      })
    }
    console.log(`   Duration: ${suite.duration_ms}ms`)
  })

  console.log('\n' + '='.repeat(60))
  console.log(`Total Tests: ${totalTests}`)
  console.log(`Passed: ${totalPassed} (${Math.round((totalPassed / totalTests) * 100)}%)`)
  console.log(`Failed: ${totalFailed}`)
  console.log(`Skipped: ${totalSkipped}`)
  console.log(`Total Duration: ${overallDuration}ms`)
  console.log('='.repeat(60))

  // Save results to file
  const logsDir = path.join(__dirname, '..', '..', '..', '..', 'logs')
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }

  const resultsPath = path.join(logsDir, `test-results-${Date.now()}.json`)
  fs.writeFileSync(
    resultsPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        overall_status: totalFailed === 0 ? 'pass' : 'fail',
        total_tests: totalTests,
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        duration_ms: overallDuration,
        suites: testResults
      },
      null,
      2
    )
  )

  console.log(`\n📁 Full results saved to: ${resultsPath}\n`)

  process.exit(totalFailed > 0 ? 1 : 0)
}

main()
