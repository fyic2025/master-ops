/**
 * OAuth 2.0 Authentication Strategies
 *
 * Complete implementation of OAuth 2.0 flows for n8n integrations
 * This is a standalone module that can be used alongside existing auth-strategies.ts
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface OAuth2ClientCredentialsConfig {
  flow: 'client_credentials'
  tokenEndpoint: string
  clientId: string
  clientSecret: string
  scopes?: string[]
  additionalParams?: Record<string, string>
}

export interface OAuth2AuthorizationCodeConfig {
  flow: 'authorization_code'
  authorizationEndpoint: string
  tokenEndpoint: string
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes?: string[]
  state?: string
  authorizationCode?: string
  additionalParams?: Record<string, string>
}

export interface OAuth2RefreshTokenConfig {
  flow: 'refresh_token'
  tokenEndpoint: string
  clientId: string
  clientSecret: string
  refreshToken: string
  scopes?: string[]
  additionalParams?: Record<string, string>
}

export type OAuth2Config =
  | OAuth2ClientCredentialsConfig
  | OAuth2AuthorizationCodeConfig
  | OAuth2RefreshTokenConfig

export interface OAuth2TokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
  scope?: string
}

export interface OAuth2Headers {
  Authorization: string
  'Content-Type': string
  [key: string]: string
}

// ============================================================================
// OAuth 2.0 Client Credentials Flow
// ============================================================================

/**
 * OAuth 2.0 Client Credentials Flow
 *
 * Best for: Server-to-server authentication, machine-to-machine
 * Use when: Your app needs to access its own resources
 *
 * @example
 * const config = {
 *   flow: 'client_credentials',
 *   tokenEndpoint: 'https://api.example.com/oauth/token',
 *   clientId: process.env.CLIENT_ID,
 *   clientSecret: process.env.CLIENT_SECRET,
 *   scopes: ['read', 'write']
 * }
 * const token = await getClientCredentialsToken(config)
 * const headers = oauth2BearerHeaders(token.access_token)
 */
export async function getClientCredentialsToken(
  config: OAuth2ClientCredentialsConfig
): Promise<OAuth2TokenResponse> {
  const { tokenEndpoint, clientId, clientSecret, scopes, additionalParams } = config

  // Prepare request body
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    ...(scopes && scopes.length > 0 && { scope: scopes.join(' ') }),
    ...additionalParams,
  })

  // Basic Auth with client credentials
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `OAuth2 Client Credentials failed: ${response.status} ${response.statusText}\n${errorText}`
    )
  }

  const tokenData = await response.json() as OAuth2TokenResponse
  return tokenData
}

// ============================================================================
// OAuth 2.0 Authorization Code Flow
// ============================================================================

/**
 * Generate OAuth 2.0 Authorization URL
 *
 * Step 1 of Authorization Code flow: Redirect user to this URL
 *
 * @example
 * const authUrl = getAuthorizationUrl({
 *   flow: 'authorization_code',
 *   authorizationEndpoint: 'https://api.example.com/oauth/authorize',
 *   tokenEndpoint: 'https://api.example.com/oauth/token',
 *   clientId: process.env.CLIENT_ID,
 *   clientSecret: process.env.CLIENT_SECRET,
 *   redirectUri: 'https://yourapp.com/callback',
 *   scopes: ['read', 'write'],
 *   state: 'random-state-string'
 * })
 * console.log('Redirect user to:', authUrl)
 */
export function getAuthorizationUrl(config: OAuth2AuthorizationCodeConfig): string {
  const { authorizationEndpoint, clientId, redirectUri, scopes, state, additionalParams } = config

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    ...(scopes && scopes.length > 0 && { scope: scopes.join(' ') }),
    ...(state && { state }),
    ...additionalParams,
  })

  return `${authorizationEndpoint}?${params.toString()}`
}

/**
 * Exchange Authorization Code for Access Token
 *
 * Step 2 of Authorization Code flow: Exchange code from callback for token
 *
 * @example
 * // After user authorizes and is redirected back with ?code=xxx
 * const token = await exchangeAuthorizationCode({
 *   flow: 'authorization_code',
 *   tokenEndpoint: 'https://api.example.com/oauth/token',
 *   clientId: process.env.CLIENT_ID,
 *   clientSecret: process.env.CLIENT_SECRET,
 *   redirectUri: 'https://yourapp.com/callback',
 *   authorizationCode: 'code-from-callback'
 * })
 */
export async function exchangeAuthorizationCode(
  config: OAuth2AuthorizationCodeConfig
): Promise<OAuth2TokenResponse> {
  const { tokenEndpoint, clientId, clientSecret, redirectUri, authorizationCode, additionalParams } =
    config

  if (!authorizationCode) {
    throw new Error('Authorization code is required')
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    ...additionalParams,
  })

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `OAuth2 Authorization Code exchange failed: ${response.status} ${response.statusText}\n${errorText}`
    )
  }

  const tokenData = await response.json() as OAuth2TokenResponse
  return tokenData
}

// ============================================================================
// OAuth 2.0 Refresh Token Flow
// ============================================================================

