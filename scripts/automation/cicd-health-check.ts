/**
 * CI/CD Health Check Script
 *
 * Scans for TypeScript errors, test failures, and lint issues
 * then logs them to the dashboard via API.
 *
 * Usage:
 *   npx tsx scripts/cicd-health-check.ts [--fix] [--api-url URL] [--verify]
 *
 * Options:
 *   --fix       Attempt to auto-fix issues where possible
 *   --api-url   Dashboard API URL (default: https://ops.growthcohq.com)
 *   --local     Use local API (http://localhost:3000)
 *   --verify    Output JSON format for dashboard verification (skips API logging)
 */

import { execSync } from 'child_process'
import * as path from 'path'

interface Issue {
  type: 'typescript_error' | 'test_failure' | 'lint_error' | 'build_error'
  severity: 'error' | 'warning' | 'info'
  file: string | null
  line: number | null
  message: string
  code: string | null
  autoFixable: boolean
  details?: Record<string, unknown>
}

const ROOT_DIR = path.resolve(__dirname, '..')

// Parse command line arguments
const args = process.argv.slice(2)
const shouldFix = args.includes('--fix')
const useLocal = args.includes('--local')
const verifyMode = args.includes('--verify')
const apiUrlIndex = args.indexOf('--api-url')
const API_URL = useLocal
  ? 'http://localhost:3000'
  : apiUrlIndex !== -1
    ? args[apiUrlIndex + 1]
    : 'https://ops.growthcohq.com'

// In verify mode, suppress normal output
if (!verifyMode) {
  console.log('CI/CD Health Check')
  console.log('==================')
  console.log(`API URL: ${API_URL}`)
  console.log(`Auto-fix: ${shouldFix}`)
  console.log('')
}

const issues: Issue[] = []
let autoFixed = 0

/**
 * Run TypeScript check
 */
function checkTypeScript(): void {
  if (!verifyMode) console.log('Checking TypeScript...')

  try {
    execSync('npx tsc --noEmit 2>&1', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    })
    if (!verifyMode) console.log('  No TypeScript errors')
  } catch (error: any) {
    const output = error.stdout || error.message || ''
    // Normalize line endings for Windows compatibility
    const lines = output.split('\n').map((l: string) => l.replace(/\r$/, ''))

    // Parse TypeScript errors: file(line,col): error TSxxxx: message
    const errorRegex = /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)$/

    for (const line of lines) {
      const match = line.match(errorRegex)
      if (match) {
        const [, file, lineNum, , severity, code, message] = match
        const normalizedFile = file.replace(/\\/g, '/')

        // Check if in archive (auto-fixable by excluding)
        const isArchive = normalizedFile.includes('/archive/')

        issues.push({
          type: 'typescript_error',
          severity: severity === 'warning' ? 'warning' : 'error',
          file: normalizedFile,
          line: parseInt(lineNum, 10),
          message: message.trim(),
          code,
          autoFixable: isArchive,
        })
      }
    }

    if (!verifyMode) console.log(`  Found ${issues.filter(i => i.type === 'typescript_error').length} TypeScript errors`)
  }
}

/**
 * Run tests and capture failures
 */
function checkTests(): void {
  if (!verifyMode) console.log('Checking Tests...')

  try {
    execSync('npm test -- --run 2>&1', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000, // 2 minute timeout
    })
    if (!verifyMode) console.log('  All tests passing')
  } catch (error: any) {
    const output = error.stdout || error.message || ''

    // Parse vitest failures
    // Pattern: FAIL file.test.ts > Suite > Test Name
    const failRegex = /FAIL\s+(.+?)\s+>\s+(.+)/g
    let match

    while ((match = failRegex.exec(output)) !== null) {
      const [, file, testPath] = match

      issues.push({
        type: 'test_failure',
        severity: 'error',
        file: file.trim(),
        line: null,
        message: `Test failed: ${testPath.trim()}`,
        code: null,
        autoFixable: false,
      })
    }

    // Also check for assertion errors
    const assertionRegex = /expected (.+) to (be|equal|contain|include) (.+)/gi
    while ((match = assertionRegex.exec(output)) !== null) {
      // These are captured as additional details but not separate issues
    }

    const testFailures = issues.filter(i => i.type === 'test_failure').length
    if (!verifyMode) console.log(`  Found ${testFailures} test failures`)
  }
}

/**
 * Check for common fixable issues
 */
function checkCommonIssues(): void {
  if (!verifyMode) console.log('Checking common issues...')

  // Check if archive folder is excluded from tsconfig
  try {
    const tsconfig = require(path.join(ROOT_DIR, 'tsconfig.json'))
    const exclude = tsconfig.exclude || []

    if (!exclude.includes('archive') && !exclude.includes('./archive')) {
      issues.push({
        type: 'build_error',
        severity: 'warning',
        file: 'tsconfig.json',
        line: null,
        message: 'Archive folder not excluded from TypeScript compilation',
        code: 'ARCHIVE_NOT_EXCLUDED',
        autoFixable: true,
      })
    }
  } catch {
    // tsconfig.json doesn't exist or can't be parsed
  }

  // Check for missing npm scripts
  try {
    const pkg = require(path.join(ROOT_DIR, 'package.json'))
    if (!pkg.scripts?.health) {
      issues.push({
        type: 'build_error',
        severity: 'warning',
        file: 'package.json',
        line: null,
        message: 'Missing "health" script required by CI/CD',
        code: 'MISSING_HEALTH_SCRIPT',
        autoFixable: true,
      })
    }
  } catch {
    // package.json doesn't exist
  }
}

