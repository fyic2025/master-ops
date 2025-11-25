#!/usr/bin/env tsx
/**
 * n8n Auth Code Generator
 *
 * Generates ready-to-paste authentication code for n8n Code nodes
 * Usage: npx tsx generate-auth-code.ts --type <auth-type> [options]
 */

// ============================================================================
// CLI Configuration
// ============================================================================

interface AuthCodeConfig {
  type: 'bearer' | 'apikey' | 'basic' | 'hmac' | 'oauth'
  tokenVar?: string
  keyVar?: string
  headerName?: string
  usernameVar?: string
  passwordVar?: string
  apiIdVar?: string
  apiKeyVar?: string
  queryString?: string
  algorithm?: 'sha256' | 'sha512'
  encoding?: 'base64' | 'hex'
  clientIdVar?: string
  clientSecretVar?: string
  scopes?: string
  tokenEndpoint?: string
}

const args = process.argv.slice(2)

function parseArgs(): AuthCodeConfig | null {
  const config: Partial<AuthCodeConfig> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    switch (arg) {
      case '--type':
        config.type = nextArg as AuthCodeConfig['type']
        i++
        break
      case '--token-var':
        config.tokenVar = nextArg
        i++
        break
      case '--key-var':
        config.keyVar = nextArg
        i++
        break
      case '--header-name':
        config.headerName = nextArg
        i++
        break
      case '--username-var':
        config.usernameVar = nextArg
        i++
        break
      case '--password-var':
        config.passwordVar = nextArg
        i++
        break
      case '--api-id-var':
        config.apiIdVar = nextArg
        i++
        break
      case '--api-key-var':
        config.apiKeyVar = nextArg
        i++
        break
      case '--query-string':
        config.queryString = nextArg
        i++
        break
      case '--algorithm':
        config.algorithm = nextArg as 'sha256' | 'sha512'
        i++
        break
      case '--encoding':
        config.encoding = nextArg as 'base64' | 'hex'
        i++
        break
      case '--client-id-var':
        config.clientIdVar = nextArg
        i++
        break
      case '--client-secret-var':
        config.clientSecretVar = nextArg
        i++
        break
      case '--scopes':
        config.scopes = nextArg
        i++
        break
      case '--token-endpoint':
        config.tokenEndpoint = nextArg
        i++
        break
      case '--help':
      case '-h':
        return null
      default:
        if (arg.startsWith('--')) {
          console.error(`❌ Unknown option: ${arg}`)
          return null
        }
    }
  }

  if (!config.type) {
    console.error('❌ Error: --type is required')
    return null
  }

  return config as AuthCodeConfig
}

