#!/usr/bin/env npx tsx

/**
 * Klaviyo API Client - Multi-Account Support
 *
 * Command-line interface for Klaviyo operations across all businesses.
 *
 * Usage:
 *   ACCOUNT=boo npx tsx klaviyo-client.ts profiles --search test@example.com
 *   ACCOUNT=teelixir npx tsx klaviyo-client.ts lists --list
 *   ACCOUNT=elevate npx tsx klaviyo-client.ts campaigns --recent
 *   npx tsx klaviyo-client.ts flows --list  # Uses default account (BOO)
 *
 * Accounts:
 *   boo      - Buy Organics Online (40K+ subscribers)
 *   teelixir - Teelixir (15K+ subscribers)
 *   elevate  - Elevate Wholesale (3K+ subscribers, B2B)
 */

// Account-specific API key mapping
const API_KEY_MAP: Record<string, string> = {
  boo: process.env.BOO_KLAVIYO_API_KEY || '',
  teelixir: process.env.TEELIXIR_KLAVIYO_API_KEY || '',
  elevate: process.env.ELEVATE_KLAVIYO_API_KEY || ''
}

// Determine which account to use
const account = (process.env.ACCOUNT || 'boo').toLowerCase()

if (!API_KEY_MAP[account]) {
  console.error(`\nError: Invalid account '${account}'`)
  console.error('Valid accounts: boo, teelixir, elevate\n')
  process.exit(1)
}

// Environment configuration
const config = {
  account: account,
  apiKey: API_KEY_MAP[account],
  revision: '2024-02-15',
  baseUrl: 'https://a.klaviyo.com/api'
}

const headers = {
  'Authorization': `Klaviyo-API-Key ${config.apiKey}`,
  'revision': config.revision,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}

// Interfaces
interface KlaviyoProfile {
  id: string
  attributes: {
    email: string
    phone_number?: string
    first_name?: string
    last_name?: string
    properties?: Record<string, any>
    created: string
    updated: string
  }
}

interface KlaviyoList {
  id: string
  attributes: {
    name: string
    created: string
    updated: string
  }
}

interface KlaviyoCampaign {
  id: string
  attributes: {
    name: string
    status: string
    send_time?: string
    created_at: string
  }
}

interface KlaviyoFlow {
  id: string
  attributes: {
    name: string
    status: string
    created: string
    updated: string
  }
}

