/**
 * Integration Test Framework
 *
 * Comprehensive API testing framework with authentication, validation, and reporting
 * Use this to test external API integrations before deploying to n8n workflows
 */

import type { OAuth2Config } from './oauth-strategies'
import { getOAuth2Token, oauth2BearerHeaders } from './oauth-strategies'

// ============================================================================
// Type Definitions
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface TestConfig {
  name: string
  description?: string
  baseUrl: string
  auth?: AuthConfig
  defaultHeaders?: Record<string, string>
  timeout?: number
  retries?: number
  retryDelay?: number
}

export type AuthConfig =
  | { type: 'bearer'; token: string }
  | { type: 'apikey'; key: string; headerName?: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'hmac'; apiId: string; apiKey: string; algorithm?: 'sha256' | 'sha512' }
  | { type: 'oauth'; config: OAuth2Config }
  | { type: 'custom'; getHeaders: () => Promise<Record<string, string>> }

export interface TestRequest {
  method: HttpMethod
  endpoint: string
  headers?: Record<string, string>
  query?: Record<string, string>
  body?: any
  timeout?: number
  skipAuth?: boolean
}

export interface TestExpectation {
  status?: number
  statusIn?: number[]
  headers?: Record<string, string | RegExp>
  body?: any
  bodyContains?: string | string[]
  bodyMatches?: RegExp
  bodySchema?: Record<string, any>
  responseTime?: { max?: number; min?: number }
  custom?: (response: TestResponse) => Promise<boolean> | boolean
}

export interface TestResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: any
  responseTime: number
  request: TestRequest
}

export interface TestResult {
  passed: boolean
  name: string
  description?: string
  request: TestRequest
  response?: TestResponse
  error?: string
  expectations: ExpectationResult[]
  duration: number
  timestamp: string
}

export interface ExpectationResult {
  type: string
  passed: boolean
  message: string
  expected?: any
  actual?: any
}

export interface TestSuite {
  name: string
  description?: string
  tests: TestDefinition[]
  beforeAll?: () => Promise<void>
  afterAll?: () => Promise<void>
  beforeEach?: () => Promise<void>
  afterEach?: () => Promise<void>
}

export interface TestDefinition {
  name: string
  description?: string
  request: TestRequest
  expect: TestExpectation
  skip?: boolean
}

export interface TestSuiteResult {
  suite: string
  description?: string
  results: TestResult[]
  summary: {
    total: number
    passed: number
    failed: number
    skipped: number
    duration: number
  }
  timestamp: string
}

// ============================================================================
// Integration Test Framework Class
// ============================================================================

export class IntegrationTestFramework {
  private config: TestConfig
  private authHeaders: Record<string, string> = {}

  constructor(config: TestConfig) {
    this.config = {
      timeout: 30000,
      retries: 0,
      retryDelay: 1000,
      ...config,
    }
  }

  /**
   * Initialize authentication
   */
  async initialize(): Promise<void> {
    if (!this.config.auth) {
      return
    }

    switch (this.config.auth.type) {
      case 'bearer':
        this.authHeaders = {
          Authorization: `Bearer ${this.config.auth.token}`,
        }
        break

      case 'apikey':
        const headerName = this.config.auth.headerName || 'X-API-Key'
        this.authHeaders = {
          [headerName]: this.config.auth.key,
        }
        break

      case 'basic':
        const credentials = Buffer.from(
          `${this.config.auth.username}:${this.config.auth.password}`
        ).toString('base64')
        this.authHeaders = {
          Authorization: `Basic ${credentials}`,
        }
        break

      case 'hmac':
        // HMAC requires query string, will be computed per-request
        break

      case 'oauth':
        const tokenResponse = await getOAuth2Token(this.config.auth.config)
        this.authHeaders = oauth2BearerHeaders(tokenResponse.access_token)
        break

      case 'custom':
        this.authHeaders = await this.config.auth.getHeaders()
        break
    }
  }

