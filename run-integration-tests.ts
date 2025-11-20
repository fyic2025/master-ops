#!/usr/bin/env tsx
/**
 * Integration Test Runner
 *
 * Run comprehensive API integration tests before deploying to n8n
 * Usage: npx tsx run-integration-tests.ts [test-file]
 */

import {
  IntegrationTestFramework,
  createTestSuite,
  createTest,
  type TestSuite,
  type TestSuiteResult,
} from './integration-test-framework'
import * as fs from 'fs'
import * as path from 'path'

// ============================================================================
// Example Test Suite
// ============================================================================

/**
 * Example: HubSpot API Integration Tests
 */
const hubspotTests = createTestSuite({
  name: 'HubSpot CRM API',
  description: 'Test HubSpot API integration before deploying to n8n',

  tests: [
    createTest({
      name: 'Get CRM Objects Schema',
      description: 'Verify we can fetch company object schema',
      request: {
        method: 'GET',
        endpoint: '/crm/v3/schemas/companies',
      },
      expect: {
        status: 200,
        responseTime: { max: 2000 },
        bodySchema: {
          id: 'string',
          name: 'string',
          objectTypeId: 'string',
        },
      },
    }),

    createTest({
      name: 'List Companies',
      description: 'Verify we can list companies with pagination',
      request: {
        method: 'GET',
        endpoint: '/crm/v3/objects/companies',
        query: {
          limit: '10',
          properties: 'name,domain',
        },
      },
      expect: {
        status: 200,
        responseTime: { max: 3000 },
        bodySchema: {
          results: 'array',
        },
        custom: (response) => {
          return Array.isArray(response.body.results) && response.body.results.length <= 10
        },
      },
    }),

    createTest({
      name: 'Create Company',
      description: 'Verify we can create a new company',
      request: {
        method: 'POST',
        endpoint: '/crm/v3/objects/companies',
        body: {
          properties: {
            name: `Test Company ${Date.now()}`,
            domain: `test-${Date.now()}.com`,
            city: 'Melbourne',
            country: 'Australia',
          },
        },
      },
      expect: {
        statusIn: [200, 201],
        responseTime: { max: 3000 },
        bodySchema: {
          id: 'string',
          properties: 'object',
          createdAt: 'string',
        },
      },
    }),
  ],
})

/**
 * Example: n8n API Integration Tests
 */
const n8nTests = createTestSuite({
  name: 'n8n Workflow API',
  description: 'Test n8n API integration',

  tests: [
    createTest({
      name: 'List Workflows',
      description: 'Verify we can fetch workflows',
      request: {
        method: 'GET',
        endpoint: '/workflows',
      },
      expect: {
        status: 200,
        responseTime: { max: 2000 },
        bodySchema: {
          data: 'array',
        },
      },
    }),

    createTest({
      name: 'Get Workflow by ID',
      description: 'Verify we can fetch a specific workflow',
      request: {
        method: 'GET',
        endpoint: '/workflows/1', // Replace with actual workflow ID
      },
      expect: {
        statusIn: [200, 404], // 404 is ok if workflow doesn't exist
        responseTime: { max: 2000 },
      },
    }),
  ],
})

/**
 * Example: Generic REST API Test
 */
const genericApiTests = createTestSuite({
  name: 'Generic REST API',
  description: 'Template for testing any REST API',

  tests: [
    createTest({
      name: 'Health Check',
      description: 'Verify API is responding',
      request: {
        method: 'GET',
        endpoint: '/health',
        skipAuth: true, // Health check usually doesn't need auth
      },
      expect: {
        statusIn: [200, 204],
        responseTime: { max: 1000 },
      },
    }),

    createTest({
      name: 'Authentication',
      description: 'Verify authentication works',
      request: {
        method: 'GET',
        endpoint: '/api/v1/me',
      },
      expect: {
        status: 200,
        responseTime: { max: 2000 },
      },
    }),
  ],
})

// ============================================================================
// CLI Configuration
// ============================================================================

const args = process.argv.slice(2)
const testFile = args[0]

