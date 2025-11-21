# Real-World Integration Testing Examples

This document contains practical examples of integration testing based on actual implementations from production projects.

## Table of Contents

1. [HubSpot CRM Integration](#hubspot-crm-integration)
2. [Supabase Database Integration](#supabase-database-integration)
3. [N8N Workflow Platform](#n8n-workflow-platform)
4. [Custom HMAC Authentication](#custom-hmac-authentication)
5. [Complete Test Suites](#complete-test-suites)

---

## HubSpot CRM Integration

### Scenario
Testing HubSpot CRM API integration for managing companies, contacts, and custom properties.

### Authentication Method
Bearer Token (Private App Access Token)

### Test Implementation

```typescript
#!/usr/bin/env npx tsx

import dotenv from 'dotenv'

dotenv.config()

// Configuration
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN
const HUBSPOT_BASE_URL = 'https://api.hubapi.com'

// Results tracker
const results = {
  environment: false,
  connection: false,
  authentication: false,
  properties: false,
  companies: false,
  error: null as string | null
}

async function main() {
  console.log('HubSpot Integration Test')
  console.log('='.repeat(50))

  try {
    // 1. Environment validation
    console.log('\n1️⃣ Validating environment...')
    if (!HUBSPOT_ACCESS_TOKEN) {
      throw new Error('HUBSPOT_ACCESS_TOKEN not configured')
    }
    console.log(`✅ Access token configured (${HUBSPOT_ACCESS_TOKEN.substring(0, 20)}...)`)
    results.environment = true

    // 2. Connection test
    console.log('\n2️⃣ Testing connection...')
    const healthResponse = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/companies`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`
      }
    })
    console.log(`- Status: ${healthResponse.status}`)
    results.connection = healthResponse.ok

    // 3. Authentication test
    console.log('\n3️⃣ Testing authentication...')
    if (healthResponse.status === 401) {
      throw new Error('Invalid access token')
    }
    if (healthResponse.status === 403) {
      throw new Error('Token valid but insufficient scopes')
    }
    console.log('✅ Authentication successful')
    results.authentication = true

    // 4. Test reading custom properties
    console.log('\n4️⃣ Testing custom properties...')
    const propertiesResponse = await fetch(
      `${HUBSPOT_BASE_URL}/crm/v3/properties/companies`,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`
        }
      }
    )
    const properties = await propertiesResponse.json()
    console.log(`✅ Found ${properties.results.length} company properties`)

    // Check for required custom properties
    const requiredProps = ['supabase_id', 'last_sync_date']
    const propertyNames = properties.results.map((p: any) => p.name)
    const missingProps = requiredProps.filter(p => !propertyNames.includes(p))

    if (missingProps.length > 0) {
      console.log(`⚠️  Missing properties: ${missingProps.join(', ')}`)
    } else {
      console.log('✅ All required custom properties exist')
    }
    results.properties = true

    // 5. Test reading companies
    console.log('\n5️⃣ Testing company retrieval...')
    const companiesResponse = await fetch(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/companies?limit=5`,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`
        }
      }
    )
    const companies = await companiesResponse.json()
    console.log(`✅ Retrieved ${companies.results.length} companies`)

    if (companies.results.length > 0) {
      const firstCompany = companies.results[0]
      console.log('Sample company:', {
        id: firstCompany.id,
        name: firstCompany.properties.name,
        domain: firstCompany.properties.domain
      })
    }
    results.companies = true

    // Summary
    console.log('\n📊 Test Summary:')
    console.log('='.repeat(50))
    console.log(`- Environment: ${results.environment ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- Connection: ${results.connection ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- Authentication: ${results.authentication ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- Custom Properties: ${results.properties ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- Company Retrieval: ${results.companies ? '✅ PASS' : '❌ FAIL'}`)

  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error))
    results.error = error instanceof Error ? error.message : String(error)
    process.exit(1)
  }
}

