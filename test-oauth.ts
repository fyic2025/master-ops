#!/usr/bin/env tsx
/**
 * OAuth 2.0 Authentication Tester
 *
 * Test OAuth 2.0 flows before using in n8n workflows
 * Usage: npx tsx test-oauth.ts <flow-type>
 */

import {
  getOAuth2Token,
  getAuthorizationUrl,
  oauth2BearerHeaders,
  type OAuth2Config,
} from './oauth-strategies'

// ============================================================================
// Configuration
// ============================================================================

const args = process.argv.slice(2)
const flowType = args[0] as 'client' | 'refresh' | 'auth' | undefined

if (!flowType || !['client', 'refresh', 'auth'].includes(flowType)) {
  console.log('OAuth 2.0 Authentication Tester')
  console.log('═'.repeat(70))
  console.log()
  console.log('Usage: npx tsx test-oauth.ts <flow-type>')
  console.log()
  console.log('Flow Types:')
  console.log('  client    - Test Client Credentials flow')
  console.log('  refresh   - Test Refresh Token flow')
  console.log('  auth      - Generate Authorization URL (Authorization Code flow)')
  console.log()
  console.log('Examples:')
  console.log('  npx tsx test-oauth.ts client')
  console.log('  npx tsx test-oauth.ts refresh')
  console.log('  npx tsx test-oauth.ts auth')
  console.log()
  process.exit(1)
}

// ============================================================================
// Test Configurations
// ============================================================================

/**
 * Add your OAuth 2.0 configurations here
 * IMPORTANT: Use environment variables, never hardcode secrets!
 */

// Example: Client Credentials (adjust for your API)
const clientCredentialsConfig: OAuth2Config = {
  flow: 'client_credentials',
  tokenEndpoint: process.env.OAUTH_TOKEN_ENDPOINT || 'https://api.example.com/oauth/token',
  clientId: process.env.OAUTH_CLIENT_ID || '',
  clientSecret: process.env.OAUTH_CLIENT_SECRET || '',
  scopes: (process.env.OAUTH_SCOPES || 'read write').split(' '),
}

// Example: Refresh Token
const refreshTokenConfig: OAuth2Config = {
  flow: 'refresh_token',
  tokenEndpoint: process.env.OAUTH_TOKEN_ENDPOINT || 'https://api.example.com/oauth/token',
  clientId: process.env.OAUTH_CLIENT_ID || '',
  clientSecret: process.env.OAUTH_CLIENT_SECRET || '',
  refreshToken: process.env.OAUTH_REFRESH_TOKEN || '',
}

// Example: Authorization Code (for generating auth URL)
const authorizationCodeConfig: OAuth2Config = {
  flow: 'authorization_code',
  authorizationEndpoint:
    process.env.OAUTH_AUTH_ENDPOINT || 'https://api.example.com/oauth/authorize',
  tokenEndpoint: process.env.OAUTH_TOKEN_ENDPOINT || 'https://api.example.com/oauth/token',
  clientId: process.env.OAUTH_CLIENT_ID || '',
  clientSecret: process.env.OAUTH_CLIENT_SECRET || '',
  redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/callback',
  scopes: (process.env.OAUTH_SCOPES || 'read write').split(' '),
  state: Math.random().toString(36).substring(2, 15),
}

// ============================================================================
// Test Functions
// ============================================================================

