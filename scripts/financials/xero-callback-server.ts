/**
 * Xero OAuth Callback Server
 *
 * Starts a local server to catch OAuth callbacks and automatically
 * exchange the code for tokens, saving them to .env
 *
 * Usage:
 *   npx tsx scripts/financials/xero-callback-server.ts
 *   Then click the authorization URLs shown
 */

import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath })

const PORT = 3000
const REDIRECT_URI = `http://localhost:${PORT}/callback`

interface BusinessConfig {
  key: string
  name: string
  clientId: string
  clientSecret: string
}

const BUSINESSES: Record<string, BusinessConfig> = {
  teelixir: {
    key: 'teelixir',
    name: 'Teelixir',
    clientId: process.env.XERO_TEELIXIR_CLIENT_ID || '',
    clientSecret: process.env.XERO_TEELIXIR_CLIENT_SECRET || '',
  },
  elevate: {
    key: 'elevate',
    name: 'Elevate Wholesale',
    clientId: process.env.XERO_ELEVATE_CLIENT_ID || '',
    clientSecret: process.env.XERO_ELEVATE_CLIENT_SECRET || '',
  },
  boo: {
    key: 'boo',
    name: 'Buy Organics Online',
    clientId: process.env.XERO_BOO_CLIENT_ID || '',
    clientSecret: process.env.XERO_BOO_CLIENT_SECRET || '',
  },
  rhf: {
    key: 'rhf',
    name: 'Red Hill Fresh',
    clientId: process.env.XERO_RHF_CLIENT_ID || '',
    clientSecret: process.env.XERO_RHF_CLIENT_SECRET || '',
  },
}

const SCOPES = [
  'offline_access',
  'accounting.transactions.read',
  'accounting.reports.read',
  'accounting.settings.read',
  'accounting.contacts.read',
].join(' ')

let completedAuths: string[] = []

function updateEnvFile(envKey: string, newValue: string): void {
  try {
    let envContent = fs.readFileSync(envPath, 'utf-8')
    const regex = new RegExp(`^${envKey}=.*$`, 'm')

    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${envKey}=${newValue}`)
    } else {
      envContent += `\n${envKey}=${newValue}`
    }

    fs.writeFileSync(envPath, envContent)
  } catch (error: any) {
    console.error(`Failed to save token: ${error.message}`)
  }
}

async function exchangeCode(businessKey: string, code: string): Promise<boolean> {
  const config = BUSINESSES[businessKey]
  if (!config) {
    console.error(`Unknown business: ${businessKey}`)
    return false
  }

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

  try {
    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    })

    const text = await response.text()

    if (!response.ok) {
      console.error(`❌ ${config.name}: Token exchange failed`)
      console.error(text)
      return false
    }

    const tokenData = JSON.parse(text)
    const envKey = `XERO_${businessKey.toUpperCase()}_REFRESH_TOKEN`

    updateEnvFile(envKey, tokenData.refresh_token)
    console.log(`✅ ${config.name}: Token saved to .env`)
    completedAuths.push(businessKey)
    return true
  } catch (error: any) {
    console.error(`❌ ${config.name}: ${error.message}`)
    return false
  }
}

function generateAuthUrl(key: string): string {
  const config = BUSINESSES[key]
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state: key,
  })
  return `https://login.xero.com/identity/connect/authorize?${params.toString()}`
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '', `http://localhost:${PORT}`)

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // This is the business key

    if (code && state) {
      const success = await exchangeCode(state, code)

      res.writeHead(200, { 'Content-Type': 'text/html' })
      if (success) {
        res.end(`
          <html>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
              <h1 style="color: green;">✅ ${BUSINESSES[state]?.name || state} Connected!</h1>
              <p>Token saved to .env file.</p>
              <p>Completed: ${completedAuths.length}/4</p>
              ${completedAuths.length < 4 ? '<p>You can close this tab and authorize the next business.</p>' : '<p style="color: green; font-weight: bold;">All done! You can close this window and stop the server.</p>'}
            </body>
          </html>
        `)
      } else {
        res.end(`
          <html>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
              <h1 style="color: red;">❌ Failed to connect ${state}</h1>
              <p>Check the console for error details.</p>
            </body>
          </html>
        `)
      }
    } else {
      res.writeHead(400, { 'Content-Type': 'text/html' })
      res.end('<h1>Missing code or state parameter</h1>')
    }
  } else {
    // Show home page with auth links
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`
      <html>
        <head><title>Xero Authorization</title></head>
        <body style="font-family: system-ui; padding: 40px; max-width: 800px; margin: 0 auto;">
          <h1>🔐 Xero Authorization</h1>
          <p>Click each link below to authorize. After authorizing in Xero, you'll be redirected back here.</p>
          <div style="margin: 20px 0;">
            ${Object.keys(BUSINESSES).map(key => `
              <p style="margin: 15px 0; padding: 15px; background: ${completedAuths.includes(key) ? '#d4edda' : '#f8f9fa'}; border-radius: 8px;">
                ${completedAuths.includes(key) ? '✅' : '🔗'}
                <a href="${generateAuthUrl(key)}" style="font-size: 18px;">${BUSINESSES[key].name}</a>
                ${completedAuths.includes(key) ? ' - Connected!' : ''}
              </p>
            `).join('')}
          </div>
          <p style="color: #666;">Completed: ${completedAuths.length}/4</p>
        </body>
      </html>
    `)
  }
})

server.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗')
  console.log('║  XERO OAUTH CALLBACK SERVER                                       ║')
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n')
  console.log(`Server running at http://localhost:${PORT}`)
  console.log('\nOpen this URL in your browser, then click each authorization link:')
  console.log(`\n  👉 http://localhost:${PORT}\n`)
  console.log('Press Ctrl+C to stop the server when done.\n')
})