/**
 * Refresh Access Token using Refresh Token
 *
 * Use when: Access token has expired and you have a refresh token
 *
 * @example
 * const newToken = await refreshAccessToken({
 *   flow: 'refresh_token',
 *   tokenEndpoint: 'https://api.example.com/oauth/token',
 *   clientId: process.env.CLIENT_ID,
 *   clientSecret: process.env.CLIENT_SECRET,
 *   refreshToken: storedRefreshToken
 * })
 */
export async function refreshAccessToken(
  config: OAuth2RefreshTokenConfig
): Promise<OAuth2TokenResponse> {
  const { tokenEndpoint, clientId, clientSecret, refreshToken, scopes, additionalParams } = config

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    ...(scopes && scopes.length > 0 && { scope: scopes.join(' ') }),
    ...additionalParams,
  })

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `OAuth2 Refresh Token failed: ${response.status} ${response.statusText}\n${errorText}`
    )
  }

  const tokenData = await response.json() as OAuth2TokenResponse
  return tokenData
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate Bearer token headers for OAuth 2.0
 */
export function oauth2BearerHeaders(accessToken: string): OAuth2Headers {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Check if access token is expired or expiring soon
 *
 * @param expiresIn - Seconds until expiration (from token response)
 * @param issuedAt - When token was issued (timestamp in ms)
 * @param bufferSeconds - Refresh if expiring within this many seconds (default: 300 = 5 minutes)
 */
export function isTokenExpiring(
  expiresIn: number,
  issuedAt: number,
  bufferSeconds: number = 300
): boolean {
  const expiresAtMs = issuedAt + expiresIn * 1000
  const expiresInMs = expiresAtMs - Date.now()
  const bufferMs = bufferSeconds * 1000

  return expiresInMs <= bufferMs
}

/**
 * Validate OAuth 2.0 configuration
 */
export function validateOAuth2Config(
  config: OAuth2Config
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  switch (config.flow) {
    case 'client_credentials':
      if (!config.tokenEndpoint) errors.push('tokenEndpoint is required')
      if (!config.clientId) errors.push('clientId is required')
      if (!config.clientSecret) errors.push('clientSecret is required')
      break

    case 'authorization_code':
      if (!config.authorizationEndpoint) errors.push('authorizationEndpoint is required')
      if (!config.tokenEndpoint) errors.push('tokenEndpoint is required')
      if (!config.clientId) errors.push('clientId is required')
      if (!config.clientSecret) errors.push('clientSecret is required')
      if (!config.redirectUri) errors.push('redirectUri is required')
      break

    case 'refresh_token':
      if (!config.tokenEndpoint) errors.push('tokenEndpoint is required')
      if (!config.clientId) errors.push('clientId is required')
      if (!config.clientSecret) errors.push('clientSecret is required')
      if (!config.refreshToken) errors.push('refreshToken is required')
      break

    default:
      errors.push(`Unknown OAuth2 flow: ${(config as any).flow}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Generate random state string for CSRF protection
 */
export function generateState(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let state = ''
  for (let i = 0; i < length; i++) {
    state += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return state
}

/**
 * Mask OAuth credentials for logging
 */
export function maskOAuthCredentials(config: OAuth2Config): OAuth2Config {
  const masked = { ...config }

  if ('clientSecret' in masked) {
    masked.clientSecret = `${masked.clientSecret.substring(0, 8)}...`
  }

  if ('refreshToken' in masked && masked.refreshToken) {
    masked.refreshToken = `${masked.refreshToken.substring(0, 8)}...`
  }

  return masked
}

// ============================================================================
// Unified OAuth 2.0 Function
// ============================================================================

/**
 * Get OAuth 2.0 Access Token
 *
 * Unified function that handles all OAuth 2.0 flows
 *
 * @example
 * // Client Credentials
 * const token = await getOAuth2Token({ flow: 'client_credentials', ... })
 *
 * // Authorization Code
 * const token = await getOAuth2Token({ flow: 'authorization_code', authorizationCode: 'xxx', ... })
 *
 * // Refresh Token
 * const token = await getOAuth2Token({ flow: 'refresh_token', refreshToken: 'yyy', ... })
 */
export async function getOAuth2Token(config: OAuth2Config): Promise<OAuth2TokenResponse> {
  // Validate configuration
  const validation = validateOAuth2Config(config)
  if (!validation.valid) {
    throw new Error(`Invalid OAuth2 configuration:\n${validation.errors.join('\n')}`)
  }

  switch (config.flow) {
    case 'client_credentials':
      return getClientCredentialsToken(config)

    case 'authorization_code':
      if (!config.authorizationCode) {
        throw new Error(
          'Authorization code is required. First generate authorization URL and get code from callback.'
        )
      }
      return exchangeAuthorizationCode(config)

    case 'refresh_token':
      return refreshAccessToken(config)

    default:
      throw new Error(`Unsupported OAuth2 flow: ${(config as any).flow}`)
  }
}

// ============================================================================
// Export Everything
// ============================================================================

export default {
  // Token acquisition
  getOAuth2Token,
  getClientCredentialsToken,
  getAuthorizationUrl,
  exchangeAuthorizationCode,
  refreshAccessToken,

  // Helpers
  oauth2BearerHeaders,
  isTokenExpiring,
  validateOAuth2Config,
  generateState,
  maskOAuthCredentials,
}
