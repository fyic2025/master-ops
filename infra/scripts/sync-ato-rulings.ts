#!/usr/bin/env npx tsx
/**
 * ATO Rulings RSS Feed Sync
 *
 * Fetches new rulings from ATO RSS feeds and stores them in Supabase.
 * Designed to run daily via n8n workflow.
 *
 * Usage:
 *   npx tsx infra/scripts/sync-ato-rulings.ts [options]
 *
 * Options:
 *   --dry-run    Preview without inserting
 *   --verbose    Show detailed output
 *   --feed=NAME  Sync specific feed only (tax, gst, super, all)
 *
 * RSS Feeds:
 *   - pbr_tax.rss    Taxation Rulings (TR, TD)
 *   - pbr_gst.rss    GST Rulings (GSTR, GSTD)
 *   - pbr_super.rss  Superannuation Rulings (SGR)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env files
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })
dotenv.config({ path: path.join(__dirname, '..', '..', 'dashboard', '.env.local') })

// ============================================================================
// CONFIGURATION
// ============================================================================

// SECURITY: Credentials must be provided via environment variables
// See: creds.js and elevate-customer-sync.ts for reference
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  console.error('ERROR: Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable')
  console.error('Set in .env file or run: node creds.js export global')
  process.exit(1)
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  console.error('Set in .env file or run: node creds.js export global')
  process.exit(1)
}

const ATO_BASE_URL = 'https://www.ato.gov.au'

interface RssFeedConfig {
  name: string
  url: string
  defaultType: string
}

// Primary feed for daily sync (captures all ruling types)
const RSS_FEEDS: RssFeedConfig[] = [
  {
    name: 'all',
    url: `${ATO_BASE_URL}/law/view/rss?fileid=pbr_all.rss`,
    defaultType: 'TR'
  }
]

// Additional feeds available for targeted queries (not used in default sync to avoid duplicates)
// - pbr_tax.rss: Taxation Rulings (TR, TD)
// - pbr_gst.rss: GST Rulings (GSTR, GSTD)
// - pbr_super.rss: Superannuation Rulings (SGR)

interface RssItem {
  title: string
  link: string
  description: string
  pubDate: string
}

interface AtoRuling {
  ruling_id: string
  ruling_type: string
  title: string
  publication_date: string
  summary: string
  url: string
}

interface SyncResult {
  feed: string
  success: boolean
  rulings_found: number
  rulings_filtered: number  // Skipped as not relevant
  rulings_added: number
  rulings_updated: number
  rulings_archived: number  // Superseded rulings archived
  error_message?: string
}

interface SyncConfig {
  dryRun: boolean
  verbose: boolean
  feedFilter: string | null
}

// ============================================================================
// RSS PARSING
// ============================================================================

/**
 * Fetch and parse an RSS feed
 */
async function fetchRssFeed(feedConfig: RssFeedConfig, verbose: boolean): Promise<RssItem[]> {
  if (verbose) {
    console.log(`  Fetching ${feedConfig.url}`)
  }

  const response = await axios.get(feedConfig.url, {
    timeout: 30000,
    headers: {
      'User-Agent': 'GrowthCo-ATO-Sync/1.0',
      'Accept': 'application/rss+xml, application/xml, text/xml'
    }
  })

  const $ = cheerio.load(response.data, { xmlMode: true })
  const items: RssItem[] = []

  $('item').each((_, element) => {
    const item: RssItem = {
      title: $(element).find('title').text().trim(),
      link: $(element).find('link').text().trim(),
      description: $(element).find('description').text().trim(),
      pubDate: $(element).find('pubDate').text().trim()
    }

    if (item.title && item.link) {
      items.push(item)
    }
  })

  return items
}

/**
 * Extract ruling ID and type from title
 * Examples: "TR 2024/1", "GSTR 2020/1", "TD 2024/4", "PCG 2024/1"
 */