main()
```

### Key Learnings

1. **Bearer token format** - Must be exactly `Bearer {token}`, no extra spaces
2. **Custom properties** - Validate required properties exist before sync operations
3. **Error codes** - 401 = invalid token, 403 = valid token but insufficient scopes
4. **Rate limits** - HubSpot has different limits per subscription tier

---

## Supabase Database Integration

### Scenario
Testing Supabase PostgreSQL database with Row Level Security (RLS) and Edge Functions.

### Authentication Methods
1. Anonymous key (for client operations)
2. Service role key (for admin operations, bypasses RLS)

### Test Implementation

```typescript
#!/usr/bin/env npx tsx

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const results = {
  clientConfig: false,
  databaseConnection: false,
  tablesExist: false,
  rpcFunctions: false,
  managementAPI: false,
  error: null as string | null
}

async function main() {
  console.log('Supabase Integration Test')
  console.log('='.repeat(50))

  try {
    // 1. Environment validation
    console.log('\n1️⃣ Validating environment...')
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY required')
    }
    console.log(`- URL: ${SUPABASE_URL}`)
    console.log(`- Anon Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`)
    console.log(`- Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY ? 'Configured' : 'Not configured'}`)
    results.clientConfig = true

    // 2. Test client connection
    console.log('\n2️⃣ Testing client connection...')
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Attempt a simple query
    const { data, error } = await client
      .from('businesses')
      .select('count')
      .limit(1)

    if (error) {
      // Check if error is due to RLS
      if (error.message.includes('permission denied') || error.message.includes('RLS')) {
        console.log('⚠️  RLS is blocking access (expected for anon key)')
        console.log('💡 Configure SUPABASE_SERVICE_ROLE_KEY for admin access')
      } else {
        throw error
      }
    } else {
      console.log('✅ Database connection successful')
    }
    results.databaseConnection = true

    // 3. Test with service role key (bypasses RLS)
    if (SUPABASE_SERVICE_ROLE_KEY) {
      console.log('\n3️⃣ Testing with service role key...')
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      const { data: businesses, error: businessError } = await adminClient
        .from('businesses')
        .select('id, name')
        .limit(5)

      if (businessError) {
        throw businessError
      }

      console.log(`✅ Retrieved ${businesses.length} businesses`)
      if (businesses.length > 0) {
        console.log('Sample business:', {
          id: businesses[0].id,
          name: businesses[0].name
        })
      }
      results.tablesExist = true
    }

    // 4. Test RPC functions
    console.log('\n4️⃣ Testing RPC functions...')
    const { data: rpcData, error: rpcError } = await client
      .rpc('get_business_count')

    if (rpcError) {
      console.log(`⚠️  RPC function error: ${rpcError.message}`)
    } else {
      console.log(`✅ RPC function executed: count = ${rpcData}`)
      results.rpcFunctions = true
    }

    // 5. Test Management API
    console.log('\n5️⃣ Testing Management API...')
    if (SUPABASE_SERVICE_ROLE_KEY) {
      const mgmtResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        }
      )
      console.log(`- Management API Status: ${mgmtResponse.status}`)
      results.managementAPI = mgmtResponse.ok
    }

    // Summary
    console.log('\n📊 Test Summary:')
    console.log('='.repeat(50))
    console.log(`- Client Configuration: ${results.clientConfig ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- Database Connection: ${results.databaseConnection ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- Tables Exist: ${results.tablesExist ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- RPC Functions: ${results.rpcFunctions ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- Management API: ${results.managementAPI ? '✅ PASS' : '❌ FAIL'}`)

  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error))
    results.error = error instanceof Error ? error.message : String(error)
    process.exit(1)
  }
}

main()
```

### Key Learnings

1. **RLS awareness** - Anon key will be blocked by RLS policies, use service role for admin ops
2. **Two auth patterns** - Both `apikey` header AND `Authorization: Bearer` header required
3. **Error messages** - "permission denied" often means RLS is active
4. **RPC functions** - Test custom database functions separately

---

## N8N Workflow Platform

### Scenario
Testing N8N workflow automation platform API for workflow management and execution.

### Authentication Method
API Key (custom header: `X-N8N-API-KEY`)

### Test Implementation

```typescript
#!/usr/bin/env npx tsx