function showHelp() {
  console.log('n8n Auth Code Generator')
  console.log('═'.repeat(70))
  console.log()
  console.log('Usage: npx tsx generate-auth-code.ts --type <auth-type> [options]')
  console.log()
  console.log('Auth Types:')
  console.log('  bearer    - Bearer token authentication')
  console.log('  apikey    - API key authentication')
  console.log('  basic     - Basic authentication (username/password)')
  console.log('  hmac      - HMAC-SHA256/SHA512 signature authentication')
  console.log('  oauth     - OAuth 2.0 Client Credentials flow')
  console.log()
  console.log('Options:')
  console.log('  --token-var <name>         Environment variable for bearer token')
  console.log('  --key-var <name>           Environment variable for API key')
  console.log('  --header-name <name>       Header name for API key (default: X-API-Key)')
  console.log('  --username-var <name>      Environment variable for username')
  console.log('  --password-var <name>      Environment variable for password')
  console.log('  --api-id-var <name>        Environment variable for HMAC API ID')
  console.log('  --api-key-var <name>       Environment variable for HMAC API key')
  console.log('  --query-string <string>    Query string for HMAC signature')
  console.log('  --algorithm <sha256|sha512> HMAC algorithm (default: sha256)')
  console.log('  --encoding <base64|hex>    HMAC encoding (default: base64)')
  console.log('  --client-id-var <name>     Environment variable for OAuth client ID')
  console.log('  --client-secret-var <name> Environment variable for OAuth client secret')
  console.log('  --scopes <scopes>          OAuth scopes (comma-separated)')
  console.log('  --token-endpoint <url>     OAuth token endpoint URL')
  console.log()
  console.log('Examples:')
  console.log()
  console.log('  # Bearer token')
  console.log('  npx tsx generate-auth-code.ts --type bearer --token-var HUBSPOT_TOKEN')
  console.log()
  console.log('  # API Key')
  console.log('  npx tsx generate-auth-code.ts --type apikey --key-var OPENAI_KEY --header-name Authorization')
  console.log()
  console.log('  # Basic Auth')
  console.log('  npx tsx generate-auth-code.ts --type basic --username-var API_USER --password-var API_PASS')
  console.log()
  console.log('  # HMAC (Unleashed-style)')
  console.log('  npx tsx generate-auth-code.ts --type hmac --api-id-var UNLEASHED_API_ID --api-key-var UNLEASHED_API_KEY --query-string "format=json"')
  console.log()
  console.log('  # OAuth 2.0')
  console.log('  npx tsx generate-auth-code.ts --type oauth --client-id-var CLIENT_ID --client-secret-var CLIENT_SECRET --token-endpoint https://api.example.com/oauth/token --scopes "read,write"')
  console.log()
}

// ============================================================================
// Code Generators
// ============================================================================

function generateBearerCode(config: AuthCodeConfig): string {
  const tokenVar = config.tokenVar || 'ACCESS_TOKEN'

  return `// Bearer Token Authentication
// Generated by n8n Auth Code Generator

const token = $env.${tokenVar}

if (!token) {
  throw new Error('${tokenVar} environment variable not set')
}

// Add to HTTP Request node headers
const headers = {
  'Authorization': \`Bearer \${token}\`,
  'Content-Type': 'application/json'
}

// Return for use in workflow
return { headers }
`
}

function generateApiKeyCode(config: AuthCodeConfig): string {
  const keyVar = config.keyVar || 'API_KEY'
  const headerName = config.headerName || 'X-API-Key'

  return `// API Key Authentication
// Generated by n8n Auth Code Generator

const apiKey = $env.${keyVar}

if (!apiKey) {
  throw new Error('${keyVar} environment variable not set')
}

// Add to HTTP Request node headers
const headers = {
  '${headerName}': apiKey,
  'Content-Type': 'application/json'
}

// Return for use in workflow
return { headers }
`
}

function generateBasicAuthCode(config: AuthCodeConfig): string {
  const usernameVar = config.usernameVar || 'API_USERNAME'
  const passwordVar = config.passwordVar || 'API_PASSWORD'

  return `// Basic Authentication
// Generated by n8n Auth Code Generator

const username = $env.${usernameVar}
const password = $env.${passwordVar}

if (!username || !password) {
  throw new Error('${usernameVar} and ${passwordVar} environment variables required')
}

// Encode credentials
const credentials = Buffer.from(\`\${username}:\${password}\`).toString('base64')

// Add to HTTP Request node headers
const headers = {
  'Authorization': \`Basic \${credentials}\`,
  'Content-Type': 'application/json'
}

// Return for use in workflow
return { headers }
`
}