/**
 * Apply auto-fixes for fixable issues
 */
function applyFixes(): number {
  if (!shouldFix) return 0

  let fixed = 0

  // Fix: Add archive to tsconfig exclude
  const archiveIssue = issues.find(i => i.code === 'ARCHIVE_NOT_EXCLUDED')
  if (archiveIssue) {
    try {
      const tsconfigPath = path.join(ROOT_DIR, 'tsconfig.json')
      const tsconfig = require(tsconfigPath)
      tsconfig.exclude = tsconfig.exclude || []
      if (!tsconfig.exclude.includes('archive')) {
        tsconfig.exclude.push('archive')
        const fs = require('fs')
        fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2))
        console.log('  Fixed: Added archive to tsconfig.json exclude')
        fixed++
        archiveIssue.autoFixable = false // Mark as fixed
      }
    } catch (e) {
      console.error('  Failed to fix tsconfig.json:', e)
    }
  }

  // Fix: Add health script to package.json
  const healthIssue = issues.find(i => i.code === 'MISSING_HEALTH_SCRIPT')
  if (healthIssue) {
    try {
      const pkgPath = path.join(ROOT_DIR, 'package.json')
      const pkg = require(pkgPath)
      pkg.scripts = pkg.scripts || {}
      if (!pkg.scripts.health) {
        pkg.scripts.health = 'npx tsx scripts/cicd-health-check.ts'
        const fs = require('fs')
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
        console.log('  Fixed: Added health script to package.json')
        fixed++
        healthIssue.autoFixable = false
      }
    } catch (e) {
      console.error('  Failed to fix package.json:', e)
    }
  }

  return fixed
}

/**
 * Send issues to dashboard API
 */
async function logToDashboard(): Promise<void> {
  // Always POST to the API - even with 0 issues
  // This triggers resolve_stale_issues() to mark old issues as resolved
  console.log(`\nLogging ${issues.length} issues to dashboard...`)

  try {
    const response = await fetch(`${API_URL}/api/cicd`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        issues,
        scanType: 'full',
        source: 'local',
        branch: getCurrentBranch(),
        commitSha: getCurrentCommit(),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`  Failed to log issues: ${response.status} ${error}`)
      return
    }

    const result = await response.json() as any
    console.log(`  Logged successfully: ${result.processed} processed, ${result.resolved} resolved`)
  } catch (error: any) {
    console.error(`  Failed to connect to dashboard: ${error.message}`)
    console.log('  Issues will be displayed locally instead:')
    console.log('')

    // Display issues locally
    for (const issue of issues) {
      const location = issue.file ? `${issue.file}${issue.line ? `:${issue.line}` : ''}` : 'unknown'
      console.log(`  [${issue.type}] ${location}`)
      console.log(`    ${issue.message}`)
      if (issue.code) console.log(`    Code: ${issue.code}`)
      console.log('')
    }
  }
}

/**
 * Get current git branch
 */
function getCurrentBranch(): string {
  try {
    return execSync('git branch --show-current', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
    }).trim()
  } catch {
    return 'unknown'
  }
}

/**
 * Get current git commit
 */
function getCurrentCommit(): string {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
    }).trim().slice(0, 7)
  } catch {
    return 'unknown'
  }
}

/**
 * Main
 */
async function main(): Promise<void> {
  const startTime = Date.now()

  // Run all checks
  checkTypeScript()

  // In verify mode, only check TypeScript (main source of fixable issues)
  // and output JSON for dashboard to parse
  if (verifyMode) {
    // Output JSON format for VerifyFixesButton to parse
    const verifyOutput = {
      timestamp: new Date().toISOString(),
      issues: issues.map(i => ({
        type: i.type,
        file_path: i.file,
        line_number: i.line,
        message: i.message,
        code: i.code,
        severity: i.severity
      })),
      summary: {
        total: issues.length,
        typescript_errors: issues.filter(i => i.type === 'typescript_error').length,
        test_failures: issues.filter(i => i.type === 'test_failure').length,
        build_errors: issues.filter(i => i.type === 'build_error').length
      }
    }

    // Output pure JSON - no other text
    console.log(JSON.stringify(verifyOutput, null, 2))

    // Exit with 0 even if there are issues (verify mode just reports)
    process.exit(0)
  }

  // Normal mode: run all checks
  checkTests()
  checkCommonIssues()

  // Apply fixes if requested
  if (shouldFix) {
    console.log('\nApplying auto-fixes...')
    autoFixed = applyFixes()
    if (autoFixed > 0) {
      console.log(`  Applied ${autoFixed} fixes`)
    } else {
      console.log('  No fixes to apply')
    }
  }

  // Log to dashboard
  await logToDashboard()

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('\n==================')
  console.log('Summary')
  console.log('==================')
  console.log(`Total issues: ${issues.length}`)
  console.log(`  TypeScript errors: ${issues.filter(i => i.type === 'typescript_error').length}`)
  console.log(`  Test failures: ${issues.filter(i => i.type === 'test_failure').length}`)
  console.log(`  Build errors: ${issues.filter(i => i.type === 'build_error').length}`)
  console.log(`  Auto-fixable: ${issues.filter(i => i.autoFixable).length}`)
  if (autoFixed > 0) {
    console.log(`  Fixed this run: ${autoFixed}`)
  }
  console.log(`Duration: ${duration}s`)

  // Exit with error code if there are issues
  if (issues.length > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Health check failed:', error)
  process.exit(1)
})
