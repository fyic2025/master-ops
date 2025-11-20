#!/usr/bin/env npx tsx

/**
 * Basic Integration Test Template
 *
 * Copy this file and customize for your service
 *
 * Usage:
 *   1. Copy this file: cp basic-test.template.ts test-myservice.ts
 *   2. Update configuration section
 *   3. Add service-specific environment variables to .env
 *   4. Run: npx tsx test-myservice.ts
 */

import dotenv from 'dotenv'

dotenv.config()

// ============================================================================
// CONFIGURATION - Update these values for your service
// ============================================================================

const SERVICE_NAME = 'MyService'
const BASE_URL = process.env.MY_SERVICE_URL || 'https://api.example.com'
const API_KEY = process.env.MY_SERVICE_API_KEY || ''

// Auth type: 'bearer' | 'apikey' | 'hmac'
const AUTH_TYPE = 'bearer'

// For Bearer auth:
const API_TOKEN = process.env.MY_SERVICE_TOKEN || API_KEY

// For API Key auth:
const API_KEY_HEADER = 'X-API-Key'

// Endpoints to test
const ENDPOINTS = {
  health: '/health',
  list: '/api/resources?limit=5',
  create: '/api/resources',
}

// ============================================================================
// RESULTS TRACKING
// ============================================================================

const results = {
  environment: false,
  connection: false,
  authentication: false,
  read: false,
  error: null as string | null,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAuthHeaders(): Record<string, string> {
  if (AUTH_TYPE === 'bearer') {
    return {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    }
  } else if (AUTH_TYPE === 'apikey') {
    return {
      [API_KEY_HEADER]: API_KEY,
      'Content-Type': 'application/json',
    }
  }
  return {}
}

function maskSecret(secret: string, visibleChars: number = 8): string {
  if (!secret || secret.length <= visibleChars) return '***'
  return `${secret.substring(0, visibleChars)}... [${secret.length - visibleChars} chars hidden]`
}

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================

async function main() {
  console.log(`Integration Test: ${SERVICE_NAME}`)
  console.log('='.repeat(60))

  try {
    // ========================================================================
    // Test 1: Environment Validation
    // ========================================================================
    console.log('\n1️⃣ Validating environment configuration...')

    if (!BASE_URL) {
      throw new Error('BASE_URL not configured')
    }

    if (!API_KEY && !API_TOKEN) {
      throw new Error('API credentials not configured')
    }

    console.log(`- Service: ${SERVICE_NAME}`)
    console.log(`- Base URL: ${BASE_URL}`)
    console.log(`- Auth Type: ${AUTH_TYPE}`)

    if (AUTH_TYPE === 'bearer') {
      console.log(`- API Token: ${maskSecret(API_TOKEN)}`)
    } else {
      console.log(`- API Key: ${maskSecret(API_KEY)}`)
    }

    results.environment = true
    console.log('✅ Environment configured')

    // ========================================================================
    // Test 2: Connection Test
    // ========================================================================
    console.log('\n2️⃣ Testing connection...')

    const startTime = performance.now()
    const healthResponse = await fetch(`${BASE_URL}${ENDPOINTS.health || ''}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })
    const duration = performance.now() - startTime

    console.log(`- Status: ${healthResponse.status} ${healthResponse.statusText}`)
    console.log(`- Response Time: ${duration.toFixed(0)}ms`)

    if (!healthResponse.ok && healthResponse.status !== 401) {
      throw new Error(`Connection failed: ${healthResponse.status} ${healthResponse.statusText}`)
    }

    results.connection = true
    console.log('✅ Connection successful')

    // ========================================================================
    // Test 3: Authentication Test
    // ========================================================================
    console.log('\n3️⃣ Testing authentication...')

    const authResponse = await fetch(`${BASE_URL}${ENDPOINTS.list}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(10000),
    })

    console.log(`- Auth Status: ${authResponse.status} ${authResponse.statusText}`)

    if (authResponse.status === 401) {
      throw new Error('Authentication failed - invalid credentials')
    }

    if (authResponse.status === 403) {
      throw new Error('Authentication succeeded but insufficient permissions')
    }

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      throw new Error(`Request failed: ${authResponse.status} - ${errorText}`)
    }

    results.authentication = true
    console.log('✅ Authentication successful')

    // ========================================================================
    // Test 4: Read Operations
    // ========================================================================
    console.log('\n4️⃣ Testing read operations...')

    const data = await authResponse.json()
    const records = data.results || data.data || data.items || data

    if (Array.isArray(records)) {
      console.log(`✅ Retrieved ${records.length} records`)

      if (records.length > 0) {
        console.log('\nSample record (first item):')
        const sample = records[0]
        const sampleKeys = Object.keys(sample).slice(0, 5)
        sampleKeys.forEach(key => {
          const value = sample[key]
          const displayValue = typeof value === 'string' && value.length > 50
            ? value.substring(0, 50) + '...'
            : value
          console.log(`  - ${key}: ${JSON.stringify(displayValue)}`)
        })
        if (Object.keys(sample).length > 5) {
          console.log(`  ... and ${Object.keys(sample).length - 5} more fields`)
        }
      }
    } else {
      console.log('Response data:', data)
    }

    results.read = true
    console.log('\n✅ Read operations successful')

    // ========================================================================
    // Test Summary
    // ========================================================================
    console.log('\n📊 Test Summary')
    console.log('='.repeat(60))
    console.log(`- Environment Configuration: ${results.environment ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- Connection: ${results.connection ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- Authentication: ${results.authentication ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- Read Operations: ${results.read ? '✅ PASS' : '❌ FAIL'}`)

    const allPassed = Object.entries(results)
      .filter(([key]) => key !== 'error')
      .every(([_, value]) => value === true)

    if (allPassed) {
      console.log('\n✅ All tests passed! Integration is working correctly.')
      process.exit(0)
    } else {
      console.log('\n⚠️  Some tests failed. Review the results above.')
      process.exit(1)
    }

  } catch (error) {
    // ========================================================================
    // Error Handling
    // ========================================================================
    console.error('\n❌ Test Failed')
    console.error('='.repeat(60))

    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Error: ${errorMessage}`)

    // Provide helpful troubleshooting
    console.log('\n💡 Troubleshooting Steps:')

    if (errorMessage.includes('ECONNREFUSED')) {
      console.log('  1. Verify the service is running')
      console.log('  2. Check the BASE_URL and port number')
      console.log('  3. Verify firewall settings')
    } else if (errorMessage.includes('ETIMEDOUT')) {
      console.log('  1. Check network connectivity')
      console.log('  2. Verify the service is responding')
      console.log('  3. Try increasing timeout values')
    } else if (errorMessage.includes('ENOTFOUND')) {
      console.log('  1. Check the hostname in BASE_URL')
      console.log('  2. Verify DNS resolution')
      console.log('  3. Confirm internet connectivity')
    } else if (errorMessage.includes('credentials') || errorMessage.includes('401')) {
      console.log('  1. Verify API key/token is correct')
      console.log('  2. Check environment variables are set')
      console.log('  3. Regenerate credentials if needed')
    } else if (errorMessage.includes('403') || errorMessage.includes('permissions')) {
      console.log('  1. Check API scopes/permissions')
      console.log('  2. Verify account access level')
      console.log('  3. Contact API provider for access')
    } else {
      console.log('  1. Check service documentation')
      console.log('  2. Review error message above')
      console.log('  3. Verify all configuration values')
    }

    results.error = errorMessage
    process.exit(1)
  }
}

// ============================================================================
// RUN TESTS
// ============================================================================

main()