if (args.includes('--help') || args.includes('-h')) {
  console.log('Integration Test Runner')
  console.log('═'.repeat(70))
  console.log()
  console.log('Usage: npx tsx run-integration-tests.ts [options]')
  console.log()
  console.log('Options:')
  console.log('  --hubspot       Run HubSpot API tests')
  console.log('  --n8n           Run n8n API tests')
  console.log('  --example       Run example generic API tests')
  console.log('  --all           Run all test suites')
  console.log('  --help, -h      Show this help')
  console.log()
  console.log('Environment Variables:')
  console.log('  HUBSPOT_ACCESS_TOKEN   - HubSpot private app access token')
  console.log('  N8N_BASE_URL           - n8n instance URL')
  console.log('  N8N_API_KEY            - n8n API key')
  console.log('  API_BASE_URL           - Generic API base URL')
  console.log('  API_TOKEN              - Generic API token')
  console.log()
  console.log('Examples:')
  console.log('  npx tsx run-integration-tests.ts --hubspot')
  console.log('  npx tsx run-integration-tests.ts --n8n')
  console.log('  npx tsx run-integration-tests.ts --all')
  console.log()
  process.exit(0)
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log('🧪 Integration Test Runner')
  console.log('═'.repeat(70))
  console.log()

  const suitesToRun: Array<{ suite: TestSuite; framework: IntegrationTestFramework }> = []

  // HubSpot tests
  if (args.includes('--hubspot') || args.includes('--all')) {
    const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN

    if (!hubspotToken) {
      console.error('❌ HUBSPOT_ACCESS_TOKEN environment variable not set')
      console.log('   Set it with: export HUBSPOT_ACCESS_TOKEN=your-token')
      console.log()
      process.exit(1)
    }

    const framework = new IntegrationTestFramework({
      name: 'HubSpot',
      baseUrl: 'https://api.hubapi.com',
      auth: {
        type: 'bearer',
        token: hubspotToken,
      },
    })

    suitesToRun.push({ suite: hubspotTests, framework })
  }

  // n8n tests
  if (args.includes('--n8n') || args.includes('--all')) {
    const n8nBaseUrl = process.env.N8N_BASE_URL
    const n8nApiKey = process.env.N8N_API_KEY

    if (!n8nBaseUrl || !n8nApiKey) {
      console.error('❌ N8N_BASE_URL and N8N_API_KEY environment variables required')
      console.log('   Set them with:')
      console.log('   export N8N_BASE_URL=https://your-n8n-instance.com')
      console.log('   export N8N_API_KEY=your-api-key')
      console.log()
      process.exit(1)
    }

    const framework = new IntegrationTestFramework({
      name: 'n8n',
      baseUrl: n8nBaseUrl,
      auth: {
        type: 'apikey',
        key: n8nApiKey,
        headerName: 'X-N8N-API-KEY',
      },
    })

    suitesToRun.push({ suite: n8nTests, framework })
  }

  // Example generic tests
  if (args.includes('--example')) {
    const apiBaseUrl = process.env.API_BASE_URL || 'https://api.example.com'
    const apiToken = process.env.API_TOKEN || ''

    const framework = new IntegrationTestFramework({
      name: 'Generic API',
      baseUrl: apiBaseUrl,
      auth: apiToken
        ? {
            type: 'bearer',
            token: apiToken,
          }
        : undefined,
    })

    suitesToRun.push({ suite: genericApiTests, framework })
  }

  // No tests selected
  if (suitesToRun.length === 0) {
    console.error('❌ No test suite selected')
    console.log()
    console.log('Use --hubspot, --n8n, --example, or --all to run tests')
    console.log('Use --help for more information')
    console.log()
    process.exit(1)
  }

  // Run all selected suites
  const allResults: TestSuiteResult[] = []

  for (const { suite, framework } of suitesToRun) {
    console.log(`📋 Running: ${suite.name}`)
    if (suite.description) {
      console.log(`   ${suite.description}`)
    }
    console.log()

    const result = await framework.runSuite(suite)
    allResults.push(result)

    // Print results
    printSuiteResult(result)
  }

  // Overall summary
  console.log('═'.repeat(70))
  console.log('📊 OVERALL SUMMARY')
  console.log('═'.repeat(70))
  console.log()

  const totalTests = allResults.reduce((sum, r) => sum + r.summary.total, 0)
  const totalPassed = allResults.reduce((sum, r) => sum + r.summary.passed, 0)
  const totalFailed = allResults.reduce((sum, r) => sum + r.summary.failed, 0)
  const totalDuration = allResults.reduce((sum, r) => sum + r.summary.duration, 0)

  console.log(`Test Suites:  ${allResults.length}`)
  console.log(`Total Tests:  ${totalTests}`)
  console.log(`✅ Passed:    ${totalPassed}`)
  console.log(`❌ Failed:    ${totalFailed}`)
  console.log(`Duration:     ${totalDuration}ms`)
  console.log()

  // Save detailed report
  const reportPath = `integration-test-report-${Date.now()}.json`
  fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2))
  console.log(`📄 Detailed report saved to: ${reportPath}`)
  console.log()

  // Exit with appropriate code
  process.exit(totalFailed > 0 ? 1 : 0)
}

// ============================================================================
// Helper Functions
// ============================================================================

function printSuiteResult(result: TestSuiteResult) {
  result.results.forEach((test, i) => {
    const icon = test.passed ? '✅' : test.error ? '💥' : '❌'
    console.log(`${icon} ${test.name} (${test.duration}ms)`)

    if (test.description) {
      console.log(`   ${test.description}`)
    }

    if (test.error) {
      console.log(`   Error: ${test.error}`)
    }

    if (!test.passed && test.expectations.length > 0) {
      const failed = test.expectations.filter((e) => !e.passed)
      failed.forEach((exp) => {
        console.log(`   ❌ ${exp.message}`)
        if (exp.expected !== undefined && exp.actual !== undefined) {
          console.log(`      Expected: ${JSON.stringify(exp.expected)}`)
          console.log(`      Actual:   ${JSON.stringify(exp.actual)}`)
        }
      })
    }

    console.log()
  })

  console.log('─'.repeat(70))
  console.log('Summary:')
  console.log(`  Total:    ${result.summary.total}`)
  console.log(`  ✅ Passed: ${result.summary.passed}`)
  console.log(`  ❌ Failed: ${result.summary.failed}`)
  if (result.summary.skipped > 0) {
    console.log(`  ⏭️  Skipped: ${result.summary.skipped}`)
  }
  console.log(`  Duration: ${result.summary.duration}ms`)
  console.log()
}

// ============================================================================
// Run
// ============================================================================

runTests().catch((error) => {
  console.error('❌ Unexpected error:')
  console.error(error)
  process.exit(1)
})
