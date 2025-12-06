#!/usr/bin/env npx tsx
/**
 * ATO Ruling Full-Text Fetcher
 *
 * Fetches the full content of ATO rulings from their web pages
 * and stores them in the ato_rulings.full_text column.
 *
 * Usage:
 *   npx tsx infra/scripts/fetch-ruling-fulltext.ts [options]
 *
 * Options:
 *   --dry-run        Preview without updating database
 *   --verbose        Show detailed output
 *   --ruling=ID      Fetch specific ruling (e.g., --ruling="TR 2024/1")
 *   --limit=N        Limit number of rulings to fetch (default: 10)
 *   --pending-only   Only fetch rulings with status 'pending' or 'relevant'
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })
dotenv.config({ path: path.join(__dirname, '..', '..', 'dashboard', '.env.local') })

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  console.error('ERROR: Missing SUPABASE_URL environment variable')
  process.exit(1)
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  process.exit(1)
}

interface FetchConfig {
  dryRun: boolean
  verbose: boolean
  rulingId: string | null
  limit: number
  pendingOnly: boolean
}

interface FetchResult {
  ruling_id: string
  success: boolean
  content_length: number
  error_message?: string
}

// ============================================================================
// CONTENT EXTRACTION
// ============================================================================

/**
 * Fetch and extract ruling content from ATO website
 */
async function fetchRulingPage(url: string, verbose: boolean): Promise<string | null> {
  if (verbose) {
    console.log(`    Fetching: ${url}`)
  }

  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GrowthCo-ATO-Sync/1.0)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    })

    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`HTTP ${error.response?.status || 'error'}: ${error.message}`)
    }
    throw error
  }
}

/**
 * Extract ruling content from HTML page
 * Removes navigation, headers, footers, and other non-content elements
 */
function extractRulingContent(html: string): string {
  const $ = cheerio.load(html)

  // Remove unwanted elements
  $('header').remove()
  $('footer').remove()
  $('nav').remove()
  $('script').remove()
  $('style').remove()
  $('.breadcrumb').remove()
  $('.sidebar').remove()
  $('.social').remove()
  $('[role="navigation"]').remove()
  $('[role="banner"]').remove()
  $('[role="contentinfo"]').remove()

  // Try to find main content area
  let content = ''

  // ATO pages typically have main content in article or main element
  const mainContent = $('article, main, [role="main"], .content, #main-content').first()

  if (mainContent.length > 0) {
    content = mainContent.text()
  } else {
    // Fallback: get body content
    content = $('body').text()
  }

  // Clean up the text
  content = content
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/\n\s*\n/g, '\n\n')    // Normalize paragraph breaks
    .replace(/^\s+|\s+$/g, '')      // Trim
    .replace(/\t/g, ' ')            // Replace tabs with spaces

  return content
}

/**
 * Extract structured sections from ruling content
 * Returns a cleaner, more organized version
 */
