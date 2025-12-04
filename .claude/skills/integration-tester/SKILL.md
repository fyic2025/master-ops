---
name: integration-tester
description: Tests integrations with external services including APIs, databases, webhooks, and third-party platforms. Validates connectivity, authentication, CRUD operations, error handling, and generates detailed test reports. Use when testing API connections, validating integrations, checking authentication, troubleshooting connectivity issues, or verifying external service configurations.
allowed-tools: Read, Write, Bash, Grep, Glob
---

# Universal Integration Testing Skill

This skill provides comprehensive integration testing capabilities for ANY external service, API, database, or third-party platform.

## When to Activate This Skill

Activate this skill when the user mentions:
- "test integration"
- "validate API connection"
- "check authentication"
- "verify [service] connectivity"
- "test CRUD operations"
- "troubleshoot integration"
- "generate integration test"
- "check if [service] is working"

## MCP Browser Testing Tools

Browser automation and debugging available via VS Code MCP:

| MCP Server | Use For |
|------------|---------|
| `puppeteer` | Browser automation, form testing, scraping, screenshots |
| `chrome-devtools` | Network inspection, DOM debugging, console access |

These tools enable end-to-end testing of web integrations, checkout flows, and UI verification.

---

## Testing Methodology

### Phase 1: Initial Assessment

1. **Understand the Integration**
   - What service is being tested? (API, database, webhook, etc.)
   - What authentication method is used? (Bearer token, API key, OAuth, custom HMAC, etc.)
   - What operations need testing? (Read, Write, Update, Delete, etc.)
   - Are there existing test files to reference?

2. **Locate Configuration**
   - Check [.env](.env) for credentials and endpoints
   - Look for existing test files: `test-*.ts` or `*.test.ts`
   - Find service client libraries in `shared/libs/[service]/`
   - Review any API documentation or examples

### Phase 2: Progressive Test Execution

Execute tests in this order to isolate issues effectively:

#### 1. Environment Validation
```typescript
// Verify required environment variables exist
const requiredVars = ['API_KEY', 'BASE_URL', 'AUTH_TOKEN']
const missing = requiredVars.filter(v => !process.env[v])
if (missing.length > 0) {
  console.error('Missing environment variables:', missing)
  process.exit(1)
}
```

**What to check:**
- All required credentials are present
- URLs are properly formatted
- No placeholder values like 'your-key-here'
- Sensitive data is masked in logs

#### 2. Connection Testing
```typescript
// Test basic connectivity before authentication
const response = await fetch(baseUrl)
console.log('Connection:', response.ok ? 'SUCCESS' : 'FAILED')
```

**What to check:**
- DNS resolves correctly
- Service is reachable (no ECONNREFUSED)
- SSL/TLS certificate is valid
- No network timeouts

#### 3. Authentication Testing
```typescript
// Validate credentials work
const headers = getAuthHeaders() // Bearer, API Key, or custom
const response = await fetch(endpoint, { headers })
if (response.status === 401) console.error('Invalid credentials')
if (response.status === 403) console.error('Insufficient permissions')
```

**What to check:**
- Auth headers are properly formatted
- Tokens/keys are valid and not expired
- Signature calculation is correct (for HMAC)
- Permissions are sufficient for operations

#### 4. Read Operations (GET)
```typescript
// Test data retrieval
const data = await client.list({ limit: 5 })
console.log(`Retrieved ${data.length} records`)
if (data.length > 0) {
  console.log('Sample record:', data[0])
}
```

**What to check:**
- Data is returned in expected format
- Response schema matches expectations
- Null/undefined values are handled
- Arrays vs objects are correct

#### 5. Create Operations (POST)
```typescript
// Test data creation (if safe to do so)
const testData = { name: 'Test Record', test: true }
const created = await client.create(testData)
console.log('Created record:', created.id)
```

**What to check:**
- Required fields are validated
- Response includes created resource
- ID/identifier is returned
- Timestamps are populated

#### 6. Update Operations (PUT/PATCH)
```typescript
// Test data modification
const updated = await client.update(id, { name: 'Updated' })
console.log('Update successful:', updated)
```

**What to check:**
- Partial updates work (PATCH)
- Full replacement works (PUT)
- Validation errors are clear
- Response reflects changes

#### 7. Delete Operations (DELETE)
```typescript
// Test data deletion
await client.delete(testRecordId)
console.log('Deletion successful')
```

**What to check:**
- Soft delete vs hard delete
- Cascading deletes work
- 404 for non-existent resources
- Idempotency (deleting twice)

#### 8. Error Handling
```typescript
// Test expected error conditions
try {
  await client.get('invalid-id')
} catch (error) {
  console.log('Error handled correctly:', error.message)
}
```

**What to check:**
- 400 Bad Request for invalid input
- 401 Unauthorized for missing auth
- 403 Forbidden for insufficient permissions
- 404 Not Found for missing resources
- 429 Too Many Requests for rate limiting
- 500 Server Error handling

#### 9. Advanced Features
- Pagination (limit/offset, cursors)
- Filtering and search
- Sorting
- Batch operations
- Real-time subscriptions
- Webhooks

### Phase 3: Results Reporting

Generate a comprehensive test report:

```typescript
const results = {
  service: 'ServiceName',
  timestamp: new Date().toISOString(),
  environment: {
    configured: true,
    missing: []
  },
  connection: {
    status: 'success',
    responseTime: 145
  },
  authentication: {
    status: 'success',
    method: 'Bearer Token'
  },
  operations: {
    read: { status: 'success', recordCount: 10 },
    create: { status: 'success' },
    update: { status: 'success' },
    delete: { status: 'success' }
  },
  errors: [],
  warnings: [],
  recommendations: []
}
```

