/**
 * Verify Credentials - Test all API connections
 *
 * This script checks if all credentials are properly configured
 * and can successfully connect to services.
 */

interface CredentialCheck {
  name: string
  service: string
  required: string[]
  test: () => Promise<boolean>
}

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function checkEnvVars(vars: string[]): { missing: string[]; present: string[] } {
  const missing: string[] = []
  const present: string[] = []

  for (const varName of vars) {
    if (process.env[varName]) {
      present.push(varName)
    } else {
      missing.push(varName)
    }
  }

  return { missing, present }
}

async function verifyBigCommerce(prefix: string): Promise<boolean> {
  const storeHash = process.env[`${prefix}_BC_STORE_HASH`]
  const accessToken = process.env[`${prefix}_BC_ACCESS_TOKEN`]

  if (!storeHash || !accessToken) {
    return false
  }

  try {
    const response = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/store`,
      {
        headers: {
          'X-Auth-Token': accessToken,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    )

    return response.ok
  } catch (error) {
    return false
  }
}

async function verifySupabase(prefix: string): Promise<boolean> {
  const url = process.env[`${prefix}_SUPABASE_URL`]
  const key = process.env[`${prefix}_SUPABASE_SERVICE_ROLE_KEY`]

  if (!url || !key) {
    return false
  }

  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    })

    return response.ok || response.status === 404 // 404 is OK, means we connected
  } catch (error) {
    return false
  }
}

async function verifyN8N(): Promise<boolean> {
  const baseUrl = process.env.N8N_BASE_URL
  const apiKey = process.env.N8N_API_KEY

  if (!baseUrl || !apiKey) {
    return false
  }

  try {
    const response = await fetch(`${baseUrl}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': apiKey,
        Accept: 'application/json',
      },
    })

    return response.ok
  } catch (error) {
    return false
  }
}

async function verifyHubSpot(): Promise<boolean> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN

  if (!token) {
    return false
  }

  try {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    return response.ok
  } catch (error) {
    return false
  }
}