// API Functions
async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = endpoint.startsWith('http') ? endpoint : `${config.baseUrl}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers }
  })

  // Handle rate limiting
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '1')
    console.log(`Rate limited. Waiting ${retryAfter}s...`)
    await new Promise(r => setTimeout(r, retryAfter * 1000))
    return fetchAPI(endpoint, options)
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ errors: [{ detail: response.statusText }] }))
    const message = error.errors?.map((e: any) => e.detail).join('; ') || 'Unknown error'
    throw new Error(`API Error ${response.status}: ${message}`)
  }

  return response.json()
}

// Profile Operations
async function searchProfile(email: string): Promise<void> {
  const data = await fetchAPI(`/profiles?filter=equals(email,"${encodeURIComponent(email)}")`)

  console.log('\n👤 PROFILE SEARCH')
  console.log('='.repeat(60))

  if (!data.data || data.data.length === 0) {
    console.log(`No profile found for: ${email}`)
    return
  }

  const profile = data.data[0] as KlaviyoProfile

  console.log(`ID:         ${profile.id}`)
  console.log(`Email:      ${profile.attributes.email}`)
  console.log(`Name:       ${profile.attributes.first_name || ''} ${profile.attributes.last_name || ''}`.trim() || 'N/A')
  console.log(`Phone:      ${profile.attributes.phone_number || 'N/A'}`)
  console.log(`Created:    ${new Date(profile.attributes.created).toLocaleDateString()}`)
  console.log(`Updated:    ${new Date(profile.attributes.updated).toLocaleDateString()}`)

  if (profile.attributes.properties && Object.keys(profile.attributes.properties).length > 0) {
    console.log('\nCustom Properties:')
    Object.entries(profile.attributes.properties).forEach(([key, value]) => {
      console.log(`  ${key}: ${JSON.stringify(value)}`)
    })
  }
}

async function listRecentProfiles(limit = 20): Promise<void> {
  const data = await fetchAPI(`/profiles?page[size]=${limit}&sort=-created`)

  console.log('\n👥 RECENT PROFILES')
  console.log('='.repeat(80))

  data.data.forEach((profile: KlaviyoProfile) => {
    const name = `${profile.attributes.first_name || ''} ${profile.attributes.last_name || ''}`.trim()
    const date = new Date(profile.attributes.created).toLocaleDateString()
    console.log(
      `${date.padEnd(12)} ${profile.attributes.email.padEnd(35)} ${name || 'N/A'}`
    )
  })

  console.log(`\nShowing ${data.data.length} profiles`)
}

// List Operations
async function listLists(): Promise<void> {
  const data = await fetchAPI('/lists')

  console.log('\n📋 LISTS')
  console.log('='.repeat(60))

  data.data.forEach((list: KlaviyoList) => {
    const created = new Date(list.attributes.created).toLocaleDateString()
    console.log(`[${list.id.substring(0, 8)}...] ${list.attributes.name.padEnd(40)} Created: ${created}`)
  })

  console.log(`\nTotal: ${data.data.length} lists`)
}

async function getListDetails(listId: string): Promise<void> {
  const [listData, profilesData] = await Promise.all([
    fetchAPI(`/lists/${listId}`),
    fetchAPI(`/lists/${listId}/profiles?page[size]=10`)
  ])

  const list = listData.data as KlaviyoList

  console.log('\n📋 LIST DETAILS')
  console.log('='.repeat(60))
  console.log(`ID:       ${list.id}`)
  console.log(`Name:     ${list.attributes.name}`)
  console.log(`Created:  ${new Date(list.attributes.created).toLocaleDateString()}`)
  console.log(`Updated:  ${new Date(list.attributes.updated).toLocaleDateString()}`)

  if (profilesData.data.length > 0) {
    console.log('\nRecent Subscribers:')
    profilesData.data.forEach((profile: KlaviyoProfile) => {
      console.log(`  - ${profile.attributes.email}`)
    })
  }
}

// Campaign Operations
async function listCampaigns(status?: string): Promise<void> {
  let endpoint = '/campaigns?page[size]=20&sort=-created_at'
  if (status) {
    endpoint += `&filter=equals(status,"${status}")`
  }

  const data = await fetchAPI(endpoint)

  console.log('\n📧 CAMPAIGNS')
  console.log('='.repeat(80))

  const statusIcons: Record<string, string> = {
    draft: '📝',
    scheduled: '📅',
    sent: '✅',
    cancelled: '❌'
  }

  data.data.forEach((campaign: KlaviyoCampaign) => {
    const icon = statusIcons[campaign.attributes.status] || '○'
    const date = campaign.attributes.send_time
      ? new Date(campaign.attributes.send_time).toLocaleDateString()
      : 'Not scheduled'
    console.log(
      `${icon} ${campaign.attributes.name.substring(0, 45).padEnd(45)} ` +
      `${campaign.attributes.status.padEnd(12)} ${date}`
    )
  })

  console.log(`\nTotal: ${data.data.length} campaigns`)
}

// Flow Operations
async function listFlows(): Promise<void> {
  const data = await fetchAPI('/flows')

  console.log('\n🔄 FLOWS')
  console.log('='.repeat(80))

  const statusIcons: Record<string, string> = {
    live: '🟢',
    draft: '📝',
    manual: '🟡'
  }

  data.data.forEach((flow: KlaviyoFlow) => {
    const icon = statusIcons[flow.attributes.status] || '○'
    const updated = new Date(flow.attributes.updated).toLocaleDateString()
    console.log(
      `${icon} ${flow.attributes.name.substring(0, 45).padEnd(45)} ` +
      `${flow.attributes.status.padEnd(10)} Updated: ${updated}`
    )
  })

  console.log(`\nTotal: ${data.data.length} flows`)
}

// Segment Operations
async function listSegments(): Promise<void> {
  const data = await fetchAPI('/segments')

  console.log('\n🎯 SEGMENTS')
  console.log('='.repeat(60))

  data.data.forEach((segment: any) => {
    const created = new Date(segment.attributes.created).toLocaleDateString()
    console.log(`[${segment.id.substring(0, 8)}...] ${segment.attributes.name.padEnd(40)} Created: ${created}`)
  })

  console.log(`\nTotal: ${data.data.length} segments`)
}

// Metrics Operations
async function listMetrics(): Promise<void> {
  const data = await fetchAPI('/metrics')

  console.log('\n📊 METRICS')
  console.log('='.repeat(60))

  data.data.forEach((metric: any) => {
    console.log(`[${metric.id.substring(0, 8)}...] ${metric.attributes.name}`)
  })

  console.log(`\nTotal: ${data.data.length} metrics`)
}

// Track Event
async function trackEvent(email: string, event: string, properties: string): Promise<void> {
  let props = {}
  try {
    props = JSON.parse(properties)
  } catch {
    console.error('Invalid JSON properties')
    process.exit(1)
  }

  await fetchAPI('/events', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'event',
        attributes: {
          metric: {
            data: {
              type: 'metric',
              attributes: { name: event }
            }
          },
          profile: {
            data: {
              type: 'profile',
              attributes: { email }
            }
          },
          properties: props,
          time: new Date().toISOString()
        }
      }
    })
  })

  console.log(`\n✓ Event tracked: ${event} for ${email}`)
}

// Help
function showHelp(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║  Klaviyo CLI Client - Multi-Account Support                           ║
╚════════════════════════════════════════════════════════════════════════╝

Usage:
  ACCOUNT=<account> npx tsx klaviyo-client.ts <command> [options]

Accounts:
  boo      Buy Organics Online (40K+ subscribers, BigCommerce)
  teelixir Teelixir (15K+ subscribers, Shopify)
  elevate  Elevate Wholesale (3K+ subscribers, B2B Shopify)

Commands:
  profiles --search <email>   Search for profile by email
  profiles --recent [n]       List n recent profiles (default: 20)

  lists --list                List all lists
  lists --get <id>            Get list details

  campaigns --list            List recent campaigns
  campaigns --status <status> List campaigns by status (draft, scheduled, sent)

  flows --list                List all flows

  segments --list             List all segments

  metrics --list              List all metrics

  events --track <email> <event> <json>  Track custom event

Environment Variables:
  ACCOUNT                    Account to use (boo, teelixir, elevate) [default: boo]
  BOO_KLAVIYO_API_KEY       Buy Organics Online API key
  TEELIXIR_KLAVIYO_API_KEY  Teelixir API key
  ELEVATE_KLAVIYO_API_KEY   Elevate Wholesale API key

Examples:
  # BOO (default account)
  npx tsx klaviyo-client.ts profiles --search test@example.com
  ACCOUNT=boo npx tsx klaviyo-client.ts lists --list

  # Teelixir
  ACCOUNT=teelixir npx tsx klaviyo-client.ts campaigns --status sent
  ACCOUNT=teelixir npx tsx klaviyo-client.ts flows --list

  # Elevate Wholesale
  ACCOUNT=elevate npx tsx klaviyo-client.ts profiles --recent 10
  ACCOUNT=elevate npx tsx klaviyo-client.ts segments --list

  # Track custom event
  ACCOUNT=boo npx tsx klaviyo-client.ts events --track test@example.com "Custom Event" '{"value":100}'

Credential Loading:
  Load credentials from vault before running:

  node ../../../../creds.js load boo
  node ../../../../creds.js load teelixir
  node ../../../../creds.js load elevate
`)
}