async function testClientCredentials() {
  console.log('🔐 Testing OAuth 2.0 Client Credentials Flow')
  console.log('═'.repeat(70))
  console.log()

  console.log('Configuration:')
  console.log(`  Token Endpoint: ${clientCredentialsConfig.tokenEndpoint}`)
  console.log(`  Client ID:      ${clientCredentialsConfig.clientId.substring(0, 10)}...`)
  console.log(`  Scopes:         ${clientCredentialsConfig.scopes?.join(', ')}`)
  console.log()

  if (!clientCredentialsConfig.clientId || !clientCredentialsConfig.clientSecret) {
    console.error('❌ Error: Missing OAuth credentials')
    console.log()
    console.log('Required environment variables:')
    console.log('  OAUTH_TOKEN_ENDPOINT    - OAuth token endpoint URL')
    console.log('  OAUTH_CLIENT_ID         - OAuth client ID')
    console.log('  OAUTH_CLIENT_SECRET     - OAuth client secret')
    console.log('  OAUTH_SCOPES            - Space-separated scopes (optional)')
    console.log()
    process.exit(1)
  }

  try {
    console.log('⏳ Requesting access token...')
    const startTime = Date.now()

    const tokenResponse = await getOAuth2Token(clientCredentialsConfig)

    const duration = Date.now() - startTime
    console.log(`✅ Success! (${duration}ms)`)
    console.log()

    console.log('Token Response:')
    console.log(`  Access Token:  ${tokenResponse.access_token.substring(0, 20)}...`)
    console.log(`  Token Type:    ${tokenResponse.token_type}`)
    console.log(`  Expires In:    ${tokenResponse.expires_in} seconds`)
    if (tokenResponse.refresh_token) {
      console.log(`  Refresh Token: ${tokenResponse.refresh_token.substring(0, 20)}...`)
    }
    if (tokenResponse.scope) {
      console.log(`  Scope:         ${tokenResponse.scope}`)
    }
    console.log()

    console.log('Generated Headers:')
    const headers = oauth2BearerHeaders(tokenResponse.access_token)
    console.log(JSON.stringify(headers, null, 2))
    console.log()

    console.log('📋 n8n Code Node Example:')
    console.log('─'.repeat(70))
    console.log(`const clientId = $env.OAUTH_CLIENT_ID
const clientSecret = $env.OAUTH_CLIENT_SECRET

const tokenResponse = await fetch('${clientCredentialsConfig.tokenEndpoint}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': \`Basic \${Buffer.from(\`\${clientId}:\${clientSecret}\`).toString('base64')}\`
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    scope: '${clientCredentialsConfig.scopes?.join(' ')}'
  })
})

const tokenData = await tokenResponse.json()
const headers = {
  'Authorization': \`Bearer \${tokenData.access_token}\`,
  'Content-Type': 'application/json'
}

return { headers, tokenData }`)
    console.log('─'.repeat(70))
    console.log()

    console.log('✅ OAuth 2.0 Client Credentials test completed successfully!')
  } catch (error) {
    console.error('❌ Test failed!')
    console.error()
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
    } else {
      console.error(error)
    }
    process.exit(1)
  }
}

async function testRefreshToken() {
  console.log('🔄 Testing OAuth 2.0 Refresh Token Flow')
  console.log('═'.repeat(70))
  console.log()

  console.log('Configuration:')
  console.log(`  Token Endpoint: ${refreshTokenConfig.tokenEndpoint}`)
  console.log(`  Client ID:      ${refreshTokenConfig.clientId.substring(0, 10)}...`)
  if ('refreshToken' in refreshTokenConfig && refreshTokenConfig.refreshToken) {
    console.log(`  Refresh Token:  ${refreshTokenConfig.refreshToken.substring(0, 10)}...`)
  }
  console.log()

  if (
    !refreshTokenConfig.clientId ||
    !refreshTokenConfig.clientSecret ||
    !('refreshToken' in refreshTokenConfig) ||
    !refreshTokenConfig.refreshToken
  ) {
    console.error('❌ Error: Missing OAuth credentials')
    console.log()
    console.log('Required environment variables:')
    console.log('  OAUTH_TOKEN_ENDPOINT    - OAuth token endpoint URL')
    console.log('  OAUTH_CLIENT_ID         - OAuth client ID')
    console.log('  OAUTH_CLIENT_SECRET     - OAuth client secret')
    console.log('  OAUTH_REFRESH_TOKEN     - OAuth refresh token')
    console.log()
    process.exit(1)
  }

  try {
    console.log('⏳ Refreshing access token...')
    const startTime = Date.now()

    const tokenResponse = await getOAuth2Token(refreshTokenConfig)

    const duration = Date.now() - startTime
    console.log(`✅ Success! (${duration}ms)`)
    console.log()

    console.log('Token Response:')
    console.log(`  Access Token:  ${tokenResponse.access_token.substring(0, 20)}...`)
    console.log(`  Token Type:    ${tokenResponse.token_type}`)
    console.log(`  Expires In:    ${tokenResponse.expires_in} seconds`)
    if (tokenResponse.refresh_token) {
      console.log(`  Refresh Token: ${tokenResponse.refresh_token.substring(0, 20)}... (new)`)
    }
    console.log()

    console.log('✅ OAuth 2.0 Refresh Token test completed successfully!')
  } catch (error) {
    console.error('❌ Test failed!')
    console.error()
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
    } else {
      console.error(error)
    }
    process.exit(1)
  }
}

