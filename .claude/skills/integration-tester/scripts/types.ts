/**
 * Type Definitions for Integration Testing
 */

export type AuthType = 'bearer' | 'apikey' | 'oauth' | 'hmac' | 'basic' | 'custom'

export interface BearerAuthConfig {
  type: 'bearer'
  token: string
}

export interface APIKeyAuthConfig {
  type: 'apikey'
  key: string
  headerName?: string
  location?: 'header' | 'query'
}

export interface HMACAuthConfig {
  type: 'hmac'
  apiId: string
  apiKey: string
  algorithm: 'sha256' | 'sha512'
  encoding: 'base64' | 'hex'
}

export type AuthConfig = BearerAuthConfig | APIKeyAuthConfig | HMACAuthConfig

export interface TestResult {
  status: 'pass' | 'fail' | 'skip'
  duration?: number
  error?: string
  details?: any
}

export interface TestResults {
  service: string
  timestamp: string
  environment: TestResult
  connection?: TestResult
  authentication?: TestResult
  operations?: Record<string, TestResult>
  summary: {
    total: number
    passed: number
    failed: number
  }
}

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
} as const
