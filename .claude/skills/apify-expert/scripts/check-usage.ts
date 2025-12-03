/**
 * Check Apify Usage
 *
 * Quick script to check current Apify spend vs monthly budget.
 *
 * Usage:
 *   npx tsx check-usage.ts
 */

import * as https from 'https'
import { execSync } from 'child_process'
import * as path from 'path'

async function getApifyToken(): Promise<string> {
  // Try environment first
  if (process.env.APIFY_TOKEN) {
    return process.env.APIFY_TOKEN
  }

  // Try to load from vault
  try {
    const repoRoot = path.resolve(__dirname, '../../../../')
    const token = execSync('node creds.js get global apify_token', {
      cwd: repoRoot,
      encoding: 'utf8'
    }).trim()
    return token
  } catch (e) {
    throw new Error('Could not load APIFY_TOKEN from vault. Run: node creds.js get global apify_token')
  }
}

async function fetchUsage(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.apify.com',
      path: '/v2/users/me/limits',
      headers: { 'Authorization': `Bearer ${token}` }
    }

    https.get(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`))
        }
      })
    }).on('error', reject)
  })
}

async function main() {
  console.log('\n🔍 Checking Apify Usage...\n')

  const token = await getApifyToken()
  const response = await fetchUsage(token)

  if (!response.data) {
    console.error('❌ Failed to get usage data:', response)
    process.exit(1)
  }

  const { limits, current, monthlyUsageCycle } = response.data

  // Calculate values
  const spent = current.monthlyUsageUsd
  const budget = limits.maxMonthlyUsageUsd
  const remaining = budget - spent
  const percentUsed = (spent / budget) * 100

  // Estimate leads (at ~$0.007/lead)
  const estimatedLeadsRemaining = Math.floor(remaining / 0.007)

  // Days remaining in cycle
  const cycleEnd = new Date(monthlyUsageCycle.endAt)
  const daysRemaining = Math.ceil((cycleEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  // Progress bar
  const barWidth = 30
  const filledBars = Math.round((percentUsed / 100) * barWidth)
  const progressBar = '█'.repeat(filledBars) + '░'.repeat(barWidth - filledBars)

  console.log('══════════════════════════════════════════════════')
  console.log('           APIFY MONTHLY USAGE REPORT')
  console.log('══════════════════════════════════════════════════')
  console.log()
  console.log(`  Budget:    $${budget.toFixed(2)}/month`)
  console.log(`  Spent:     $${spent.toFixed(4)}`)
  console.log(`  Remaining: $${remaining.toFixed(2)}`)
  console.log()
  console.log(`  [${progressBar}] ${percentUsed.toFixed(1)}%`)
  console.log()
  console.log('──────────────────────────────────────────────────')
  console.log()
  console.log(`  📅 Billing Cycle:`)
  console.log(`     ${new Date(monthlyUsageCycle.startAt).toLocaleDateString()} → ${cycleEnd.toLocaleDateString()}`)
  console.log(`     ${daysRemaining} days remaining`)
  console.log()
  console.log(`  📊 Estimated Capacity:`)
  console.log(`     ~${estimatedLeadsRemaining.toLocaleString()} Google Maps leads remaining`)
  console.log(`     (at ~$0.007 per lead)`)
  console.log()

  // Recommendations
  if (percentUsed < 10 && daysRemaining < 20) {
    console.log('  ⚠️  UNDER-UTILIZED: Consider running more scrapes!')
    console.log(`     Daily budget available: $${(remaining / daysRemaining).toFixed(2)}/day`)
  } else if (percentUsed > 80) {
    console.log('  ⚠️  HIGH USAGE: Monitor spend carefully')
  } else {
    console.log('  ✅ Usage on track')
  }

  console.log()
  console.log('══════════════════════════════════════════════════')
  console.log()

  // Return data for programmatic use
  return {
    spent,
    budget,
    remaining,
    percentUsed,
    daysRemaining,
    estimatedLeadsRemaining
  }
}

main()
  .then(data => {
    if (data.percentUsed < 5) {
      console.log('💡 TIP: Run some lead scrapes to utilize your budget!')
      console.log('   npx tsx apify-client.ts scrape "gyms Sydney Australia"')
    }
  })
  .catch(err => {
    console.error('❌ Error:', err.message)
    process.exit(1)
  })