  /**
   * Execute a single test request
   */
  async executeRequest(request: TestRequest): Promise<TestResponse> {
    const url = this.buildUrl(request.endpoint, request.query)
    const headers = this.buildHeaders(request)
    const timeout = request.timeout || this.config.timeout!

    const startTime = Date.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const responseTime = Date.now() - startTime
      const contentType = response.headers.get('content-type') || ''
      let body: any

      if (contentType.includes('application/json')) {
        body = await response.json()
      } else {
        body = await response.text()
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body,
        responseTime,
        request,
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      throw new Error(
        `Request failed after ${responseTime}ms: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Validate response against expectations
   */
  validateResponse(response: TestResponse, expectations: TestExpectation): ExpectationResult[] {
    const results: ExpectationResult[] = []

    // Status code
    if (expectations.status !== undefined) {
      results.push({
        type: 'status',
        passed: response.status === expectations.status,
        message: `Status code should be ${expectations.status}`,
        expected: expectations.status,
        actual: response.status,
      })
    }

    // Status code in range
    if (expectations.statusIn !== undefined) {
      results.push({
        type: 'statusIn',
        passed: expectations.statusIn.includes(response.status),
        message: `Status code should be one of [${expectations.statusIn.join(', ')}]`,
        expected: expectations.statusIn,
        actual: response.status,
      })
    }

    // Headers
    if (expectations.headers) {
      for (const [key, expected] of Object.entries(expectations.headers)) {
        const actual = response.headers[key.toLowerCase()]

        if (expected instanceof RegExp) {
          results.push({
            type: 'header',
            passed: expected.test(actual || ''),
            message: `Header '${key}' should match pattern`,
            expected: expected.toString(),
            actual,
          })
        } else {
          results.push({
            type: 'header',
            passed: actual === expected,
            message: `Header '${key}' should equal '${expected}'`,
            expected,
            actual,
          })
        }
      }
    }

    // Body exact match
    if (expectations.body !== undefined) {
      const passed = JSON.stringify(response.body) === JSON.stringify(expectations.body)
      results.push({
        type: 'body',
        passed,
        message: 'Response body should match expected value',
        expected: expectations.body,
        actual: response.body,
      })
    }

    // Body contains
    if (expectations.bodyContains) {
      const contains = Array.isArray(expectations.bodyContains)
        ? expectations.bodyContains
        : [expectations.bodyContains]
      const bodyStr = JSON.stringify(response.body)

      for (const substring of contains) {
        results.push({
          type: 'bodyContains',
          passed: bodyStr.includes(substring),
          message: `Response body should contain '${substring}'`,
          expected: substring,
          actual: bodyStr,
        })
      }
    }

    // Body matches regex
    if (expectations.bodyMatches) {
      const bodyStr = JSON.stringify(response.body)
      results.push({
        type: 'bodyMatches',
        passed: expectations.bodyMatches.test(bodyStr),
        message: `Response body should match pattern`,
        expected: expectations.bodyMatches.toString(),
        actual: bodyStr,
      })
    }

    // Body schema validation (simple)
    if (expectations.bodySchema) {
      const schemaResults = this.validateSchema(response.body, expectations.bodySchema)
      results.push(...schemaResults)
    }

    // Response time
    if (expectations.responseTime) {
      if (expectations.responseTime.max !== undefined) {
        results.push({
          type: 'responseTime',
          passed: response.responseTime <= expectations.responseTime.max,
          message: `Response time should be <= ${expectations.responseTime.max}ms`,
          expected: expectations.responseTime.max,
          actual: response.responseTime,
        })
      }
      if (expectations.responseTime.min !== undefined) {
        results.push({
          type: 'responseTime',
          passed: response.responseTime >= expectations.responseTime.min,
          message: `Response time should be >= ${expectations.responseTime.min}ms`,
          expected: expectations.responseTime.min,
          actual: response.responseTime,
        })
      }
    }

    // Custom validation
    if (expectations.custom) {
      try {
        const passed = expectations.custom(response)
        results.push({
          type: 'custom',
          passed: typeof passed === 'boolean' ? passed : false,
          message: 'Custom validation',
        })
      } catch (error) {
        results.push({
          type: 'custom',
          passed: false,
          message: `Custom validation failed: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    }

    return results
  }

  /**
   * Run a single test
   */
  async runTest(test: TestDefinition): Promise<TestResult> {
    const startTime = Date.now()

    try {
      const response = await this.executeRequest(test.request)
      const expectations = this.validateResponse(response, test.expect)
      const passed = expectations.every((e) => e.passed)

      return {
        passed,
        name: test.name,
        description: test.description,
        request: test.request,
        response,
        expectations,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        passed: false,
        name: test.name,
        description: test.description,
        request: test.request,
        error: error instanceof Error ? error.message : String(error),
        expectations: [],
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Run a test suite
   */
  async runSuite(suite: TestSuite): Promise<TestSuiteResult> {
    const startTime = Date.now()
    const results: TestResult[] = []

    // Initialize auth
    await this.initialize()

    // Run beforeAll hook
    if (suite.beforeAll) {
      await suite.beforeAll()
    }

    // Run tests
    for (const test of suite.tests) {
      if (test.skip) {
        results.push({
          passed: false,
          name: test.name,
          description: test.description,
          request: test.request,
          expectations: [],
          duration: 0,
          timestamp: new Date().toISOString(),
        })
        continue
      }

      // Run beforeEach hook
      if (suite.beforeEach) {
        await suite.beforeEach()
      }

      const result = await this.runTest(test)
      results.push(result)

      // Run afterEach hook
      if (suite.afterEach) {
        await suite.afterEach()
      }
    }

    // Run afterAll hook
    if (suite.afterAll) {
      await suite.afterAll()
    }

    const summary = {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed && !r.error).length,
      skipped: suite.tests.filter((t) => t.skip).length,
      duration: Date.now() - startTime,
    }

    return {
      suite: suite.name,
      description: suite.description,
      results,
      summary,
      timestamp: new Date().toISOString(),
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private buildUrl(endpoint: string, query?: Record<string, string>): string {
    let url = endpoint.startsWith('http') ? endpoint : `${this.config.baseUrl}${endpoint}`

    if (query) {
      const params = new URLSearchParams(query)
      url += `?${params.toString()}`
    }

    return url
  }

  private buildHeaders(request: TestRequest): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders,
    }

    // Add auth headers unless skipped
    if (!request.skipAuth) {
      Object.assign(headers, this.authHeaders)
    }

    // Add request-specific headers
    if (request.headers) {
      Object.assign(headers, request.headers)
    }

    return headers
  }

  private validateSchema(data: any, schema: Record<string, any>): ExpectationResult[] {
    const results: ExpectationResult[] = []

    for (const [key, expectedType] of Object.entries(schema)) {
      const actualType = typeof data[key]
      const passed =
        actualType === expectedType || (expectedType === 'array' && Array.isArray(data[key]))

      results.push({
        type: 'schema',
        passed,
        message: `Field '${key}' should be of type '${expectedType}'`,
        expected: expectedType,
        actual: actualType,
      })
    }

    return results
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function createTestSuite(suite: TestSuite): TestSuite {
  return suite
}

export function createTest(test: TestDefinition): TestDefinition {
  return test
}

// ============================================================================
// Export Everything
// ============================================================================

export default {
  IntegrationTestFramework,
  createTestSuite,
  createTest,
}
