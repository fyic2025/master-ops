#!/usr/bin/env npx tsx
/**
 * Backfill Business Tags for Existing ATO Rulings
 *
 * Tags existing rulings with applicable_businesses based on their content.
 * Run after deploying the 20251206_ato_business_tagging.sql migration.
 *
 * Usage:
 *   npx tsx infra/scripts/backfill-ruling-businesses.ts [options]
 *
 * Options:
 *   --dry-run    Preview without updating database
 *   --verbose    Show detailed output
 *   --limit=N    Limit number of rulings to process (default: all)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
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

interface BackfillConfig {
  dryRun: boolean
  verbose: boolean
  limit: number | null
}

// ============================================================================
// BUSINESS TAGGING (copied from sync-ato-rulings.ts for standalone use)
// ============================================================================

type BusinessSlug = 'teelixir' | 'boo' | 'elevate' | 'rhf'

function tagApplicableBusinesses(title: string, summary: string, rulingType: string): BusinessSlug[] {
  const text = `${title} ${summary}`.toLowerCase()
  const businesses = new Set<BusinessSlug>()

  // GST rulings apply to all businesses
  if (rulingType === 'GSTR' || rulingType === 'GSTD' || text.includes('gst')) {
    businesses.add('teelixir')
    businesses.add('boo')
    businesses.add('elevate')
    businesses.add('rhf')
    return Array.from(businesses)
  }

  // Trust-specific → BOO only
  if (text.includes('trust') && !text.includes('company')) {
    businesses.add('boo')
  }

  // Company-specific → Teelixir, Elevate, RHF
  if (text.includes('company') || text.includes('corporation') || text.includes('private company')) {
    businesses.add('teelixir')
    businesses.add('elevate')
    businesses.add('rhf')
  }

  // Food/produce → RHF, BOO
  if (text.includes('food') || text.includes('fresh produce') || text.includes('perishable') ||
      text.includes('grocery') || text.includes('catering')) {
    businesses.add('rhf')
    businesses.add('boo')
  }

  // Wholesale/B2B → Elevate
  if (text.includes('wholesale') || text.includes('b2b') || text.includes('reseller') ||
      text.includes('distributor')) {
    businesses.add('elevate')
  }

  // Health products/supplements → Teelixir, BOO
  if (text.includes('health product') || text.includes('supplement') || text.includes('therapeutic') ||
      text.includes('medicinal') || text.includes('nutraceutical') || text.includes('adaptogen')) {
    businesses.add('teelixir')
    businesses.add('boo')
  }

  // Retail/e-commerce → All businesses
  if (text.includes('retail') || text.includes('e-commerce') || text.includes('online sales') ||
      text.includes('online store') || text.includes('web sales')) {
    businesses.add('teelixir')
    businesses.add('boo')
    businesses.add('elevate')
    businesses.add('rhf')
  }

  // Small business concessions → All businesses
  if (text.includes('small business') || text.includes('sbe') || text.includes('aggregated turnover')) {
    businesses.add('teelixir')
    businesses.add('boo')
    businesses.add('elevate')
    businesses.add('rhf')
  }

  // Employment/PAYG/Super → All businesses
  if (text.includes('employee') || text.includes('wages') || text.includes('payg') ||
      text.includes('superannuation') || text.includes('super guarantee') ||
      text.includes('fringe benefit') || text.includes('fbt')) {
    businesses.add('teelixir')
    businesses.add('boo')
    businesses.add('elevate')
    businesses.add('rhf')
  }

  // Trading stock → All
  if (text.includes('trading stock') || text.includes('inventory') || text.includes('stock on hand')) {
    businesses.add('teelixir')
    businesses.add('boo')
    businesses.add('elevate')
    businesses.add('rhf')
  }

  // Delivery/logistics → RHF primary
  if (text.includes('delivery') || text.includes('freight') || text.includes('shipping')) {
    businesses.add('rhf')
  }

  // Default: Apply to all
  if (businesses.size === 0) {
    businesses.add('teelixir')
    businesses.add('boo')
    businesses.add('elevate')
    businesses.add('rhf')
  }

  return Array.from(businesses).sort()
}

// ============================================================================
// MAIN BACKFILL FUNCTION
// ============================================================================

async function backfillBusinessTags(config: BackfillConfig): Promise<void> {
  console.log('\n=================================================')
  console.log('  ATO Rulings Business Tag Backfill')
  console.log('=================================================')
  console.log(`  Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE'}`)
  if (config.limit) {
    console.log(`  Limit: ${config.limit}`)
  }
  console.log('=================================================\n')

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

  // Get rulings that need tagging (empty or null applicable_businesses)
  let query = supabase
    .from('ato_rulings')
    .select('ruling_id, ruling_type, title, summary')
    .or('applicable_businesses.is.null,applicable_businesses.eq.{}')
    .order('publication_date', { ascending: false })

  if (config.limit) {
    query = query.limit(config.limit)
  }

  const { data: rulings, error } = await query

  if (error) {
    console.error('Failed to get rulings:', error.message)
    process.exit(1)
  }

  if (!rulings || rulings.length === 0) {
    console.log('No rulings need business tagging.')
    return
  }

  console.log(`Found ${rulings.length} rulings to tag:\n`)

  let updated = 0
  let failed = 0
  const businessCounts: Record<string, number> = {
    teelixir: 0,
    boo: 0,
    elevate: 0,
    rhf: 0
  }

  for (const ruling of rulings) {
    const businesses = tagApplicableBusinesses(
      ruling.title || '',
      ruling.summary || '',
      ruling.ruling_type
    )

    // Update counts
    for (const b of businesses) {
      businessCounts[b]++
    }

    if (config.verbose) {
      console.log(`  ${ruling.ruling_id}: [${businesses.join(', ')}]`)
    }

    if (!config.dryRun) {
      const { error: updateError } = await supabase
        .from('ato_rulings')
        .update({ applicable_businesses: businesses })
        .eq('ruling_id', ruling.ruling_id)

      if (updateError) {
        console.error(`  Failed to update ${ruling.ruling_id}: ${updateError.message}`)
        failed++
      } else {
        updated++
      }
    } else {
      updated++
    }
  }

  // Summary
  console.log('\n=================================================')
  console.log('  BACKFILL SUMMARY')
  console.log('=================================================')
  console.log(`  Total processed: ${rulings.length}`)
  console.log(`  Updated:         ${updated}`)
  console.log(`  Failed:          ${failed}`)
  console.log('')
  console.log('  Rulings per business:')
  console.log(`    Teelixir: ${businessCounts.teelixir}`)
  console.log(`    BOO:      ${businessCounts.boo}`)
  console.log(`    Elevate:  ${businessCounts.elevate}`)
  console.log(`    RHF:      ${businessCounts.rhf}`)

  if (config.dryRun) {
    console.log('\n  [DRY RUN] No changes were made to the database')
  }

  console.log('=================================================\n')
}

// ============================================================================
// CLI
// ============================================================================

function parseArgs(): BackfillConfig {
  const args = process.argv.slice(2)
  const config: BackfillConfig = {
    dryRun: false,
    verbose: false,
    limit: null
  }

  for (const arg of args) {
    if (arg === '--dry-run') {
      config.dryRun = true
    } else if (arg === '--verbose') {
      config.verbose = true
    } else if (arg.startsWith('--limit=')) {
      config.limit = parseInt(arg.split('=')[1], 10)
    }
  }

  return config
}

// Run
const config = parseArgs()
backfillBusinessTags(config)
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
