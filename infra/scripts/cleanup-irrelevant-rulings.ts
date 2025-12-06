#!/usr/bin/env npx tsx
/**
 * Cleanup Irrelevant ATO Rulings
 *
 * Re-evaluates existing rulings against the relevance filter and:
 * - Marks irrelevant ones as 'not_relevant'
 * - Optionally deletes them with --delete flag
 *
 * Usage:
 *   npx tsx infra/scripts/cleanup-irrelevant-rulings.ts [options]
 *
 * Options:
 *   --dry-run    Preview without changes
 *   --delete     Delete irrelevant rulings (default: mark as not_relevant)
 *   --verbose    Show detailed output
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })
dotenv.config({ path: path.join(__dirname, '..', '..', 'dashboard', '.env.local') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Missing Supabase credentials')
  process.exit(1)
}

// Relevance filter (same as sync script)
const RELEVANT_KEYWORDS = [
  'gst', 'goods and services tax', 'taxable supply', 'input tax credit',
  'small business', 'simplified depreciation', 'instant asset write-off',
  'trading stock', 'deduction', 'depreciation', 'payg', 'superannuation',
  'fringe benefit', 'fbt', 'home office', 'motor vehicle', 'retail', 'food'
]

const IRRELEVANT_KEYWORDS = [
  'division 7a', 'transfer pricing', 'mining', 'petroleum',
  'managed investment', 'financial arrangement', 'r&d tax',
  'capital gains tax', 'cgt event', 'rollover relief'
]

function isRelevant(title: string, summary: string): boolean {
  const text = `${title} ${summary}`.toLowerCase()

  for (const kw of IRRELEVANT_KEYWORDS) {
    if (text.includes(kw)) return false
  }

  for (const kw of RELEVANT_KEYWORDS) {
    if (text.includes(kw)) return true
  }

  if (title.toUpperCase().startsWith('GSTR') || title.toUpperCase().startsWith('GSTD')) {
    return true
  }

  return false
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const deleteMode = args.includes('--delete')
  const verbose = args.includes('--verbose')

  console.log('\n=================================================')
  console.log('  ATO Rulings Cleanup')
  console.log('=================================================')
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`  Action: ${deleteMode ? 'DELETE irrelevant' : 'MARK as not_relevant'}`)
  console.log('=================================================\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Get all pending rulings (ones that haven't been reviewed)
  const { data: rulings, error } = await supabase
    .from('ato_rulings')
    .select('ruling_id, title, summary, relevance_status')
    .in('relevance_status', ['pending'])

  if (error) {
    console.error('Error fetching rulings:', error.message)
    process.exit(1)
  }

  if (!rulings || rulings.length === 0) {
    console.log('No pending rulings to evaluate.')
    return
  }

  console.log(`Evaluating ${rulings.length} pending rulings:\n`)

  const toKeep: string[] = []
  const toRemove: string[] = []

  for (const r of rulings) {
    const relevant = isRelevant(r.title, r.summary || '')

    if (relevant) {
      toKeep.push(r.ruling_id)
      if (verbose) console.log(`  ✓ KEEP: ${r.ruling_id}`)
    } else {
      toRemove.push(r.ruling_id)
      if (verbose) console.log(`  ✗ REMOVE: ${r.ruling_id}`)
    }
  }

  console.log(`\nResults:`)
  console.log(`  Keep (relevant): ${toKeep.length}`)
  console.log(`  Remove (irrelevant): ${toRemove.length}`)

  if (toRemove.length === 0) {
    console.log('\nNo irrelevant rulings to clean up.')
    return
  }

  if (!dryRun) {
    if (deleteMode) {
      // Delete irrelevant rulings
      const { error: delError } = await supabase
        .from('ato_rulings')
        .delete()
        .in('ruling_id', toRemove)

      if (delError) {
        console.error('Delete error:', delError.message)
      } else {
        console.log(`\nDeleted ${toRemove.length} irrelevant rulings.`)
      }
    } else {
      // Mark as not_relevant
      const { error: updError } = await supabase
        .from('ato_rulings')
        .update({
          relevance_status: 'not_relevant',
          review_notes: 'Auto-marked by cleanup script - did not match relevance filter'
        })
        .in('ruling_id', toRemove)

      if (updError) {
        console.error('Update error:', updError.message)
      } else {
        console.log(`\nMarked ${toRemove.length} rulings as not_relevant.`)
      }
    }

    // Mark relevant ones
    if (toKeep.length > 0) {
      await supabase
        .from('ato_rulings')
        .update({ relevance_status: 'relevant' })
        .in('ruling_id', toKeep)

      console.log(`Marked ${toKeep.length} rulings as relevant.`)
    }
  } else {
    console.log('\n[DRY RUN] No changes made.')
    console.log(`Would ${deleteMode ? 'delete' : 'mark as not_relevant'}: ${toRemove.join(', ')}`)
    console.log(`Would mark as relevant: ${toKeep.join(', ')}`)
  }

  console.log('\n=================================================\n')
}

main().catch(console.error)
