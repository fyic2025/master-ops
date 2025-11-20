/**
 * Authentication Strategy Implementations
 *
 * Reusable authentication handlers for common auth patterns
 */

import crypto from 'crypto'
import type { AuthConfig } from './types'

/**
 * Generate Bearer token authentication headers
 */
export function bearerAuth(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

/**
 * Generate API Key authentication headers
 */
export function apiKeyAuth(
  key: string,
  headerName: string = 'X-API-Key'
): Record<string, string> {
  return {
    [headerName]: key,
    'Content-Type': 'application/json'
  }
}

/**
 * Generate Basic authentication headers
 */
export function basicAuth(username: string, password: string): Record<string, string> {
  const credentials = Buffer.from(`${username}:${password}`).toString('base64')
  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json'
  }
}

/**
 * Generate HMAC-SHA256 signature
 */
export function generateHMACSHA256(secret: string, message: string): string {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(message)
  return hmac.digest('hex')
}

/**
 * Generate HMAC-SHA256 signature (Base64 encoded)
 */
export function generateHMACSHA256Base64(secret: string, message: string): string {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(message)
  const hexSignature = hmac.digest('hex')
  return Buffer.from(hexSignature, 'hex').toString('base64')
}

/**
 * Generate HMAC authentication headers (Unleashed-style)
 */
export function hmacAuth(
  apiId: string,
  apiKey: string,
  queryString: string,
  algorithm: 'sha256' | 'sha512' = 'sha256',
  encoding: 'base64' | 'hex' = 'base64'
): Record<string, string> {
  const hmac = crypto.createHmac(algorithm, apiKey)
  hmac.update(queryString)

  let signature: string
  if (encoding === 'base64') {
    const hexSignature = hmac.digest('hex')
    signature = Buffer.from(hexSignature, 'hex').toString('base64')
  } else {
    signature = hmac.digest('hex')
  }

  return {
    'Accept': 'application/json',
    'api-auth-id': apiId,
    'api-auth-signature': signature
  }
}

/**
 * Get authentication headers based on config
 */
export function getAuthHeaders(auth: AuthConfig, context?: any): Record<string, string> {
  switch (auth.type) {
    case 'bearer':
      return bearerAuth(auth.token)

    case 'apikey':
      return apiKeyAuth(auth.key, auth.headerName)

    case 'hmac':
      if (!context?.queryString) {
        throw new Error('HMAC auth requires queryString in context')
      }
      return hmacAuth(
        auth.apiId,
        auth.apiKey,
        context.queryString,
        auth.algorithm,
        auth.encoding
      )

    default:
      throw new Error(`Unsupported auth type: ${(auth as any).type}`)
  }
}

/**
 * Mask sensitive credentials for logging
 */
export function maskSecret(secret: string, visibleChars: number = 8): string {
  if (!secret || secret.length <= visibleChars) {
    return '***'
  }
  const masked = secret.substring(0, visibleChars) + '...'
  const hiddenLength = secret.length - visibleChars
  return `${masked} [${hiddenLength} chars hidden]`
}

/**
 * Validate authentication configuration
 */
export function validateAuthConfig(auth: AuthConfig): { valid: boolean; error?: string } {
  switch (auth.type) {
    case 'bearer':
      if (!auth.token) {
        return { valid: false, error: 'Bearer token is required' }
      }
      return { valid: true }

    case 'apikey':
      if (!auth.key) {
        return { valid: false, error: 'API key is required' }
      }
      return { valid: true }

    case 'hmac':
      if (!auth.apiId || !auth.apiKey) {
        return { valid: false, error: 'HMAC requires both apiId and apiKey' }
      }
      return { valid: true }

    default:
      return { valid: false, error: `Unknown auth type: ${(auth as any).type}` }
  }
}

// Export all strategies
export default {
  bearerAuth,
  apiKeyAuth,
  basicAuth,
  hmacAuth,
  generateHMACSHA256,
  generateHMACSHA256Base64,
  getAuthHeaders,
  maskSecret,
  validateAuthConfig
}
