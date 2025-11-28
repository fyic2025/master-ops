/**
 * Simple Account Mapping Script
 *
 * Maps Elevate Wholesale accounts to Teelixir accounts for consolidation.
 * Shows suggestions and allows interactive approval.
 *
 * Usage:
 *   npx tsx scripts/financials/simple-account-mapping.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as readline from 'readline'
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
  console.log('║  Simple Account Mapping                                           ║')
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

  console.log(`Teelixir Org: ${teelixirOrg.name} (${teelixirOrg.id})`)
  console.log(`Elevate Org: ${elevateOrg.name} (${elevateOrg.id})\n`)

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

  console.log(`Found ${teelixirAccounts?.length || 0} Teelixir accounts`)
  console.log(`Found ${elevateAccounts?.length || 0} Elevate accounts to map\n`)

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

  // Summary
  const highConfidence = suggestions.filter(s => s.confidence >= 95)
  const mediumConfidence = suggestions.filter(s => s.confidence >= 70 && s.confidence < 95)
  const lowConfidence = suggestions.filter(s => s.confidence > 0 && s.confidence < 70)
  const noMatch = suggestions.filter(s => s.confidence === 0)

  console.log('╔═══════════════════════════════════════════════════════════════════╗')
  console.log('║  MAPPING SUMMARY                                                  ║')
  console.log('╠═══════════════════════════════════════════════════════════════════╣')
  console.log(`║  High confidence (95%+):    ${highConfidence.length.toString().padStart(3)} accounts                        ║`)
  console.log(`║  Medium confidence (70-94%): ${mediumConfidence.length.toString().padStart(3)} accounts                        ║`)
  console.log(`║  Low confidence (<70%):      ${lowConfidence.length.toString().padStart(3)} accounts                        ║`)
  console.log(`║  No match found:             ${noMatch.length.toString().padStart(3)} accounts                        ║`)
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n')

  // Auto-approve high confidence mappings
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const question = (q: string): Promise<string> =>
    new Promise(resolve => rl.question(q, resolve))

  const answer = await question('Auto-approve all high confidence (95%+) mappings? (y/n): ')

  if (answer.toLowerCase() === 'y') {
    console.log('\nApproving high-confidence mappings...')

    let approved = 0
    for (const suggestion of highConfidence) {
      if (!suggestion.teelixir) continue

      const { error } = await supabase
        .from('account_mappings')
        .upsert({
          source_account_id: suggestion.elevate.id,
          consolidated_account_code: suggestion.teelixir.code,
          consolidated_account_name: suggestion.teelixir.name,
          mapping_type: 'standard',
          confidence_level: suggestion.confidence >= 95 ? 'high' : 'medium',
          mapping_reason: suggestion.reason,
          is_active: true,
          approved_by: 'auto-approve',
          approved_at: new Date().toISOString()
        }, {
          onConflict: 'source_account_id'
        })

      if (!error) {
        approved++
        console.log(`  ✅ ${suggestion.elevate.code} → ${suggestion.teelixir.code}`)
      } else {
        console.log(`  ❌ ${suggestion.elevate.code}: ${error.message}`)
      }
    }

    console.log(`\nApproved ${approved} high-confidence mappings.`)
  }

  // Show medium confidence for review
  if (mediumConfidence.length > 0) {
    console.log('\n═══ MEDIUM CONFIDENCE MAPPINGS (Review Recommended) ═══\n')

    for (const suggestion of mediumConfidence) {
      console.log(`  ${suggestion.elevate.code} "${suggestion.elevate.name}"`)
      if (suggestion.teelixir) {
        console.log(`    → ${suggestion.teelixir.code} "${suggestion.teelixir.name}"`)
        console.log(`    Confidence: ${suggestion.confidence}% | ${suggestion.reason}`)
      }
      console.log('')
    }

    const approveAnswer = await question('Approve all medium confidence mappings? (y/n): ')

    if (approveAnswer.toLowerCase() === 'y') {
      let approved = 0
      for (const suggestion of mediumConfidence) {
        if (!suggestion.teelixir) continue

        const { error } = await supabase
          .from('account_mappings')
          .upsert({
            source_account_id: suggestion.elevate.id,
            consolidated_account_code: suggestion.teelixir.code,
            consolidated_account_name: suggestion.teelixir.name,
            mapping_type: 'standard',
            confidence_level: 'medium',
            mapping_reason: suggestion.reason,
            is_active: true,
            approved_by: 'manual-approve',
            approved_at: new Date().toISOString()
          }, {
            onConflict: 'source_account_id'
          })

        if (!error) approved++
      }
      console.log(`\nApproved ${approved} medium-confidence mappings.`)
    }
  }

  // Show no match accounts
  if (noMatch.length > 0) {
    console.log('\n═══ ACCOUNTS WITHOUT MATCHES ═══\n')
    for (const suggestion of noMatch) {
      console.log(`  ${suggestion.elevate.code} "${suggestion.elevate.name}" (${suggestion.elevate.account_type})`)
    }
    console.log(`\nThese ${noMatch.length} accounts will need manual mapping.`)
  }

  rl.close()

  // Final count
  const { count } = await supabase
    .from('account_mappings')
    .select('*', { count: 'exact', head: true })

  console.log(`\n✅ Total mappings in database: ${count}`)
}

main().catch(console.error)