function parseRulingId(title: string): { ruling_id: string; ruling_type: string } | null {
  // Match patterns like "TR 2024/1", "GSTR 2020/1", "TD 2024/4", "PCG 2024/1", "LCR 2024/1"
  // Also handles addenda like "TR 2006/10A7 - Addendum"
  const match = title.match(/^(TR|TD|GSTR|GSTD|PCG|LCR|MT|SGR|CR|PR|PS LA)\s*(\d{4}\/\d+[A-Z]?\d*)/i)

  if (match) {
    const ruling_type = match[1].toUpperCase()
    const ruling_id = `${ruling_type} ${match[2]}`
    return { ruling_id, ruling_type }
  }

  return null
}

/**
 * Parse RSS date to ISO format
 * Example: "Wed, 03 Dec 2025 00:00:00 +1100" -> "2025-12-03"
 */
function parseRssDate(dateStr: string): string {
  // Handle empty or missing date strings
  if (!dateStr || dateStr.trim() === '') {
    return new Date().toISOString().split('T')[0]
  }

  try {
    const date = new Date(dateStr)
    // Check for Invalid Date (NaN check)
    if (isNaN(date.getTime())) {
      console.warn(`  Warning: Invalid date "${dateStr}", using today's date`)
      return new Date().toISOString().split('T')[0]
    }
    return date.toISOString().split('T')[0]
  } catch {
    // Fallback to today's date if parsing fails
    return new Date().toISOString().split('T')[0]
  }
}

/**
 * Clean description text (remove HTML entities, extra whitespace)
 */
function cleanDescription(description: string): string {
  return description
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/<[^>]*>/g, '') // Remove any HTML tags
    .replace(/\s+/g, ' ')
    .trim()
}

// ============================================================================
// RELEVANCE FILTERING
// ============================================================================

/**
 * Keywords that indicate a ruling is relevant to e-commerce/retail businesses
 */
const RELEVANT_KEYWORDS = [
  // GST (all businesses collect/remit)
  'gst', 'goods and services tax', 'taxable supply', 'input tax credit',
  'gst-free', 'gst free', 'tax invoice',
  // Small business
  'small business', 'simplified depreciation', 'instant asset write-off',
  'small business entity', 'aggregated turnover',
  // Trading stock / Inventory
  'trading stock', 'stock on hand', 'cost of goods', 'inventory',
  // Deductions
  'deduction', 'business expense', 'operating expense',
  // Depreciation
  'depreciation', 'capital allowance', 'effective life', 'asset write-off',
  // Employment
  'payg', 'withholding', 'superannuation', 'super guarantee', 'sgc',
  'employee', 'wages', 'salary',
  // FBT
  'fringe benefit', 'fbt', 'car fringe',
  // Home office
  'home office', 'working from home', 'home-based business',
  // Motor vehicle
  'motor vehicle', 'car expense', 'logbook', 'cents per kilometre',
  // Retail specific
  'retail', 'e-commerce', 'online sales', 'delivery',
  // Food (RHF relevant)
  'food', 'fresh produce', 'perishable',
  // Health products (Teelixir/BOO relevant)
  'health product', 'supplement', 'therapeutic'
]

/**
 * Keywords that indicate a ruling is NOT relevant (skip these)
 */
const IRRELEVANT_KEYWORDS = [
  // Division 7A - private company loans (not applicable)
  'division 7a', 'div 7a', 'private company loan',
  // International/Transfer pricing (no international entities)
  'transfer pricing', 'double tax agreement', 'foreign income',
  'controlled foreign', 'thin capitalisation',
  // Mining/Resources (not our industry)
  'mining', 'petroleum', 'resource rent',
  // Financial services (not our industry)
  'managed investment', 'financial arrangement', 'forex',
  // R&D (not applicable)
  'research and development', 'r&d tax',
  // Trusts - complex provisions (BOO is a trust but these are esoteric)
  'streaming', 'trust distribution', 'division 6',
  // CGT complex provisions
  'capital gains tax', 'cgt event', 'cgt discount',
  'rollover relief'
]

/**
 * Check if a ruling is relevant to our e-commerce/retail businesses
 * Returns true if ruling should be imported, false if it should be skipped
 */