## Error Analysis & Troubleshooting

When tests fail, provide specific, actionable guidance:

### Connection Errors

**ECONNREFUSED**
- Service is not running
- Wrong port number in BASE_URL
- Firewall blocking connection
- Check: `ping hostname` and verify port

**ETIMEDOUT**
- Service is overloaded or slow
- Network latency issues
- Timeout value too low
- Check: Increase timeout, verify service health

**ENOTFOUND**
- DNS resolution failed
- Hostname is incorrect
- No internet connection
- Check: Verify URL spelling, check DNS

### Authentication Errors

**401 Unauthorized**
- Token/API key is invalid or expired
- Missing Authorization header
- Incorrect auth header format
- Check: Regenerate token, verify header format

**403 Forbidden**
- Valid credentials but insufficient permissions
- Resource requires different access level
- IP whitelist restrictions
- Check: Review API permissions, verify IP

### Data Errors

**400 Bad Request**
- Invalid request payload
- Missing required fields
- Type validation failed
- Check: Review API schema, validate data types

**404 Not Found**
- Resource doesn't exist
- Wrong endpoint URL
- ID is incorrect
- Check: Verify endpoint path, confirm ID exists

**422 Unprocessable Entity**
- Validation failed on server
- Business logic constraints violated
- Duplicate key constraints
- Check: Review validation rules, check constraints

### Rate Limiting

**429 Too Many Requests**
- Exceeded rate limit
- Too many concurrent requests
- Check: Implement exponential backoff, reduce request rate

## Generating Test Files

When asked to create a test file, use this structure:

```typescript
#!/usr/bin/env npx tsx

/**
 * Integration Test: [Service Name]
 *
 * Tests: Connection, Authentication, CRUD operations
 * Generated: [date]
 */

import dotenv from 'dotenv'

dotenv.config()

// Configuration
const config = {
  baseUrl: process.env.SERVICE_BASE_URL,
  apiKey: process.env.SERVICE_API_KEY,
  // ... other config
}

// Validate environment
if (!config.baseUrl || !config.apiKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

// Test results tracker
const results = {
  environment: false,
  connection: false,
  authentication: false,
  read: false,
  create: false,
  update: false,
  delete: false,
  error: null as string | null
}

async function main() {
  console.log('Integration Test: [Service Name]')
  console.log('='.repeat(50))

  try {
    // 1. Environment validation
    console.log('\n1️⃣ Testing environment configuration...')
    console.log(`- Base URL: ${config.baseUrl}`)
    console.log(`- API Key: ${config.apiKey?.substring(0, 20)}...`)
    results.environment = true

    // 2. Connection test
    console.log('\n2️⃣ Testing connection...')
    const connResponse = await fetch(config.baseUrl)
    console.log(`- Status: ${connResponse.status}`)
    results.connection = connResponse.ok

    // 3. Authentication test
    console.log('\n3️⃣ Testing authentication...')
    const authResponse = await fetch(`${config.baseUrl}/endpoint`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      }
    })
    console.log(`- Auth Status: ${authResponse.status}`)
    results.authentication = authResponse.status !== 401

    // 4. Read operations
    console.log('\n4️⃣ Testing read operations...')
    // ... implementation

    // 5. Summary
    console.log('\n📊 Test Summary:')
    console.log('='.repeat(50))
    Object.entries(results).forEach(([test, result]) => {
      if (test !== 'error') {
        console.log(`- ${test}: ${result ? '✅ PASS' : '❌ FAIL'}`)
      }
    })

    if (results.error) {
      console.log(`\nError: ${results.error}`)
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error))
    results.error = error instanceof Error ? error.message : String(error)
    process.exit(1)
  }
}

main()
```

## Supporting Resources

Reference these files for additional guidance:
- [./reference.md](./reference.md) - Detailed testing methodology and best practices
- [./examples.md](./examples.md) - Real-world examples from actual projects
- [./templates/basic-test.template.ts](./templates/basic-test.template.ts) - Copy-paste test template
- [./scripts/auth-strategies.ts](./scripts/auth-strategies.ts) - Reusable authentication handlers
- [./scripts/error-solutions.ts](./scripts/error-solutions.ts) - Error pattern database
- [./scripts/validators.ts](./scripts/validators.ts) - Data validation helpers
- [./scripts/types.ts](./scripts/types.ts) - TypeScript type definitions

## Best Practices

1. **Test progressively** - Start with connection, then auth, then operations
2. **Mask sensitive data** - Never log full API keys or tokens
3. **Use descriptive output** - Emojis and formatting help readability
4. **Provide context** - Show what's being tested and why
5. **Give actionable errors** - Tell users how to fix issues
6. **Generate reports** - Document test results for future reference
7. **Clean up test data** - Delete any created test records
8. **Handle rate limits** - Implement delays and backoff strategies
9. **Validate schemas** - Check response structure matches expectations
10. **Document assumptions** - Note any prerequisites or requirements

## Success Criteria

A successful integration test should:
- ✅ Validate all required environment variables exist
- ✅ Confirm service connectivity
- ✅ Verify authentication works
- ✅ Test core CRUD operations
- ✅ Handle errors gracefully
- ✅ Provide clear troubleshooting steps for failures
- ✅ Generate a summary report
- ✅ Exit with appropriate status code (0 = success, 1 = failure)

## Output Format

Always provide:
1. **What was tested** - List of test categories
2. **Results** - Pass/fail for each test
3. **Errors** - Specific error messages with solutions
4. **Performance** - Response times where relevant
5. **Recommendations** - Suggestions for improvements
6. **Next steps** - What to do with the results
