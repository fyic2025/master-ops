#!/usr/bin/env tsx
/**
 * Example: Custom Integration Test
 *
 * This is a template for creating your own API integration tests
 * Copy this file and customize it for your API
 */

import {
  IntegrationTestFramework,
  createTestSuite,
  createTest,
} from './integration-test-framework'

// ============================================================================
// Custom Test Suite Example
// ============================================================================

/**
 * Example: Testing Unleashed API
 */
const unleashedTestSuite = createTestSuite({
  name: 'Unleashed Inventory API',
  description: 'Test Unleashed API integration with HMAC authentication',

  // Optional: Run setup before all tests
  beforeAll: async () => {
    console.log('🔧 Setting up test environment...')
  },

  // Optional: Run cleanup after all tests
  afterAll: async () => {
    console.log('🧹 Cleaning up test environment...')
  },

  // Optional: Run before each individual test
  beforeEach: async () => {
    // console.log('Preparing test...')
  },

  // Optional: Run after each individual test
  afterEach: async () => {
    // console.log('Test complete')
  },

  tests: [
    // Test 1: Get Stock on Hand
    createTest({
      name: 'Get Stock on Hand',
      description: 'Verify we can fetch current stock levels',
      request: {
        method: 'GET',
        endpoint: '/StockOnHand',
        query: {
          format: 'json',
          pageSize: '10',
        },
      },
      expect: {
        status: 200,
        responseTime: { max: 5000 },
        bodySchema: {
          Items: 'array',
          Pagination: 'object',
        },
        custom: (response) => {
          // Custom validation: Check pagination structure
          const pagination = response.body.Pagination
          return (
            pagination &&
            typeof pagination.NumberOfItems === 'number' &&
            typeof pagination.PageSize === 'number'
          )
        },
      },
    }),

    // Test 2: Get Customers
    createTest({
      name: 'Get Customers',
      description: 'Verify we can fetch customer list',
      request: {
        method: 'GET',
        endpoint: '/Customers',
        query: {
          format: 'json',
          pageSize: '5',
        },
      },
      expect: {
        status: 200,
        responseTime: { max: 5000 },
        bodyContains: ['Items', 'Pagination'],
        bodySchema: {
          Items: 'array',
        },
      },
    }),

    // Test 3: Get Sales Orders (with date filter)
    createTest({
      name: 'Get Recent Sales Orders',
      description: 'Verify we can fetch sales orders with date filtering',
      request: {
        method: 'GET',
        endpoint: '/SalesOrders',
        query: {
          format: 'json',
          modifiedSince: '2024-01-01',
          pageSize: '10',
        },
      },
      expect: {
        status: 200,
        responseTime: { max: 5000 },
        bodySchema: {
          Items: 'array',
        },
        custom: (response) => {
          // Verify all orders are after the filter date
          const items = response.body.Items || []
          if (items.length === 0) return true // OK if no orders

          return items.every((order: any) => {
            const orderDate = new Date(order.CreatedOn || order.LastModifiedOn)
            return orderDate >= new Date('2024-01-01')
          })
        },
      },
    }),

    // Test 4: Error Handling - Invalid Endpoint
    createTest({
      name: 'Handle Invalid Endpoint',
      description: 'Verify API returns appropriate error for invalid endpoint',
      request: {
        method: 'GET',
        endpoint: '/InvalidEndpoint',
        query: {
          format: 'json',
        },
      },
      expect: {
        statusIn: [400, 404, 405], // Expect client error
        responseTime: { max: 3000 },
      },
    }),

    // Test 5: Skip this test (example)
    createTest({
      name: 'Create Sales Order',
      description: 'Test creating a new sales order (skipped to avoid creating test data)',
      skip: true, // Skip this test
      request: {
        method: 'POST',
        endpoint: '/SalesOrders',
        body: {
          // Order data would go here
        },
      },
      expect: {
        statusIn: [200, 201],
      },
    }),
  ],
})

// ============================================================================
// Run Tests
// ============================================================================

async function main() {
  console.log('🧪 Custom Integration Tests')
  console.log('═'.repeat(70))
  console.log()

  // Get credentials from environment
  const unleashedApiId = process.env.UNLEASHED_API_ID
  const unleashedApiKey = process.env.UNLEASHED_API_KEY
  const unleashedBaseUrl = process.env.UNLEASHED_BASE_URL || 'https://api.unleashedsoftware.com'

  if (!unleashedApiId || !unleashedApiKey) {
    console.error('❌ Missing required environment variables')
    console.log()
    console.log('Required:')
    console.log('  UNLEASHED_API_ID     - Your Unleashed API ID')
    console.log('  UNLEASHED_API_KEY    - Your Unleashed API Key')
    console.log()
    console.log('Optional:')
    console.log('  UNLEASHED_BASE_URL   - API base URL (default: https://api.unleashedsoftware.com)')
    console.log()
    process.exit(1)
  }

  // Create test framework with HMAC authentication
  const framework = new IntegrationTestFramework({
    name: 'Unleashed API',
    baseUrl: unleashedBaseUrl,
    auth: {
      type: 'hmac',
      apiId: unleashedApiId,
      apiKey: unleashedApiKey,
      algorithm: 'sha256',
    },
    timeout: 10000, // 10 second timeout
    retries: 2, // Retry failed requests twice
    retryDelay: 1000, // 1 second between retries
  })

  // Run test suite
  console.log(`📋 Running: ${unleashedTestSuite.name}`)
  console.log(`   ${unleashedTestSuite.description}`)
  console.log()

  const result = await framework.runSuite(unleashedTestSuite)

  // Print results
  result.results.forEach((test) => {
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
          console.log(`      Expected: ${JSON.stringify(exp.expected).substring(0, 100)}...`)
          console.log(`      Actual:   ${JSON.stringify(exp.actual).substring(0, 100)}...`)
        }
      })
    }

    console.log()
  })

  // Summary
  console.log('═'.repeat(70))
  console.log('📊 TEST SUMMARY')
  console.log('═'.repeat(70))
  console.log()
  console.log(`Total:    ${result.summary.total}`)
  console.log(`✅ Passed: ${result.summary.passed}`)
  console.log(`❌ Failed: ${result.summary.failed}`)
  if (result.summary.skipped > 0) {
    console.log(`⏭️  Skipped: ${result.summary.skipped}`)
  }
  console.log(`Duration: ${result.summary.duration}ms`)
  console.log()

  // Save report
  const reportPath = `unleashed-test-report-${Date.now()}.json`
  const fs = await import('fs')
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2))
  console.log(`📄 Detailed report saved to: ${reportPath}`)
  console.log()

  // Exit with appropriate code
  process.exit(result.summary.failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('❌ Unexpected error:')
  console.error(error)
  process.exit(1)
})