import dotenv from 'dotenv'

dotenv.config()

// Configuration
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678'
const N8N_API_KEY = process.env.N8N_API_KEY

const results = {
  environment: false,
  connection: false,
  authentication: false,
  workflows: false,
  executions: false,
  error: null as string | null
}

async function main() {
  console.log('N8N Integration Test')
  console.log('='.repeat(50))

  try {
    // 1. Environment validation
    console.log('\n1️⃣ Validating environment...')
    if (!N8N_API_KEY) {
      throw new Error('N8N_API_KEY not configured')
    }
    console.log(`- Base URL: ${N8N_BASE_URL}`)
    console.log(`- API Key: ${N8N_API_KEY.substring(0, 20)}...`)
    results.environment = true

    // 2. Connection test
    console.log('\n2️⃣ Testing connection...')
    const healthResponse = await fetch(`${N8N_BASE_URL}/healthz`)
    console.log(`- Health check: ${healthResponse.status}`)
    results.connection = healthResponse.ok

    // 3. Authentication test
    console.log('\n3️⃣ Testing authentication...')
    const workflowsResponse = await fetch(
      `${N8N_BASE_URL}/api/v1/workflows`,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Accept': 'application/json'
        }
      }
    )

    if (workflowsResponse.status === 401) {
      throw new Error('Invalid API key')
    }
    if (workflowsResponse.status === 403) {
      throw new Error('API key valid but insufficient permissions')
    }

    console.log(`✅ Authentication successful (${workflowsResponse.status})`)
    results.authentication = true

    // 4. Test listing workflows
    console.log('\n4️⃣ Testing workflow listing...')
    const workflows = await workflowsResponse.json()
    console.log(`✅ Found ${workflows.data.length} workflows`)

    if (workflows.data.length > 0) {
      const firstWorkflow = workflows.data[0]
      console.log('Sample workflow:', {
        id: firstWorkflow.id,
        name: firstWorkflow.name,
        active: firstWorkflow.active
      })
    }
    results.workflows = true

    // 5. Test workflow executions
    console.log('\n5️⃣ Testing workflow executions...')
    const executionsResponse = await fetch(
      `${N8N_BASE_URL}/api/v1/executions?limit=5`,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Accept': 'application/json'
        }
      }
    )

    const executions = await executionsResponse.json()
    console.log(`✅ Retrieved ${executions.data.length} recent executions`)

    if (executions.data.length > 0) {
      const firstExecution = executions.data[0]
      console.log('Latest execution:', {
        id: firstExecution.id,
        workflowId: firstExecution.workflowId,
        status: firstExecution.status,
        startedAt: firstExecution.startedAt
      })
    }
    results.executions = true

    // Summary
    console.log('\n📊 Test Summary:')
    console.log('='.repeat(50))
    console.log(`- Environment: ${results.environment ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- Connection: ${results.connection ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- Authentication: ${results.authentication ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- Workflows: ${results.workflows ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- Executions: ${results.executions ? '✅ PASS' : '❌ FAIL'}`)

  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error))
    results.error = error instanceof Error ? error.message : String(error)
    process.exit(1)
  }
}

main()
```

### Key Learnings

1. **Custom header** - N8N uses `X-N8N-API-KEY` not standard `Authorization`
2. **Health endpoint** - `/healthz` is separate from API endpoints
3. **Pagination** - Use `limit` query parameter for list endpoints
4. **Local vs cloud** - Default URL is localhost for self-hosted instances

---

## Custom HMAC Authentication

### Scenario
Testing an API that uses HMAC-SHA256 signature authentication (like Unleashed API).

### Authentication Method
Custom HMAC signature with API ID and signature headers

### Test Implementation

```typescript
#!/usr/bin/env npx tsx

import dotenv from 'dotenv'
import crypto from 'crypto'

dotenv.config()

// Configuration
const API_ID = process.env.UNLEASHED_API_ID
const API_KEY = process.env.UNLEASHED_API_KEY
const BASE_URL = 'https://api.unleashedsoftware.com'

