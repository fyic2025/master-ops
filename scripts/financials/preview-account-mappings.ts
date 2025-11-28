/**
 * Preview Account Mappings
 *
 * Shows all suggested mappings between Elevate Wholesale and Teelixir
 * without saving anything. Run this first to review, then use
 * apply-account-mappings.ts to save approved mappings.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load .env from project root
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
  status: string
}

interface MappingSuggestion {
  elevate: Account
  teelixir: Account | null
  confidence: number
  strategy: string
  reason: string
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
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

function stringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 100
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase())
  return Math.round((1 - distance / maxLen) * 100)
}

function suggestMapping(elevateAccount: Account, teelixirAccounts: Account[]): MappingSuggestion {
  // Strategy 1: Exact code match
  const exactCodeMatch = teelixirAccounts.find(t => t.code === elevateAccount.code)
  if (exactCodeMatch) {
    return {
      elevate: elevateAccount,
      teelixir: exactCodeMatch,
      confidence: 98,
      strategy: 'exact_code',
      reason: `Exact code match: ${elevateAccount.code}`
    }
  }

  // Strategy 2: Exact name match
  const exactNameMatch = teelixirAccounts.find(
    t => t.name.toLowerCase() === elevateAccount.name.toLowerCase()
  )
  if (exactNameMatch) {
    return {
      elevate: elevateAccount,
      teelixir: exactNameMatch,
      confidence: 95,
      strategy: 'exact_name',
      reason: `Exact name match: ${elevateAccount.name}`
    }
  }

  // Strategy 3: Similar name + same type
  const sameTypeAccounts = teelixirAccounts.filter(
    t => t.account_type === elevateAccount.account_type
  )

  let bestMatch: Account | null = null
  let bestSimilarity = 0

  for (const t of sameTypeAccounts) {
    const similarity = stringSimilarity(elevateAccount.name, t.name)
    if (similarity > bestSimilarity && similarity >= 70) {
      bestSimilarity = similarity
      bestMatch = t
    }
  }

  if (bestMatch && bestSimilarity >= 70) {
    return {
      elevate: elevateAccount,
      teelixir: bestMatch,
      confidence: bestSimilarity,
      strategy: 'similar_name',
      reason: `Similar name (${bestSimilarity}%): "${elevateAccount.name}" → "${bestMatch.name}"`
    }
  }

  // Strategy 4: Same type + class
  const sameClassMatch = teelixirAccounts.find(
    t => t.account_type === elevateAccount.account_type &&
         t.account_class === elevateAccount.account_class
  )

  if (sameClassMatch) {
    return {
      elevate: elevateAccount,
      teelixir: sameClassMatch,
      confidence: 50,
      strategy: 'type_class',
      reason: `Same type (${elevateAccount.account_type}) and class (${elevateAccount.account_class})`
    }
  }

  // No match found
  return {
    elevate: elevateAccount,
    teelixir: null,
    confidence: 0,
    strategy: 'no_match',
    reason: 'No suitable match found'
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗')
  console.log('║  ACCOUNT MAPPING PREVIEW                                          ║')
  console.log('║  Elevate Wholesale → Teelixir                                     ║')
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n')

  // Get organization IDs
  const { data: orgs } = await supabase
    .from('xero_organizations')
    .select('id, business_key, name')

  const teelixirOrg = orgs?.find(o => o.business_key === 'teelixir')
  const elevateOrg = orgs?.find(o => o.business_key === 'elevate')

  if (!teelixirOrg || !elevateOrg) {
    console.error('Organizations not found in database')
    process.exit(1)
  }

  console.log(`Teelixir: ${teelixirOrg.name}`)
  console.log(`Elevate: ${elevateOrg.name}\n`)

  // Fetch accounts
  const { data: teelixirAccounts } = await supabase
    .from('accounts')
    .select('id, code, name, account_type, account_class, status')
    .eq('organization_id', teelixirOrg.id)
    .eq('status', 'ACTIVE')

  const { data: elevateAccounts } = await supabase
    .from('accounts')
    .select('id, code, name, account_type, account_class, status')
    .eq('organization_id', elevateOrg.id)
    .eq('status', 'ACTIVE')

  console.log(`Teelixir accounts: ${teelixirAccounts?.length || 0}`)
  console.log(`Elevate accounts: ${elevateAccounts?.length || 0}\n`)

  if (!elevateAccounts?.length || !teelixirAccounts?.length) {
    console.error('No accounts found')
    process.exit(1)
  }

  // Generate suggestions
  const suggestions: MappingSuggestion[] = elevateAccounts.map(e =>
    suggestMapping(e, teelixirAccounts)
  )

  // Sort by confidence (highest first)
  suggestions.sort((a, b) => b.confidence - a.confidence)

  // Categorize
  const highConfidence = suggestions.filter(s => s.confidence >= 95)
  const mediumConfidence = suggestions.filter(s => s.confidence >= 70 && s.confidence < 95)
  const lowConfidence = suggestions.filter(s => s.confidence > 0 && s.confidence < 70)
  const noMatch = suggestions.filter(s => s.confidence === 0)

  // Summary
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log(`  High confidence (95%+):     ${highConfidence.length} accounts`)
  console.log(`  Medium confidence (70-94%): ${mediumConfidence.length} accounts`)
  console.log(`  Low confidence (<70%):      ${lowConfidence.length} accounts`)
  console.log(`  No match found:             ${noMatch.length} accounts\n`)

  // HIGH CONFIDENCE (95%+) - Auto-approve recommended
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('HIGH CONFIDENCE MAPPINGS (95%+) - Recommended for auto-approve')
  console.log('═══════════════════════════════════════════════════════════════════')

  for (const s of highConfidence) {
    console.log(`\n  [${s.confidence}%] ${s.elevate.code} "${s.elevate.name}"`)
    console.log(`       → ${s.teelixir?.code} "${s.teelixir?.name}"`)
    console.log(`       Strategy: ${s.strategy}`)
  }

  // MEDIUM CONFIDENCE (70-94%) - Review needed
  if (mediumConfidence.length > 0) {
    console.log('\n\n═══════════════════════════════════════════════════════════════════')
    console.log('MEDIUM CONFIDENCE MAPPINGS (70-94%) - Review recommended')
    console.log('═══════════════════════════════════════════════════════════════════')

    for (const s of mediumConfidence) {
      console.log(`\n  [${s.confidence}%] ${s.elevate.code} "${s.elevate.name}"`)
      console.log(`       → ${s.teelixir?.code} "${s.teelixir?.name}"`)
      console.log(`       Reason: ${s.reason}`)
    }
  }

  // LOW CONFIDENCE (<70%) - Manual review needed
  if (lowConfidence.length > 0) {
    console.log('\n\n═══════════════════════════════════════════════════════════════════')
    console.log('LOW CONFIDENCE MAPPINGS (<70%) - Manual review needed')
    console.log('═══════════════════════════════════════════════════════════════════')

    for (const s of lowConfidence) {
      console.log(`\n  [${s.confidence}%] ${s.elevate.code} "${s.elevate.name}" (${s.elevate.account_type})`)
      if (s.teelixir) {
        console.log(`       → ${s.teelixir.code} "${s.teelixir.name}" (${s.teelixir.account_type})`)
      }
      console.log(`       Reason: ${s.reason}`)
    }
  }

  // NO MATCH - Will need manual mapping
  if (noMatch.length > 0) {
    console.log('\n\n═══════════════════════════════════════════════════════════════════')
    console.log('NO MATCH FOUND - Needs manual mapping or new Teelixir account')
    console.log('═══════════════════════════════════════════════════════════════════')

    for (const s of noMatch) {
      console.log(`\n  ${s.elevate.code} "${s.elevate.name}"`)
      console.log(`       Type: ${s.elevate.account_type} | Class: ${s.elevate.account_class}`)
    }
  }

  console.log('\n\n═══════════════════════════════════════════════════════════════════')
  console.log('NEXT STEPS')
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('1. Review the mappings above')
  console.log('2. Run: npx tsx scripts/financials/apply-account-mappings.ts --high')
  console.log('   to apply high confidence mappings')
  console.log('3. Run: npx tsx scripts/financials/apply-account-mappings.ts --all')
  console.log('   to apply all mappings (high + medium)')
  console.log('\n')
}

main().catch(console.error)
