/**
 * Name-Based Account Mappings
 *
 * Maps Elevate accounts to Teelixir based on NAME similarity, not code.
 * This handles cases where the same account has different codes in each org.
 *
 * Usage:
 *   npx tsx scripts/financials/name-based-mappings.ts --preview
 *   npx tsx scripts/financials/name-based-mappings.ts --apply
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath })

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

interface Account {
  id: string
  code: string
  name: string
  account_type: string
  account_class: string | null
}

interface NameMapping {
  elevate: Account
  teelixir: Account | null
  nameSimilarity: number
  matchType: string
  reason: string
}

// Levenshtein distance
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

function nameSimilarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length)
  if (max === 0) return 100
  return Math.round((1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / max) * 100)
}

// Normalize name for matching (remove common variations)
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')  // Remove special chars
    .replace(/\s+/g, ' ')          // Collapse spaces
    .trim()
    .replace(/\b(a\/c|account|acc|acct)\b/g, '')  // Remove "account" variations
    .replace(/\b(expense|expenses)\b/g, 'expense')
    .replace(/\b(payable|payables)\b/g, 'payable')
    .replace(/\b(receivable|receivables)\b/g, 'receivable')
    .replace(/\bless\b/g, '')
    .trim()
}

// Check if two accounts are semantically similar
function containsKeywords(elevate: string, teelixir: string): number {
  const e = elevate.toLowerCase()
  const t = teelixir.toLowerCase()

  // Check for key word matches
  const keywords = [
    'cogs', 'cost of goods', 'inventory', 'stock',
    'freight', 'courier', 'shipping', 'postage',
    'computer', 'software', 'it', 'technology',
    'consulting', 'consultant', 'accounting', 'professional',
    'merchant', 'payment', 'fees', 'charges',
    'wages', 'salary', 'super', 'payroll', 'workers comp',
    'depreciation', 'amortisation', 'accumulated',
    'loan', 'borrowing', 'debt',
    'income tax', 'tax payable', 'gst', 'bas',
    'accrued', 'prepaid', 'prepayment',
    'motor vehicle', 'vehicle', 'car',
    'bank', 'cash', 'clearing',
    'owner', 'director', 'shareholder', 'capital',
    'rent', 'lease', 'occupancy',
    'insurance', 'workcover',
    'telephone', 'internet', 'communications',
    'travel', 'airfare', 'accommodation'
  ]

  let matchedKeywords = 0
  for (const kw of keywords) {
    if (e.includes(kw) && t.includes(kw)) {
      matchedKeywords++
    }
  }

  return matchedKeywords * 15  // 15% boost per matched keyword
}

function findBestNameMatch(elevate: Account, teelixirAccounts: Account[]): NameMapping {
  const eNorm = normalizeName(elevate.name)

  let bestMatch: Account | null = null
  let bestScore = 0
  let bestReason = ''

  for (const t of teelixirAccounts) {
    const tNorm = normalizeName(t.name)

    // Exact name match (ignoring case)
    if (elevate.name.toLowerCase() === t.name.toLowerCase()) {
      return {
        elevate,
        teelixir: t,
        nameSimilarity: 100,
        matchType: 'exact_name',
        reason: `Exact name match: "${elevate.name}"`
      }
    }

    // Normalized name match
    if (eNorm === tNorm && eNorm.length > 3) {
      return {
        elevate,
        teelixir: t,
        nameSimilarity: 98,
        matchType: 'normalized_name',
        reason: `Normalized match: "${eNorm}"`
      }
    }

    // Calculate base similarity
    let score = nameSimilarity(elevate.name, t.name)

    // Boost for same account type
    if (elevate.account_type === t.account_type) {
      score = Math.min(100, score + 5)
    }

    // Boost for keyword matches
    score = Math.min(100, score + containsKeywords(elevate.name, t.name))

    // Check for partial name containment
    const eLower = elevate.name.toLowerCase()
    const tLower = t.name.toLowerCase()
    if (eLower.length > 5 && tLower.includes(eLower.substring(0, Math.min(8, eLower.length)))) {
      score = Math.min(100, score + 10)
    }
    if (tLower.length > 5 && eLower.includes(tLower.substring(0, Math.min(8, tLower.length)))) {
      score = Math.min(100, score + 10)
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = t
      bestReason = `Name ${score}% similar: "${elevate.name}" → "${t.name}"`
    }
  }

  if (bestMatch && bestScore >= 50) {
    return {
      elevate,
      teelixir: bestMatch,
      nameSimilarity: bestScore,
      matchType: bestScore >= 80 ? 'high_similarity' : bestScore >= 60 ? 'medium_similarity' : 'low_similarity',
      reason: bestReason
    }
  }

  return {
    elevate,
    teelixir: null,
    nameSimilarity: 0,
    matchType: 'no_match',
    reason: 'No suitable name match found'
  }
}

async function main() {
  const mode = process.argv[2] || '--preview'

  console.log('\n╔═══════════════════════════════════════════════════════════════════╗')
  console.log('║  NAME-BASED ACCOUNT MAPPING                                       ║')
  console.log('║  Elevate Wholesale → Teelixir                                     ║')
  console.log(`║  Mode: ${mode.padEnd(56)}║`)
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n')

  // Get orgs
  const { data: orgs } = await supabase
    .from('xero_organizations')
    .select('id, business_key, name')

  const teelixirOrg = orgs?.find(o => o.business_key === 'teelixir')
  const elevateOrg = orgs?.find(o => o.business_key === 'elevate')

  if (!teelixirOrg || !elevateOrg) {
    console.error('Organizations not found')
    process.exit(1)
  }

  // Fetch accounts
  const { data: teelixirAccounts } = await supabase
    .from('accounts')
    .select('id, code, name, account_type, account_class')
    .eq('organization_id', teelixirOrg.id)
    .eq('status', 'ACTIVE')

  const { data: elevateAccounts } = await supabase
    .from('accounts')
    .select('id, code, name, account_type, account_class')
    .eq('organization_id', elevateOrg.id)
    .eq('status', 'ACTIVE')

  // Get already mapped accounts
  const { data: existingMappings } = await supabase
    .from('account_mappings')
    .select('source_account_id')

  const mappedIds = new Set(existingMappings?.map(m => m.source_account_id) || [])

  console.log(`Teelixir accounts: ${teelixirAccounts?.length || 0}`)
  console.log(`Elevate accounts: ${elevateAccounts?.length || 0}`)
  console.log(`Already mapped: ${mappedIds.size}`)

  // Find unmapped Elevate accounts
  const unmapped = elevateAccounts?.filter(e => !mappedIds.has(e.id)) || []
  console.log(`Remaining to map: ${unmapped.length}\n`)

  if (unmapped.length === 0) {
    console.log('All accounts are already mapped!')
    return
  }

  // Find name-based matches
  const mappings: NameMapping[] = unmapped.map(e =>
    findBestNameMatch(e, teelixirAccounts || [])
  )

  // Sort by similarity
  mappings.sort((a, b) => b.nameSimilarity - a.nameSimilarity)

  // Categorize
  const high = mappings.filter(m => m.nameSimilarity >= 80)
  const medium = mappings.filter(m => m.nameSimilarity >= 60 && m.nameSimilarity < 80)
  const low = mappings.filter(m => m.nameSimilarity >= 50 && m.nameSimilarity < 60)
  const noMatch = mappings.filter(m => m.nameSimilarity < 50)

  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('NAME SIMILARITY SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log(`  High (80%+):    ${high.length} accounts - Will auto-apply`)
  console.log(`  Medium (60-79%): ${medium.length} accounts - Will auto-apply`)
  console.log(`  Low (50-59%):    ${low.length} accounts - Manual review needed`)
  console.log(`  No match (<50%): ${noMatch.length} accounts - Needs new Teelixir account`)
  console.log('')

  // Show high confidence
  if (high.length > 0) {
    console.log('\n✅ HIGH SIMILARITY MATCHES (80%+)')
    console.log('─'.repeat(70))
    for (const m of high) {
      console.log(`  [${m.nameSimilarity}%] ${m.elevate.code} "${m.elevate.name}"`)
      console.log(`        → ${m.teelixir?.code} "${m.teelixir?.name}"`)
    }
  }

  // Show medium confidence
  if (medium.length > 0) {
    console.log('\n🔶 MEDIUM SIMILARITY MATCHES (60-79%)')
    console.log('─'.repeat(70))
    for (const m of medium) {
      console.log(`  [${m.nameSimilarity}%] ${m.elevate.code} "${m.elevate.name}"`)
      console.log(`        → ${m.teelixir?.code} "${m.teelixir?.name}"`)
    }
  }

  // Show low confidence
  if (low.length > 0) {
    console.log('\n⚠️  LOW SIMILARITY MATCHES (50-59%) - Review needed')
    console.log('─'.repeat(70))
    for (const m of low) {
      console.log(`  [${m.nameSimilarity}%] ${m.elevate.code} "${m.elevate.name}"`)
      console.log(`        → ${m.teelixir?.code} "${m.teelixir?.name}"`)
    }
  }

  // Show no match
  if (noMatch.length > 0) {
    console.log('\n❌ NO GOOD NAME MATCH - May need new Teelixir account')
    console.log('─'.repeat(70))
    for (const m of noMatch) {
      console.log(`  ${m.elevate.code} "${m.elevate.name}" (${m.elevate.account_type})`)
      if (m.teelixir && m.nameSimilarity > 0) {
        console.log(`        Best guess (${m.nameSimilarity}%): ${m.teelixir.code} "${m.teelixir.name}"`)
      }
    }
  }

  // Apply if requested
  if (mode === '--apply') {
    const toApply = [...high, ...medium]  // Only high and medium
    console.log(`\n\nApplying ${toApply.length} name-based mappings...`)

    let applied = 0
    for (const m of toApply) {
      if (!m.teelixir) continue

      const { error } = await supabase
        .from('account_mappings')
        .upsert({
          source_account_id: m.elevate.id,
          consolidated_account_code: m.teelixir.code,
          consolidated_account_name: m.teelixir.name,
          mapping_type: 'standard',
          confidence_level: m.nameSimilarity >= 80 ? 'high' : 'medium',
          mapping_reason: m.reason,
          is_active: true,
          approved_by: 'name-based-auto',
          approved_at: new Date().toISOString()
        }, { onConflict: 'source_account_id' })

      if (!error) {
        console.log(`  ✅ ${m.elevate.code} → ${m.teelixir.code}`)
        applied++
      } else {
        console.log(`  ❌ ${m.elevate.code}: ${error.message}`)
      }
    }

    console.log(`\n✅ Applied: ${applied}`)
  } else {
    console.log('\n\nPreview mode - run with --apply to save mappings')
  }

  // Total count
  const { count } = await supabase
    .from('account_mappings')
    .select('*', { count: 'exact', head: true })

  console.log(`\n📊 Total mappings in database: ${count}`)
}

main().catch(console.error)