// CLI
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (!config.apiKey) {
    console.error(`\nError: API key not found for account '${config.account}'`)
    console.error(`Please set ${config.account.toUpperCase()}_KLAVIYO_API_KEY environment variable`)
    console.error(`\nLoad credentials from vault:`)
    console.error(`  node ../../../../creds.js load ${config.account}\n`)
    process.exit(1)
  }

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp()
    process.exit(0)
  }

  // Display active account header
  const accountNames: Record<string, string> = {
    boo: 'Buy Organics Online',
    teelixir: 'Teelixir',
    elevate: 'Elevate Wholesale'
  }

  console.log('\n' + '═'.repeat(70))
  console.log(`  Account: ${accountNames[config.account]} (${config.account})`)
  console.log('═'.repeat(70))

  const command = args[0]
  const subcommand = args[1]

  try {
    switch (command) {
      case 'profiles':
        if (subcommand === '--search' && args[2]) {
          await searchProfile(args[2])
        } else if (subcommand === '--recent') {
          await listRecentProfiles(parseInt(args[2]) || 20)
        } else {
          console.error('Invalid profiles command. Use --help for usage.')
        }
        break

      case 'lists':
        if (subcommand === '--list') {
          await listLists()
        } else if (subcommand === '--get' && args[2]) {
          await getListDetails(args[2])
        } else {
          await listLists()
        }
        break

      case 'campaigns':
        if (subcommand === '--list') {
          await listCampaigns()
        } else if (subcommand === '--status' && args[2]) {
          await listCampaigns(args[2])
        } else {
          await listCampaigns()
        }
        break

      case 'flows':
        await listFlows()
        break

      case 'segments':
        await listSegments()
        break

      case 'metrics':
        await listMetrics()
        break

      case 'events':
        if (subcommand === '--track' && args[2] && args[3] && args[4]) {
          await trackEvent(args[2], args[3], args[4])
        } else {
          console.error('Invalid events command. Use --help for usage.')
        }
        break

      default:
        console.error(`Unknown command: ${command}`)
        showHelp()
        process.exit(1)
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