function isRelevantTopic(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase()

  // First check for irrelevant keywords - these are dealbreakers
  for (const keyword of IRRELEVANT_KEYWORDS) {
    if (text.includes(keyword)) {
      return false
    }
  }

  // Then check for relevant keywords - need at least one match
  for (const keyword of RELEVANT_KEYWORDS) {
    if (text.includes(keyword)) {
      return true
    }
  }

  // GST rulings are always relevant (ruling type check)
  if (title.toUpperCase().startsWith('GSTR') || title.toUpperCase().startsWith('GSTD')) {
    return true
  }

  // If no keywords match either way, skip (conservative - only import what we need)
  return false
}

// ============================================================================
// SUPERSESSION DETECTION
// ============================================================================

/**
 * Parse supersession/withdrawal info from ruling description
 * Returns array of ruling IDs that are superseded/withdrawn, or null if none
 *
 * Examples:
 *   "This Ruling replaces TR 2020/1" -> ["TR 2020/1"]
 *   "Supersedes GSTR 2018/2 and GSTR 2018/3" -> ["GSTR 2018/2", "GSTR 2018/3"]
 *   "Withdrawal of TR 2015/3" -> ["TR 2015/3"]
 */
function parseSupersession(description: string): string[] | null {
  const text = description.toLowerCase()
  const superseded: string[] = []

  // Patterns for supersession/replacement/withdrawal
  const patterns = [
    /(?:replaces?|supersedes?|withdraws?|withdrawal of|consolidates?)\s+([A-Z]{2,4}\s*\d{4}\/\d+)/gi,
    /([A-Z]{2,4}\s*\d{4}\/\d+)\s+(?:is|has been)\s+(?:replaced|superseded|withdrawn)/gi
  ]

  for (const pattern of patterns) {
    const matches = description.matchAll(pattern)
    for (const match of matches) {
      // Extract the ruling ID and normalize it
      const rulingId = match[1].toUpperCase().replace(/\s+/g, ' ').trim()
      if (!superseded.includes(rulingId)) {
        superseded.push(rulingId)
      }
    }
  }

  return superseded.length > 0 ? superseded : null
}

/**
 * Archive rulings that have been superseded
 * Sets relevance_status to 'archived' and records superseded_by
 */
async function archiveSupersededRulings(
  supabase: SupabaseClient,
  newRulingId: string,
  supersededIds: string[],
  dryRun: boolean,
  verbose: boolean
): Promise<number> {
  if (dryRun || supersededIds.length === 0) {
    return supersededIds.length
  }

  let archived = 0

  for (const oldId of supersededIds) {
    const { error } = await supabase
      .from('ato_rulings')
      .update({
        relevance_status: 'archived',
        superseded_by: newRulingId,
        review_notes: `Superseded by ${newRulingId} on ${new Date().toISOString().split('T')[0]}`
      })
      .eq('ruling_id', oldId)
      .neq('relevance_status', 'archived') // Don't re-archive

    if (error) {
      if (verbose) {
        console.warn(`    Warning: Could not archive ${oldId}: ${error.message}`)
      }
    } else {
      archived++
      if (verbose) {
        console.log(`    Archived: ${oldId} (superseded by ${newRulingId})`)
      }
    }
  }

  return archived
}

/**
 * Transform RSS item to ATO ruling record
 */
