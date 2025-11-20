# Integration Testing Reference Guide

This document provides comprehensive technical guidance for testing external service integrations.

## Table of Contents

1. [Integration Testing Fundamentals](#integration-testing-fundamentals)
2. [Authentication Methods](#authentication-methods)
3. [Testing Patterns](#testing-patterns)
4. [Error Handling](#error-handling)
5. [Performance Considerations](#performance-considerations)
6. [Security Best Practices](#security-best-practices)
7. [Reporting & Documentation](#reporting--documentation)

---

## Integration Testing Fundamentals

### What is Integration Testing?

Integration testing validates that your application can successfully communicate with external services, APIs, databases, and third-party platforms. Unlike unit tests (which test isolated functions) or E2E tests (which test full user workflows), integration tests focus on the **boundaries** between systems.

### Goals of Integration Testing

1. **Validate connectivity** - Can we reach the service?
2. **Verify authentication** - Do our credentials work?
3. **Test data flow** - Can we send and receive data?
4. **Confirm error handling** - Do we handle failures gracefully?
5. **Measure performance** - Are response times acceptable?
6. **Document behavior** - How does the service actually work?

### When to Run Integration Tests

- **Before deployment** - Ensure integrations still work
- **After configuration changes** - Verify new settings
- **When credentials rotate** - Test new API keys/tokens
- **During debugging** - Isolate integration issues
- **For documentation** - Demonstrate how to use a service

---

## Authentication Methods

### 1. Bearer Token Authentication

**Most common for modern APIs**

```typescript
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}

const response = await fetch(url, { headers })
```

**Testing checklist:**
- ✅ Token is not expired
- ✅ Token has required scopes/permissions
- ✅ Header format is exactly "Bearer {token}"
- ✅ Token is URL-safe (no encoding issues)

**Common errors:**
- `401` - Token invalid or expired
- `403` - Token valid but insufficient permissions

### 2. API Key Authentication

**Common for simpler APIs**

```typescript
// Header-based
const headers = {
  'X-API-Key': apiKey,
  // or
  'Authorization': `ApiKey ${apiKey}`,
  // or custom header name
  'X-Service-API-Key': apiKey
}

// Query parameter (less secure)
const url = `${baseUrl}/endpoint?api_key=${apiKey}`
```

**Testing checklist:**
- ✅ Header name matches API documentation exactly
- ✅ API key is active (not revoked)
- ✅ Rate limits are considered
- ✅ Query param encoding if using URL params

**Common errors:**
- `401` - API key invalid
- `429` - Rate limit exceeded

### 3. OAuth 2.0 Authentication

**For user-delegated access**

```typescript
// Authorization Code Flow
// 1. Get authorization code
const authUrl = `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`

// 2. Exchange code for token
const tokenResponse = await fetch(tokenEndpoint, {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri
  })
})

const { access_token, refresh_token } = await tokenResponse.json()

// 3. Use access token
const headers = {
  'Authorization': `Bearer ${access_token}`
}
```

**Testing checklist:**
- ✅ Client ID and secret are correct
- ✅ Redirect URI matches registered URL
- ✅ Scopes are requested and granted
- ✅ Token refresh logic works
- ✅ Access token expiration is handled

**Common errors:**
- `invalid_client` - Client credentials wrong
- `invalid_grant` - Authorization code expired
- `insufficient_scope` - Requested scope denied

### 4. HMAC Signature Authentication

**For high-security custom APIs**

```typescript
import crypto from 'crypto'

function generateHMACSignature(
  secret: string,
  method: string,
  url: string,
  timestamp: string,
  body?: string
): string {
  // Build signature string (format varies by API)
  const signatureString = [
    method.toUpperCase(),
    url,
    timestamp,
    body ? JSON.stringify(body) : ''
  ].join('\n')

  // Generate HMAC
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(signatureString)
  const signature = hmac.digest('base64')

  return signature
}

// Use in request
const timestamp = new Date().toISOString()
const signature = generateHMACSignature(secret, 'GET', '/api/endpoint', timestamp)

const headers = {
  'X-Timestamp': timestamp,
  'X-Signature': signature,
  'X-API-ID': apiId
}
```

**Testing checklist:**
- ✅ Signature algorithm matches (SHA256, SHA512, etc.)
- ✅ Signature string format is exact
- ✅ Timestamp is within acceptable window
- ✅ Secret key is correct
- ✅ Encoding (base64, hex) matches spec

**Common errors:**
- `403` - Signature verification failed
- `400` - Timestamp expired or invalid

### 5. Basic Authentication

**Legacy but still used**

```typescript
const credentials = Buffer.from(`${username}:${password}`).toString('base64')
const headers = {
  'Authorization': `Basic ${credentials}`
}
```

**Testing checklist:**
- ✅ Username and password are correct
- ✅ Base64 encoding is proper
- ✅ Special characters in password are handled

---

## Testing Patterns

### Pattern 1: Progressive Testing

Test in layers, from simple to complex:

```typescript
async function testIntegration() {
  // Layer 1: Environment
  if (!validateEnvironment()) {
    return { error: 'Environment not configured' }
  }

  // Layer 2: Connection
  if (!await testConnection()) {
    return { error: 'Cannot reach service' }
  }

  // Layer 3: Authentication
  if (!await testAuth()) {
    return { error: 'Authentication failed' }
  }

  // Layer 4: Read operations
  if (!await testRead()) {
    return { error: 'Read operations failed' }
  }

  // Layer 5: Write operations
  if (!await testWrite()) {
    return { error: 'Write operations failed' }
  }

  return { success: true }
}
```

**Benefits:**
- Isolates failures quickly
- Clear error messages
- Minimizes unnecessary API calls
- Respects rate limits

### Pattern 2: Health Check Pattern

Simple boolean check for monitoring:

```typescript
async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })
    return response.ok
  } catch {
    return false
  }
}

// Use for uptime monitoring
if (await healthCheck()) {
  console.log('✅ Service is operational')
} else {
  console.log('❌ Service is down')
}
```

### Pattern 3: Test Data Management

```typescript
// Create test data
const testRecord = await createTestRecord({
  name: 'TEST_RECORD_' + Date.now(),
  test: true,
  metadata: { createdBy: 'integration-test' }
})

try {
  // Run tests using test record
  await testUpdateOperation(testRecord.id)
  await testReadOperation(testRecord.id)
} finally {
  // Always cleanup
  await deleteTestRecord(testRecord.id)
}
```

**Best practices:**
- Use unique identifiers (timestamps, UUIDs)
- Tag test data clearly
- Clean up in finally blocks
- Use soft deletes if available

### Pattern 4: Retry with Exponential Backoff

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // Retry on 5xx or 429
      if (response.status >= 500 || response.status === 429) {
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
          console.log(`Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }

      return response
    } catch (error) {
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        throw error
      }
    }
  }
  throw new Error('Max retries exceeded')
}
```

### Pattern 5: Results Accumulator

```typescript
interface TestResults {
  service: string
  timestamp: string
  tests: {
    [key: string]: {
      status: 'pass' | 'fail' | 'skip'
      duration?: number
      error?: string
      details?: any
    }
  }
}

const results: TestResults = {
  service: 'MyAPI',
  timestamp: new Date().toISOString(),
  tests: {}
}

// Run each test
results.tests.connection = await runTest('connection', testConnection)
results.tests.auth = await runTest('auth', testAuth)
results.tests.read = await runTest('read', testRead)

// Generate report
console.log(generateReport(results))
```

---

## Error Handling

### HTTP Status Code Reference

| Code | Meaning | Common Causes | Solutions |
|------|---------|---------------|-----------|
| 400 | Bad Request | Invalid payload, missing fields | Validate request data, check API docs |
| 401 | Unauthorized | Invalid/missing credentials | Check token/key, regenerate if expired |
| 403 | Forbidden | Valid auth but insufficient permissions | Review API scopes, contact admin |
| 404 | Not Found | Resource doesn't exist, wrong URL | Verify endpoint path, check resource ID |
| 405 | Method Not Allowed | Using GET instead of POST, etc. | Check HTTP method matches API spec |
| 409 | Conflict | Duplicate key, resource already exists | Use unique IDs, check for existing |
| 422 | Unprocessable Entity | Validation failed on server | Review field constraints, data types |
| 429 | Too Many Requests | Rate limit exceeded | Implement backoff, reduce request rate |
| 500 | Internal Server Error | Server-side issue | Check service status, retry later |
| 502 | Bad Gateway | Proxy/gateway issue | Service may be deploying, retry |
| 503 | Service Unavailable | Service down for maintenance | Check status page, retry later |
| 504 | Gateway Timeout | Request took too long | Increase timeout, optimize query |

### Network Error Reference

| Error | Meaning | Solutions |
|-------|---------|-----------|
| ECONNREFUSED | Connection refused | Service not running, wrong port, firewall |
| ETIMEDOUT | Request timed out | Increase timeout, check service performance |
| ENOTFOUND | DNS lookup failed | Check hostname spelling, DNS configuration |
| ECONNRESET | Connection reset | Network instability, server crashed |
| EHOSTUNREACH | No route to host | Network configuration, firewall |
| EPROTO | Protocol error | SSL/TLS mismatch, certificate issues |

### Error Handling Template

```typescript
async function handleRequest(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options)

    // Handle HTTP errors
    if (!response.ok) {
      const errorBody = await response.text()

      switch (response.status) {
        case 401:
          throw new AuthenticationError('Invalid credentials', { url, status: 401 })
        case 403:
          throw new PermissionError('Insufficient permissions', { url, status: 403 })
        case 404:
          throw new NotFoundError(`Resource not found: ${url}`, { url, status: 404 })
        case 429:
          throw new RateLimitError('Rate limit exceeded', {
            url,
            status: 429,
            retryAfter: response.headers.get('Retry-After')
          })
        default:
          throw new APIError(`HTTP ${response.status}: ${errorBody}`, {
            url,
            status: response.status,
            body: errorBody
          })
      }
    }

    return response
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError('Network request failed', { url, originalError: error })
    }
    throw error
  }
}
```

---

## Performance Considerations

### Response Time Benchmarks

```typescript
async function measurePerformance(
  testFn: () => Promise<any>,
  iterations = 10
): Promise<{ avg: number; min: number; max: number }> {
  const times: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await testFn()
    const duration = performance.now() - start
    times.push(duration)
  }

  return {
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    min: Math.min(...times),
    max: Math.max(...times)
  }
}

// Use it
const perf = await measurePerformance(async () => {
  await fetch(`${baseUrl}/api/endpoint`)
}, 10)

console.log(`Average: ${perf.avg.toFixed(2)}ms`)
console.log(`Min: ${perf.min.toFixed(2)}ms`)
console.log(`Max: ${perf.max.toFixed(2)}ms`)
```

### Acceptable Response Times

| Operation | Target | Acceptable | Slow |
|-----------|--------|------------|------|
| Health check | < 100ms | < 500ms | > 1s |
| Read single record | < 200ms | < 1s | > 2s |
| Read list (10 items) | < 300ms | < 1.5s | > 3s |
| Create record | < 500ms | < 2s | > 5s |
| Update record | < 500ms | < 2s | > 5s |
| Delete record | < 300ms | < 1s | > 2s |
| Batch operation | < 2s | < 10s | > 30s |

---

## Security Best Practices

### 1. Never Log Sensitive Data

```typescript
// ❌ BAD
console.log('API Key:', apiKey)
console.log('Token:', token)

// ✅ GOOD
console.log('API Key:', apiKey.substring(0, 8) + '...')
console.log('Token:', token.substring(0, 20) + '...')

// ✅ BETTER
function maskSecret(secret: string, visibleChars = 8): string {
  if (secret.length <= visibleChars) return '***'
  return secret.substring(0, visibleChars) + '...[' + (secret.length - visibleChars) + ' chars]'
}

console.log('API Key:', maskSecret(apiKey))
```

### 2. Use Environment Variables

```typescript
// ❌ BAD - Hardcoded credentials
const apiKey = 'sk_live_abc123xyz'

// ✅ GOOD
import dotenv from 'dotenv'
dotenv.config()

const apiKey = process.env.API_KEY
if (!apiKey) {
  throw new Error('API_KEY environment variable required')
}
```

### 3. Validate SSL Certificates

```typescript
// ❌ BAD - Disabling cert validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// ✅ GOOD - Use proper certificates
// If testing against local/dev servers, use proper test certificates
```

### 4. Use Secrets Management

```typescript
// For production, use proper secrets management:
// - AWS Secrets Manager
// - Azure Key Vault
// - HashiCorp Vault
// - Google Secret Manager

// Example with AWS Secrets Manager
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

async function getSecret(secretName: string): Promise<string> {
  const client = new SecretsManagerClient({ region: 'us-east-1' })
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  )
  return response.SecretString || ''
}
```

---

## Reporting & Documentation

### Markdown Report Template

```markdown
# Integration Test Report: {Service Name}

**Date:** {timestamp}
**Duration:** {duration}
**Status:** {PASS/FAIL}

## Summary

- **Connection:** ✅ Success (142ms)
- **Authentication:** ✅ Success
- **Read Operations:** ✅ Success (10 records retrieved)
- **Write Operations:** ✅ Success
- **Error Handling:** ✅ Verified

## Test Details

### 1. Environment Configuration
- Base URL: https://api.example.com
- Auth Method: Bearer Token
- Rate Limit: 100 requests/minute

### 2. Connection Test
- DNS Resolution: ✅ Success
- TCP Connection: ✅ Success (45ms)
- SSL Certificate: ✅ Valid

### 3. Authentication Test
- Token Validation: ✅ Success
- Permissions: ✅ Read, Write, Delete

### 4. CRUD Operations

#### Read
- Endpoint: GET /api/resources
- Records Retrieved: 10
- Response Time: 234ms
- Status: ✅ Success

#### Create
- Endpoint: POST /api/resources
- Test Record ID: abc-123
- Response Time: 456ms
- Status: ✅ Success

#### Update
- Endpoint: PATCH /api/resources/abc-123
- Fields Updated: name, description
- Response Time: 287ms
- Status: ✅ Success

#### Delete
- Endpoint: DELETE /api/resources/abc-123
- Response Time: 198ms
- Status: ✅ Success

## Performance Metrics

| Operation | Avg Response Time | Status |
|-----------|------------------|--------|
| Health Check | 87ms | ⚡ Excellent |
| Read Single | 142ms | ✅ Good |
| Read List | 234ms | ✅ Good |
| Create | 456ms | ✅ Acceptable |
| Update | 287ms | ✅ Good |
| Delete | 198ms | ✅ Good |

## Errors & Warnings

None

## Recommendations

1. Consider caching frequently accessed resources
2. Implement pagination for large result sets
3. Add request deduplication for create operations

## Next Steps

- ✅ Integration is working correctly
- Deploy to production
- Set up monitoring alerts
```

### JSON Report Format

```json
{
  "service": "MyAPI",
  "timestamp": "2025-01-19T12:00:00Z",
  "duration": 2453,
  "status": "pass",
  "environment": {
    "baseUrl": "https://api.example.com",
    "authMethod": "bearer",
    "configured": true
  },
  "tests": {
    "connection": {
      "status": "pass",
      "duration": 142,
      "details": {
        "dns": "ok",
        "tcp": "ok",
        "ssl": "valid"
      }
    },
    "authentication": {
      "status": "pass",
      "duration": 89,
      "details": {
        "tokenValid": true,
        "permissions": ["read", "write", "delete"]
      }
    },
    "crud": {
      "read": {
        "status": "pass",
        "duration": 234,
        "recordCount": 10
      },
      "create": {
        "status": "pass",
        "duration": 456,
        "recordId": "abc-123"
      },
      "update": {
        "status": "pass",
        "duration": 287
      },
      "delete": {
        "status": "pass",
        "duration": 198
      }
    }
  },
  "performance": {
    "avgResponseTime": 241,
    "slowestOperation": "create",
    "fastestOperation": "healthCheck"
  },
  "errors": [],
  "warnings": [],
  "recommendations": [
    "Consider caching frequently accessed resources",
    "Implement pagination for large result sets"
  ]
}
```

---

## Advanced Topics

### Testing GraphQL APIs

```typescript
async function testGraphQLAPI() {
  const query = `
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        name
        email
      }
    }
  `

  const response = await fetch(`${baseUrl}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query,
      variables: { id: '123' }
    })
  })

  const { data, errors } = await response.json()

  if (errors) {
    console.error('GraphQL errors:', errors)
    return false
  }

  console.log('User data:', data.user)
  return true
}
```

### Testing WebSocket Connections

```typescript
import WebSocket from 'ws'

async function testWebSocket(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${wsUrl}?token=${token}`)

    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error('WebSocket connection timeout'))
    }, 5000)

    ws.on('open', () => {
      console.log('✅ WebSocket connected')
      clearTimeout(timeout)
      ws.close()
      resolve(true)
    })

    ws.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })
}
```

### Testing Batch Operations

```typescript
async function testBatchCreate(records: any[]) {
  console.log(`Testing batch create: ${records.length} records`)

  const batchSize = 100 // API limit
  const batches = []

  for (let i = 0; i < records.length; i += batchSize) {
    batches.push(records.slice(i, i + batchSize))
  }

  console.log(`Split into ${batches.length} batches`)

  for (let i = 0; i < batches.length; i++) {
    const start = performance.now()

    const response = await fetch(`${baseUrl}/api/batch`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ records: batches[i] })
    })

    const duration = performance.now() - start
    const result = await response.json()

    console.log(`Batch ${i + 1}/${batches.length}: ${result.created} created in ${duration.toFixed(0)}ms`)
  }
}
```

---

## Conclusion

Integration testing is a critical part of building reliable applications that depend on external services. By following these patterns and best practices, you can:

- Quickly identify and resolve integration issues
- Build confidence in your external dependencies
- Create documentation through executable tests
- Provide actionable troubleshooting guidance
- Maintain high availability and performance

Remember: **Integration tests are living documentation** that prove your system works with its dependencies.