function generateHmacCode(config: AuthCodeConfig): string {
  const apiIdVar = config.apiIdVar || 'API_ID'
  const apiKeyVar = config.apiKeyVar || 'API_KEY'
  const queryString = config.queryString || 'format=json'
  const algorithm = config.algorithm || 'sha256'
  const encoding = config.encoding || 'base64'

  let signatureCode: string
  if (encoding === 'base64') {
    signatureCode = `const hmac = crypto.createHmac('${algorithm}', apiKey)
hmac.update(queryString)
const hexSignature = hmac.digest('hex')
const signature = Buffer.from(hexSignature, 'hex').toString('base64')`
  } else {
    signatureCode = `const hmac = crypto.createHmac('${algorithm}', apiKey)
hmac.update(queryString)
const signature = hmac.digest('hex')`
  }

  return `// HMAC-${algorithm.toUpperCase()} Authentication (${encoding})
// Generated by n8n Auth Code Generator

const crypto = require('crypto')

const apiId = $env.${apiIdVar}
const apiKey = $env.${apiKeyVar}
const queryString = '${queryString}'

if (!apiId || !apiKey) {
  throw new Error('${apiIdVar} and ${apiKeyVar} environment variables required')
}

// Generate HMAC signature
${signatureCode}

// Add to HTTP Request node headers
const headers = {
  'Accept': 'application/json',
  'api-auth-id': apiId,
  'api-auth-signature': signature
}

// Return for use in workflow
return { headers, signature }
`
}

function generateOAuthCode(config: AuthCodeConfig): string {
  const clientIdVar = config.clientIdVar || 'CLIENT_ID'
  const clientSecretVar = config.clientSecretVar || 'CLIENT_SECRET'
  const tokenEndpoint = config.tokenEndpoint || 'https://api.example.com/oauth/token'
  const scopes = config.scopes || 'read write'

  return `// OAuth 2.0 Client Credentials Flow
// Generated by n8n Auth Code Generator

const clientId = $env.${clientIdVar}
const clientSecret = $env.${clientSecretVar}

if (!clientId || !clientSecret) {
  throw new Error('${clientIdVar} and ${clientSecretVar} environment variables required')
}

// Request access token
const tokenResponse = await fetch('${tokenEndpoint}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': \`Basic \${Buffer.from(\`\${clientId}:\${clientSecret}\`).toString('base64')}\`
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    scope: '${scopes}'
  })
})

if (!tokenResponse.ok) {
  throw new Error(\`OAuth token request failed: \${tokenResponse.status}\`)
}

const tokenData = await tokenResponse.json()
const accessToken = tokenData.access_token

// Add to HTTP Request node headers
const headers = {
  'Authorization': \`Bearer \${accessToken}\`,
  'Content-Type': 'application/json'
}

// Return for use in workflow
return {
  headers,
  accessToken,
  expiresIn: tokenData.expires_in,
  tokenType: tokenData.token_type
}
`
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const config = parseArgs()

  if (!config) {
    showHelp()
    process.exit(1)
  }

  console.log('🔐 n8n Auth Code Generator')
  console.log('═'.repeat(70))
  console.log()
  console.log(`Auth Type: ${config.type}`)
  console.log()
  console.log('Generated Code:')
  console.log('─'.repeat(70))
  console.log()

  let code: string

  switch (config.type) {
    case 'bearer':
      code = generateBearerCode(config)
      break
    case 'apikey':
      code = generateApiKeyCode(config)
      break
    case 'basic':
      code = generateBasicAuthCode(config)
      break
    case 'hmac':
      code = generateHmacCode(config)
      break
    case 'oauth':
      code = generateOAuthCode(config)
      break
    default:
      console.error(`❌ Unknown auth type: ${config.type}`)
      process.exit(1)
  }

  console.log(code)
  console.log('─'.repeat(70))
  console.log()
  console.log('📋 Instructions:')
  console.log('  1. Copy the code above')
  console.log('  2. Create a new Code node in your n8n workflow')
  console.log('  3. Paste the code into the Code node')
  console.log('  4. Set the required environment variables in n8n')
  console.log('  5. Test the authentication')
  console.log()
  console.log('⚠️  Security Notes:')
  console.log('  - NEVER hardcode credentials in the code')
  console.log('  - Always use environment variables ($env.VAR_NAME)')
  console.log('  - Set environment variables in n8n UI or .env file')
  console.log('  - Use HTTPS for all API requests')
  console.log()
}

main()