function transformRssItem(item: RssItem, feedConfig: RssFeedConfig): AtoRuling | null {
  const parsed = parseRulingId(item.title)

  if (!parsed) {
    // Can't parse ruling ID from title
    return null
  }

  // Ensure URL is absolute
  let url = item.link
  if (url.startsWith('/')) {
    url = `${ATO_BASE_URL}${url}`
  }

  return {
    ruling_id: parsed.ruling_id,
    ruling_type: parsed.ruling_type,
    title: item.title,
    publication_date: parseRssDate(item.pubDate),
    summary: cleanDescription(item.description),
    url: url
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Upsert rulings to Supabase
 */
async function upsertRulings(
  supabase: SupabaseClient,
  rulings: AtoRuling[],
  dryRun: boolean
): Promise<{ added: number; updated: number }> {
  if (dryRun || rulings.length === 0) {
    return { added: rulings.length, updated: 0 }
  }

  // Check which rulings already exist
  const rulingIds = rulings.map(r => r.ruling_id)
  const { data: existing } = await supabase
    .from('ato_rulings')
    .select('ruling_id')
    .in('ruling_id', rulingIds)

  const existingIds = new Set(existing?.map(r => r.ruling_id) || [])

  // Separate new and existing
  const newRulings = rulings.filter(r => !existingIds.has(r.ruling_id))
  const updatedRulings = rulings.filter(r => existingIds.has(r.ruling_id))

  // Insert new rulings
  if (newRulings.length > 0) {
    const { error: insertError } = await supabase
      .from('ato_rulings')
      .insert(newRulings)

    if (insertError) {
      throw new Error(`Insert error: ${insertError.message}`)
    }
  }

  // Update existing rulings (summary might have changed)
  for (const ruling of updatedRulings) {
    const { error: updateError } = await supabase
      .from('ato_rulings')
      .update({
        title: ruling.title,
        summary: ruling.summary,
        url: ruling.url
      })
      .eq('ruling_id', ruling.ruling_id)

    if (updateError) {
      console.warn(`  Warning: Failed to update ${ruling.ruling_id}: ${updateError.message}`)
    }
  }

  return { added: newRulings.length, updated: updatedRulings.length }
}

/**
 * Log sync result to ato_sync_log
 */
async function logSync(
  supabase: SupabaseClient,
  result: SyncResult,
  feedUrl: string,
  dryRun: boolean
): Promise<void> {
  if (dryRun) return

  await supabase.from('ato_sync_log').insert({
    feed_url: feedUrl,
    sync_type: 'rss_poll',
    rulings_found: result.rulings_found,
    rulings_added: result.rulings_added,
    rulings_updated: result.rulings_updated,
    error_message: result.error_message || null,
    completed_at: new Date().toISOString()
  })
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

async function syncFeed(
  supabase: SupabaseClient,
  feedConfig: RssFeedConfig,
  config: SyncConfig
): Promise<SyncResult> {
  const result: SyncResult = {
    feed: feedConfig.name,
    success: false,
    rulings_found: 0,
    rulings_filtered: 0,
    rulings_added: 0,
    rulings_updated: 0,
    rulings_archived: 0
  }

  try {
    // Fetch RSS feed
    const items = await fetchRssFeed(feedConfig, config.verbose)
    result.rulings_found = items.length

    if (config.verbose) {
      console.log(`  Found ${items.length} items in feed`)
    }

    // Transform to rulings with relevance filtering
    const rulings: AtoRuling[] = []
    const supersessionMap: Map<string, string[]> = new Map() // newRulingId -> supersededIds

    for (const item of items) {
      const ruling = transformRssItem(item, feedConfig)

      if (!ruling) {
        if (config.verbose) {
          console.log(`    [Parse Error] Could not parse: ${item.title.substring(0, 60)}...`)
        }
        continue
      }

      // Check relevance - only import rulings that matter to our businesses
      if (!isRelevantTopic(item.title, item.description)) {
        result.rulings_filtered++
        if (config.verbose) {
          console.log(`    [Filtered] Not relevant: ${ruling.ruling_id}`)
        }
        continue
      }

      rulings.push(ruling)

      // Check for supersession
      const supersedes = parseSupersession(item.description)
      if (supersedes && supersedes.length > 0) {
        supersessionMap.set(ruling.ruling_id, supersedes)
        if (config.verbose) {
          console.log(`    ${ruling.ruling_id}: ${ruling.title.substring(0, 50)}...`)
          console.log(`      └─ Supersedes: ${supersedes.join(', ')}`)
        }
      } else if (config.verbose) {
        console.log(`    ${ruling.ruling_id}: ${ruling.title.substring(0, 60)}...`)
      }
    }

    if (config.verbose) {
      console.log(`  Relevant rulings: ${rulings.length} (filtered out: ${result.rulings_filtered})`)
    }

    // Upsert relevant rulings to database
    const { added, updated } = await upsertRulings(supabase, rulings, config.dryRun)
    result.rulings_added = added
    result.rulings_updated = updated

    // Process supersession - archive old rulings
    for (const [newId, supersededIds] of supersessionMap) {
      const archived = await archiveSupersededRulings(
        supabase,
        newId,
        supersededIds,
        config.dryRun,
        config.verbose
      )
      result.rulings_archived += archived
    }

    result.success = true

    // Log sync
    await logSync(supabase, result, feedConfig.url, config.dryRun)

  } catch (error) {
    result.error_message = error instanceof Error ? error.message : String(error)
    console.error(`  Error: ${result.error_message}`)

    // Log failed sync
    await logSync(supabase, result, feedConfig.url, config.dryRun)
  }

  return result
}

async function syncAllFeeds(config: SyncConfig): Promise<void> {
  console.log('\n=================================================')
  console.log('  ATO Rulings RSS Sync')
  console.log('=================================================')
  console.log(`  Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`  Feed filter: ${config.feedFilter || 'all'}`)
  console.log('=================================================\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Filter feeds if specified
  let feedsToSync = RSS_FEEDS
  if (config.feedFilter && config.feedFilter !== 'all') {
    feedsToSync = RSS_FEEDS.filter(f => f.name === config.feedFilter)
    if (feedsToSync.length === 0) {
      console.error(`Unknown feed: ${config.feedFilter}`)
      console.log('Available feeds: all')
      console.log('Note: "all" feed (pbr_all.rss) captures all ruling types')
      process.exit(1)
    }
  }

  const results: SyncResult[] = []

  for (const feedConfig of feedsToSync) {
    console.log(`\n[${feedConfig.name.toUpperCase()}] Syncing ${feedConfig.url}`)
    const result = await syncFeed(supabase, feedConfig, config)
    results.push(result)
  }

  // Summary
  console.log('\n=================================================')
  console.log('  SYNC SUMMARY')
  console.log('=================================================')

  let totalFound = 0
  let totalFiltered = 0
  let totalAdded = 0
  let totalUpdated = 0
  let totalArchived = 0
  let hasErrors = false

  for (const result of results) {
    const status = result.success ? '✓' : '✗'
    console.log(`  ${status} ${result.feed.toUpperCase()}:`)
    console.log(`      Found: ${result.rulings_found} | Filtered: ${result.rulings_filtered} | Added: ${result.rulings_added} | Updated: ${result.rulings_updated} | Archived: ${result.rulings_archived}`)

    if (result.error_message) {
      console.log(`      Error: ${result.error_message}`)
      hasErrors = true
    }

    totalFound += result.rulings_found
    totalFiltered += result.rulings_filtered
    totalAdded += result.rulings_added
    totalUpdated += result.rulings_updated
    totalArchived += result.rulings_archived
  }

  console.log('=================================================')
  console.log(`  TOTAL:`)
  console.log(`    Found in feed:    ${totalFound}`)
  console.log(`    Filtered (skip):  ${totalFiltered}`)
  console.log(`    Added (new):      ${totalAdded}`)
  console.log(`    Updated:          ${totalUpdated}`)
  console.log(`    Archived:         ${totalArchived}`)

  if (config.dryRun) {
    console.log('\n  [DRY RUN] No changes were made to the database')
  }

  console.log('=================================================\n')

  if (hasErrors) {
    process.exit(1)
  }
}

// ============================================================================
// CLI
// ============================================================================

function parseArgs(): SyncConfig {
  const args = process.argv.slice(2)
  const config: SyncConfig = {
    dryRun: false,
    verbose: false,
    feedFilter: null
  }

  for (const arg of args) {
    if (arg === '--dry-run') {
      config.dryRun = true
    } else if (arg === '--verbose') {
      config.verbose = true
    } else if (arg.startsWith('--feed=')) {
      config.feedFilter = arg.split('=')[1]
    }
  }

  return config
}

// Run
const config = parseArgs()
syncAllFeeds(config)
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