async function main() {
  log('\n🔐 Credential Verification Report\n', colors.cyan)
  log('=' .repeat(80), colors.gray)

  const checks: Array<{
    name: string
    vars: string[]
    test?: () => Promise<boolean>
  }> = [
    // Buy Organics Online
    {
      name: 'Buy Organics Online - BigCommerce',
      vars: ['BOO_BC_STORE_HASH', 'BOO_BC_ACCESS_TOKEN', 'BOO_BC_CLIENT_ID'],
      test: () => verifyBigCommerce('BOO'),
    },
    {
      name: 'Buy Organics Online - Supabase',
      vars: ['BOO_SUPABASE_URL', 'BOO_SUPABASE_SERVICE_ROLE_KEY'],
      test: () => verifySupabase('BOO'),
    },

    // Teelixir
    {
      name: 'Teelixir - BigCommerce',
      vars: ['TEELIXIR_BC_STORE_HASH', 'TEELIXIR_BC_ACCESS_TOKEN', 'TEELIXIR_BC_CLIENT_ID'],
      test: () => verifyBigCommerce('TEELIXIR'),
    },
    {
      name: 'Teelixir - Supabase',
      vars: ['TEELIXIR_SUPABASE_URL', 'TEELIXIR_SUPABASE_SERVICE_ROLE_KEY'],
      test: () => verifySupabase('TEELIXIR'),
    },

    // Elevate Wholesale
    {
      name: 'Elevate Wholesale - BigCommerce',
      vars: ['ELEVATE_BC_STORE_HASH', 'ELEVATE_BC_ACCESS_TOKEN', 'ELEVATE_BC_CLIENT_ID'],
      test: () => verifyBigCommerce('ELEVATE'),
    },
    {
      name: 'Elevate Wholesale - Supabase',
      vars: ['ELEVATE_SUPABASE_URL', 'ELEVATE_SUPABASE_SERVICE_ROLE_KEY'],
      test: () => verifySupabase('ELEVATE'),
    },

    // Red Hill Fresh
    {
      name: 'Red Hill Fresh - BigCommerce',
      vars: ['RHF_BC_STORE_HASH', 'RHF_BC_ACCESS_TOKEN', 'RHF_BC_CLIENT_ID'],
      test: () => verifyBigCommerce('RHF'),
    },
    {
      name: 'Red Hill Fresh - Supabase',
      vars: ['RHF_SUPABASE_URL', 'RHF_SUPABASE_SERVICE_ROLE_KEY'],
      test: () => verifySupabase('RHF'),
    },

    // Shared Services
    {
      name: 'Shared Supabase',
      vars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
      test: async () => {
        const url = process.env.SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!url || !key) return false

        try {
          const response = await fetch(`${url}/rest/v1/`, {
            headers: { apikey: key, Authorization: `Bearer ${key}` },
          })
          return response.ok || response.status === 404
        } catch {
          return false
        }
      },
    },
    {
      name: 'N8N Workflow Automation',
      vars: ['N8N_BASE_URL', 'N8N_API_KEY'],
      test: verifyN8N,
    },
    {
      name: 'HubSpot CRM',
      vars: ['HUBSPOT_ACCESS_TOKEN'],
      test: verifyHubSpot,
    },
    {
      name: 'SmartLead',
      vars: ['SMARTLEAD_API_KEY'],
    },
    {
      name: 'AWS RDS (Newsync6)',
      vars: [
        'AWS_RDS_NEWSYNC6_HOST',
        'AWS_RDS_NEWSYNC6_USER',
        'AWS_RDS_NEWSYNC6_PASSWORD',
      ],
    },
    {
      name: 'Slack Notifications',
      vars: ['SLACK_WEBHOOK_URL'],
    },
    {
      name: 'Email Alerts',
      vars: ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'],
    },
  ]

  let totalPassed = 0
  let totalFailed = 0
  let totalSkipped = 0

  for (const check of checks) {
    const { missing, present } = checkEnvVars(check.vars)

    // Check if credentials are present
    if (missing.length === check.vars.length) {
      // All missing - skip
      log(`⊘ ${check.name}`, colors.gray)
      log(`  Not configured (skipped)\n`, colors.gray)
      totalSkipped++
      continue
    }

    if (missing.length > 0) {
      // Some missing
      log(`⚠ ${check.name}`, colors.yellow)
      log(`  Missing: ${missing.join(', ')}`, colors.yellow)
      log(`  Present: ${present.join(', ')}\n`, colors.gray)
      totalFailed++
      continue
    }

    // All present - now test connection if test function provided
    if (check.test) {
      process.stdout.write(`⏳ ${check.name}... `)

      try {
        const connected = await check.test()

        if (connected) {
          log(`✅ Connected`, colors.green)
          totalPassed++
        } else {
          log(`❌ Failed to connect`, colors.red)
          totalFailed++
        }
      } catch (error: any) {
        log(`❌ Error: ${error.message}`, colors.red)
        totalFailed++
      }
    } else {
      log(`✓ ${check.name}`, colors.green)
      log(`  All credentials present (no connectivity test available)\n`, colors.gray)
      totalPassed++
    }
  }

  log('\n' + '='.repeat(80), colors.gray)
  log('\n📊 Summary:\n', colors.cyan)
  log(`  ✅ Passed: ${totalPassed}`, colors.green)
  log(`  ❌ Failed: ${totalFailed}`, colors.red)
  log(`  ⊘  Skipped: ${totalSkipped}`, colors.gray)
  log(`  Total: ${checks.length}\n`, colors.cyan)

  if (totalFailed > 0) {
    log('❌ Some credentials are missing or invalid', colors.red)
    log('   Please update MASTER-CREDENTIALS-COMPLETE.env\n', colors.yellow)
    process.exit(1)
  } else if (totalPassed === 0) {
    log('⚠️  No credentials configured', colors.yellow)
    log('   Please fill out MASTER-CREDENTIALS-COMPLETE.env\n', colors.yellow)
    process.exit(1)
  } else {
    log('✅ All configured credentials are valid!\n', colors.green)
    process.exit(0)
  }
}

main().catch((error) => {
  log(`\n❌ Fatal Error: ${error.message}\n`, colors.red)
  process.exit(1)
})