// HMAC signature generation
function generateSignature(apiKey: string, queryString: string): string {
  // Create HMAC using SHA256
  const hmac = crypto.createHmac('sha256', apiKey)
  hmac.update(queryString)
  const signature = hmac.digest('hex')

  // Convert hex to base64
  const buffer = Buffer.from(signature, 'hex')
  return buffer.toString('base64')
}

const results = {
  environment: false,
  signature: false,
  authentication: false,
  apiCall: false,
  error: null as string | null
}

async function main() {
  console.log('HMAC Authentication Test (Unleashed API)')
  console.log('='.repeat(50))

  try {
    // 1. Environment validation
    console.log('\n1️⃣ Validating environment...')
    if (!API_ID || !API_KEY) {
      throw new Error('UNLEASHED_API_ID and UNLEASHED_API_KEY required')
    }
    console.log(`- API ID: ${API_ID}`)
    console.log(`- API Key: ${API_KEY.substring(0, 20)}...`)
    results.environment = true

    // 2. Test signature generation
    console.log('\n2️⃣ Testing signature generation...')
    const queryString = '/api/v2/SalesOrders?pageSize=1'
    const signature = generateSignature(API_KEY, queryString)
    console.log(`- Query string: ${queryString}`)
    console.log(`- Generated signature: ${signature.substring(0, 20)}...`)
    results.signature = true

    // 3. Test authentication
    console.log('\n3️⃣ Testing authentication...')
    const response = await fetch(`${BASE_URL}${queryString}`, {
      headers: {
        'Accept': 'application/json',
        'api-auth-id': API_ID,
        'api-auth-signature': signature
      }
    })

    console.log(`- Response status: ${response.status}`)

    if (response.status === 401) {
      throw new Error('Authentication failed - invalid API ID')
    }

    if (response.status === 403) {
      const errorText = await response.text()
      console.log('❌ 403 FORBIDDEN - Possible causes:')
      console.log('  1. API Key is incorrect')
      console.log('  2. Signature calculation is wrong')
      console.log('  3. Query string format doesn\'t match')
      console.log(`\nError details: ${errorText}`)
      throw new Error('Signature verification failed')
    }

    results.authentication = true

    // 4. Test API call
    console.log('\n4️⃣ Testing API call...')
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ API call successful`)
      console.log(`- Items returned: ${data.Items?.length || 0}`)
      console.log(`- Pagination: Page ${data.Pagination?.PageNumber || 1} of ${data.Pagination?.NumberOfPages || 1}`)
      results.apiCall = true
    }

    // Summary
    console.log('\n📊 Test Summary:')
    console.log('='.repeat(50))
    console.log(`- Environment: ${results.environment ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- Signature Generation: ${results.signature ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- Authentication: ${results.authentication ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`- API Call: ${results.apiCall ? '✅ PASS' : '❌ FAIL'}`)

  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error))
    results.error = error instanceof Error ? error.message : String(error)
    process.exit(1)
  }
}

main()
```

### Key Learnings

1. **Signature string** - Must match API spec exactly (usually includes HTTP method, path, query, body)
2. **Encoding** - HMAC hex output often needs base64 encoding
3. **Headers** - Custom headers like `api-auth-id` and `api-auth-signature`
4. **403 vs 401** - 403 often means signature calculation is wrong, not auth failure

---

## Complete Test Suites

### Multi-Service Integration Test

Test multiple services in sequence to validate entire integration flow:

```typescript
#!/usr/bin/env npx tsx

/**
 * Complete Integration Test Suite
 *
 * Tests: Supabase → HubSpot → N8N workflow
 * Validates: Data sync pipeline
 */

import dotenv from 'dotenv'

dotenv.config()

const results = {
  supabase: false,
  hubspot: false,
  n8n: false,
  dataSync: false
}