function generateAuthorizationUrl() {
  console.log('🔗 OAuth 2.0 Authorization Code Flow - Step 1')
  console.log('═'.repeat(70))
  console.log()

  if (!authorizationCodeConfig.clientId) {
    console.error('❌ Error: Missing OAuth client ID')
    console.log()
    console.log('Required environment variables:')
    console.log('  OAUTH_AUTH_ENDPOINT     - OAuth authorization endpoint URL')
    console.log('  OAUTH_CLIENT_ID         - OAuth client ID')
    console.log('  OAUTH_REDIRECT_URI      - OAuth redirect URI')
    console.log('  OAUTH_SCOPES            - Space-separated scopes (optional)')
    console.log()
    process.exit(1)
  }

  const authUrl = getAuthorizationUrl(authorizationCodeConfig)

  console.log('Configuration:')
  console.log(`  Auth Endpoint:  ${authorizationCodeConfig.authorizationEndpoint}`)
  console.log(`  Client ID:      ${authorizationCodeConfig.clientId}`)
  console.log(`  Redirect URI:   ${authorizationCodeConfig.redirectUri}`)
  console.log(`  Scopes:         ${authorizationCodeConfig.scopes?.join(', ')}`)
  console.log(`  State:          ${authorizationCodeConfig.state}`)
  console.log()

  console.log('📋 Authorization URL:')
  console.log('─'.repeat(70))
  console.log(authUrl)
  console.log('─'.repeat(70))
  console.log()

  console.log('Next Steps:')
  console.log('  1. Open the URL above in a browser')
  console.log('  2. Authorize the application')
  console.log('  3. You will be redirected to your redirect URI with a code parameter')
  console.log('  4. Extract the code from the URL')
  console.log('  5. Use the code to exchange for an access token')
  console.log()

  console.log('To exchange the code for a token, use:')
  console.log(`  import { exchangeAuthorizationCode } from './oauth-strategies'`)
  console.log()
  console.log(`  const token = await exchangeAuthorizationCode({`)
  console.log(`    flow: 'authorization_code',`)
  console.log(`    tokenEndpoint: '${authorizationCodeConfig.tokenEndpoint}',`)
  console.log(`    clientId: '${authorizationCodeConfig.clientId}',`)
  console.log(`    clientSecret: process.env.OAUTH_CLIENT_SECRET,`)
  console.log(`    redirectUri: '${authorizationCodeConfig.redirectUri}',`)
  console.log(`    authorizationCode: 'CODE_FROM_CALLBACK'`)
  console.log(`  })`)
  console.log()
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  switch (flowType) {
    case 'client':
      await testClientCredentials()
      break
    case 'refresh':
      await testRefreshToken()
      break
    case 'auth':
      generateAuthorizationUrl()
      break
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:')
  console.error(error)
  process.exit(1)
})
