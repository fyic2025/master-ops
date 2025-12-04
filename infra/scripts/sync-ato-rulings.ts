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
import * as path from 'path'

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

const ATO_BASE_URL = 'https://www.ato.gov.au'

interface RssFeedConfig {
  name: string
  url: string
  defaultType: string
}

const RSS_FEEDS: RssFeedConfig[] = [
  {
    name: 'tax',
    url: `${ATO_BASE_URL}/law/view/rss?fileid=pbr_tax.rss`,
    defaultType: 'TR'
  },
  {
    name: 'gst',
    url: `${ATO_BASE_URL}/law/view/rss?fileid=pbr_gst.rss`,
    defaultType: 'GSTR'
  },
  {
    name: 'super',
    url: `${ATO_BASE_URL}/law/view/rss?fileid=pbr_super.rss`,
    defaultType: 'SGR'
  }
]

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
  rulings_added: number
  rulings_updated: number
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
  try {
    const date = new Date(dateStr)
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
    rulings_added: 0,
    rulings_updated: 0
  }

  try {
    // Fetch RSS feed
    const items = await fetchRssFeed(feedConfig, config.verbose)
    result.rulings_found = items.length

    if (config.verbose) {
      console.log(`  Found ${items.length} items in feed`)
    }

    // Transform to rulings
    const rulings: AtoRuling[] = []
    for (const item of items) {
      const ruling = transformRssItem(item, feedConfig)
      if (ruling) {
        rulings.push(ruling)
        if (config.verbose) {
          console.log(`    ${ruling.ruling_id}: ${ruling.title.substring(0, 60)}...`)
        }
      } else if (config.verbose) {
        console.log(`    [Skipped] Could not parse: ${item.title.substring(0, 60)}...`)
      }
    }

    // Upsert to database
    const { added, updated } = await upsertRulings(supabase, rulings, config.dryRun)
    result.rulings_added = added
    result.rulings_updated = updated
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
      console.log('Available feeds: tax, gst, super, all')
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
  let totalAdded = 0
  let totalUpdated = 0
  let hasErrors = false

  for (const result of results) {
    const status = result.success ? '✓' : '✗'
    console.log(`  ${status} ${result.feed.toUpperCase()}: ${result.rulings_added} added, ${result.rulings_updated} updated (${result.rulings_found} found)`)

    if (result.error_message) {
      console.log(`    Error: ${result.error_message}`)
      hasErrors = true
    }

    totalFound += result.rulings_found
    totalAdded += result.rulings_added
    totalUpdated += result.rulings_updated
  }

  console.log('=================================================')
  console.log(`  TOTAL: ${totalAdded} added, ${totalUpdated} updated (${totalFound} found)`)

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