async function main() {
  console.log('🔄 Complete Integration Test Suite')
  console.log('='.repeat(50))

  // 1. Test Supabase data source
  console.log('\n1️⃣ Testing Supabase connection...')
  try {
    // ... supabase test logic
    console.log('✅ Supabase: Connected')
    results.supabase = true
  } catch (error) {
    console.error('❌ Supabase failed:', error)
    process.exit(1)
  }

  // 2. Test HubSpot destination
  console.log('\n2️⃣ Testing HubSpot connection...')
  try {
    // ... hubspot test logic
    console.log('✅ HubSpot: Connected')
    results.hubspot = true
  } catch (error) {
    console.error('❌ HubSpot failed:', error)
    process.exit(1)
  }

  // 3. Test N8N workflow orchestration
  console.log('\n3️⃣ Testing N8N workflow...')
  try {
    // ... n8n test logic
    console.log('✅ N8N: Workflow active')
    results.n8n = true
  } catch (error) {
    console.error('❌ N8N failed:', error)
    process.exit(1)
  }

  // 4. Test end-to-end data sync
  console.log('\n4️⃣ Testing data sync pipeline...')
  try {
    // 1. Get test record from Supabase
    // 2. Sync to HubSpot
    // 3. Verify sync in HubSpot
    // 4. Trigger N8N workflow
    // 5. Verify workflow execution
    console.log('✅ Data sync: Complete')
    results.dataSync = true
  } catch (error) {
    console.error('❌ Data sync failed:', error)
    process.exit(1)
  }

  // Final summary
  console.log('\n✅ All Integration Tests Passed!')
  console.log('='.repeat(50))
  console.log('Ready for production deployment')
}

main()
```

---

## Common Patterns Across Examples

### 1. Environment Validation First
```typescript
if (!API_KEY || !BASE_URL) {
  throw new Error('Missing required configuration')
}
```

### 2. Results Tracking
```typescript
const results = {
  connection: false,
  auth: false,
  operations: false,
  error: null as string | null
}
```

### 3. Progressive Testing
```
Environment → Connection → Auth → Operations
```

### 4. Masked Logging
```typescript
console.log(`API Key: ${apiKey.substring(0, 20)}...`)
```

### 5. Clear Error Messages
```typescript
if (response.status === 403) {
  console.log('❌ 403 FORBIDDEN - Possible causes:')
  console.log('  1. ...')
  console.log('  2. ...')
}
```

### 6. Visual Output
```typescript
console.log('1️⃣ Testing connection...')
console.log('✅ Success')
console.log('❌ Failed')
console.log('⚠️  Warning')
```

### 7. Summary Reports
```typescript
console.log('\n📊 Test Summary:')
console.log('='.repeat(50))
Object.entries(results).forEach(([test, passed]) => {
  console.log(`- ${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`)
})
```

---

## Quick Reference: Test File Template

```typescript
#!/usr/bin/env npx tsx

import dotenv from 'dotenv'
dotenv.config()

// 1. Configuration
const CONFIG = {
  baseUrl: process.env.SERVICE_URL,
  apiKey: process.env.SERVICE_API_KEY
}

// 2. Results tracker
const results = {
  environment: false,
  connection: false,
  authentication: false,
  operations: false,
  error: null as string | null
}

// 3. Main test function
async function main() {
  console.log('Service Integration Test')
  console.log('='.repeat(50))

  try {
    // Test 1: Environment
    console.log('\n1️⃣ Environment...')
    // ... validation
    results.environment = true

    // Test 2: Connection
    console.log('\n2️⃣ Connection...')
    // ... test
    results.connection = true

    // Test 3: Authentication
    console.log('\n3️⃣ Authentication...')
    // ... test
    results.authentication = true

    // Test 4: Operations
    console.log('\n4️⃣ Operations...')
    // ... test
    results.operations = true

    // Summary
    console.log('\n📊 Test Summary:')
    console.log('='.repeat(50))
    Object.entries(results).forEach(([test, passed]) => {
      if (test !== 'error') {
        console.log(`- ${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`)
      }
    })

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    results.error = error instanceof Error ? error.message : String(error)
    process.exit(1)
  }
}

main()
```

---

These examples demonstrate real-world integration testing patterns that have been battle-tested in production environments. Use them as templates for your own integration tests!