function structureRulingContent(rawContent: string, rulingId: string): string {
  // Common section headers in ATO rulings
  const sections = [
    'What this (Ruling|Determination) is about',
    'Ruling',
    'Date of effect',
    'Appendix',
    'Legislative references',
    'Related Rulings',
    'Examples?'
  ]

  // Try to identify and preserve section structure
  let structured = rawContent

  // Remove excessive whitespace while preserving paragraph structure
  structured = structured
    .split(/\n{2,}/)
    .map(para => para.trim())
    .filter(para => para.length > 0)
    .join('\n\n')

  // Add ruling ID as header if not present
  if (!structured.startsWith(rulingId)) {
    structured = `${rulingId}\n\n${structured}`
  }

  return structured
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Get rulings that need full-text fetching
 */
async function getRulingsToFetch(
  supabase: SupabaseClient,
  config: FetchConfig
): Promise<{ ruling_id: string; url: string; title: string }[]> {
  let query = supabase
    .from('ato_rulings')
    .select('ruling_id, url, title')
    .is('full_text', null)  // Only rulings without full_text

  if (config.pendingOnly) {
    query = query.in('relevance_status', ['pending', 'relevant'])
  }

  if (config.rulingId) {
    query = query.eq('ruling_id', config.rulingId)
  }

  query = query.limit(config.limit)

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get rulings: ${error.message}`)
  }

  return data || []
}

/**
 * Update ruling with full-text content
 */
async function updateRulingFullText(
  supabase: SupabaseClient,
  rulingId: string,
  fullText: string,
  dryRun: boolean
): Promise<void> {
  if (dryRun) return

  const { error } = await supabase
    .from('ato_rulings')
    .update({
      full_text: fullText,
      metadata: {
        full_text_fetched_at: new Date().toISOString(),
        full_text_length: fullText.length
      }
    })
    .eq('ruling_id', rulingId)

  if (error) {
    throw new Error(`Failed to update ruling: ${error.message}`)
  }
}

/**
 * Log fetch operation to sync log
 */
async function logFetch(
  supabase: SupabaseClient,
  results: FetchResult[],
  dryRun: boolean
): Promise<void> {
  if (dryRun) return

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  await supabase.from('ato_sync_log').insert({
    feed_url: 'full_text_fetch',
    sync_type: 'full_text',
    rulings_found: results.length,
    rulings_added: 0,
    rulings_updated: successful,
    error_message: failed > 0 ? `${failed} rulings failed to fetch` : null,
    completed_at: new Date().toISOString()
  })
}

// ============================================================================
// MAIN FETCH FUNCTION
// ============================================================================

async function fetchAllFullText(config: FetchConfig): Promise<void> {
  console.log('\n=================================================')
  console.log('  ATO Ruling Full-Text Fetcher')
  console.log('=================================================')
  console.log(`  Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`  Limit: ${config.limit}`)
  console.log(`  Pending only: ${config.pendingOnly}`)
  if (config.rulingId) {
    console.log(`  Specific ruling: ${config.rulingId}`)
  }
  console.log('=================================================\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Get rulings to fetch
  const rulings = await getRulingsToFetch(supabase, config)

  if (rulings.length === 0) {
    console.log('No rulings need full-text fetching.')
    return
  }

  console.log(`Found ${rulings.length} rulings to fetch:\n`)

  const results: FetchResult[] = []

  for (const ruling of rulings) {
    console.log(`  [${ruling.ruling_id}] ${ruling.title}`)

    const result: FetchResult = {
      ruling_id: ruling.ruling_id,
      success: false,
      content_length: 0
    }

    try {
      // Fetch the page
      const html = await fetchRulingPage(ruling.url, config.verbose)

      if (!html) {
        throw new Error('Empty response from ATO website')
      }

      // Extract content
      const rawContent = extractRulingContent(html)
      const structuredContent = structureRulingContent(rawContent, ruling.ruling_id)

      if (structuredContent.length < 100) {
        throw new Error('Content too short - possible extraction failure')
      }

      result.content_length = structuredContent.length
      result.success = true

      // Update database
      await updateRulingFullText(supabase, ruling.ruling_id, structuredContent, config.dryRun)

      console.log(`    ✓ Fetched ${result.content_length.toLocaleString()} characters`)

      if (config.verbose) {
        // Show preview
        const preview = structuredContent.substring(0, 200).replace(/\n/g, ' ')
        console.log(`    Preview: ${preview}...`)
      }

    } catch (error) {
      result.error_message = error instanceof Error ? error.message : String(error)
      console.log(`    ✗ Error: ${result.error_message}`)
    }

    results.push(result)

    // Rate limiting - be nice to ATO servers
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Log results
  await logFetch(supabase, results, config.dryRun)

  // Summary
  console.log('\n=================================================')
  console.log('  FETCH SUMMARY')
  console.log('=================================================')

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  const totalChars = successful.reduce((sum, r) => sum + r.content_length, 0)

  console.log(`  Total rulings:   ${results.length}`)
  console.log(`  Successful:      ${successful.length}`)
  console.log(`  Failed:          ${failed.length}`)
  console.log(`  Total content:   ${totalChars.toLocaleString()} characters`)

  if (failed.length > 0) {
    console.log('\n  Failed rulings:')
    for (const f of failed) {
      console.log(`    - ${f.ruling_id}: ${f.error_message}`)
    }
  }

  if (config.dryRun) {
    console.log('\n  [DRY RUN] No changes were made to the database')
  }

  console.log('=================================================\n')
}

// ============================================================================
// CLI
// ============================================================================

function parseArgs(): FetchConfig {
  const args = process.argv.slice(2)
  const config: FetchConfig = {
    dryRun: false,
    verbose: false,
    rulingId: null,
    limit: 10,
    pendingOnly: false
  }

  for (const arg of args) {
    if (arg === '--dry-run') {
      config.dryRun = true
    } else if (arg === '--verbose') {
      config.verbose = true
    } else if (arg === '--pending-only') {
      config.pendingOnly = true
    } else if (arg.startsWith('--ruling=')) {
      config.rulingId = arg.split('=')[1]
    } else if (arg.startsWith('--limit=')) {
      config.limit = parseInt(arg.split('=')[1], 10)
    }
  }

  return config
}

// Run
const config = parseArgs()
fetchAllFullText(config)
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
