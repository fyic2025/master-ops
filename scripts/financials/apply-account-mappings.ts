/**
 * Apply Account Mappings
 *
 * Applies validated account mappings between Elevate Wholesale and Teelixir.
 * Includes validation to catch mismatched code-only mappings.
 *
 * Usage:
 *   npx tsx scripts/financials/apply-account-mappings.ts --high     # Apply only high-confidence (validated)
 *   npx tsx scripts/financials/apply-account-mappings.ts --all      # Apply high + medium confidence
 *   npx tsx scripts/financials/apply-account-mappings.ts --preview  # Preview only, don't apply
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
  validated: boolean
  validationIssue?: string
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
  // Strategy 1: Exact code AND name match (highest confidence)
  const exactCodeAndNameMatch = teelixirAccounts.find(t =>
    t.code === elevateAccount.code &&
    t.name.toLowerCase() === elevateAccount.name.toLowerCase()
  )
  if (exactCodeAndNameMatch) {
    return {
      elevate: elevateAccount,
      teelixir: exactCodeAndNameMatch,
      confidence: 100,
      strategy: 'exact_code_and_name',
      reason: `Exact code and name match: ${elevateAccount.code} "${elevateAccount.name}"`,
      validated: true
    }
  }

  // Strategy 2: Exact code + similar name (name > 60% similar)
  const exactCodeMatch = teelixirAccounts.find(t => t.code === elevateAccount.code)
  if (exactCodeMatch) {
    const nameSimilarity = stringSimilarity(elevateAccount.name, exactCodeMatch.name)
    if (nameSimilarity >= 60) {
      return {
        elevate: elevateAccount,
        teelixir: exactCodeMatch,
        confidence: Math.min(98, 80 + nameSimilarity / 5),
        strategy: 'code_match_name_similar',
        reason: `Code match: ${elevateAccount.code}, name ${nameSimilarity}% similar`,
        validated: true
      }
    } else {
      // Code matches but names are very different - FLAG THIS
      return {
        elevate: elevateAccount,
        teelixir: exactCodeMatch,
        confidence: 50, // Downgrade confidence
        strategy: 'code_only_name_mismatch',
        reason: `Code match but names only ${nameSimilarity}% similar: "${elevateAccount.name}" vs "${exactCodeMatch.name}"`,
        validated: false,
        validationIssue: `REVIEW NEEDED: Names are very different (${nameSimilarity}% similar)`
      }
    }
  }

  // Strategy 3: Exact name match (different code)
  const exactNameMatch = teelixirAccounts.find(
    t => t.name.toLowerCase() === elevateAccount.name.toLowerCase()
  )
  if (exactNameMatch) {
    return {
      elevate: elevateAccount,
      teelixir: exactNameMatch,
      confidence: 95,
      strategy: 'exact_name',
      reason: `Exact name match: ${elevateAccount.name}`,
      validated: true
    }
  }

  // Strategy 4: Similar name + same type (70%+ name match)
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
      reason: `Similar name (${bestSimilarity}%): "${elevateAccount.name}" → "${bestMatch.name}"`,
      validated: bestSimilarity >= 85
    }
  }

  // Strategy 5: Same type + class (low confidence)
  const sameClassMatch = teelixirAccounts.find(
    t => t.account_type === elevateAccount.account_type &&
         t.account_class === elevateAccount.account_class
  )

  if (sameClassMatch) {
    return {
      elevate: elevateAccount,
      teelixir: sameClassMatch,
      confidence: 40,
      strategy: 'type_class',
      reason: `Same type (${elevateAccount.account_type}) and class (${elevateAccount.account_class})`,
      validated: false,
      validationIssue: 'MANUAL MAPPING NEEDED: Only type/class match'
    }
  }

  // No match found
  return {
    elevate: elevateAccount,
    teelixir: null,
    confidence: 0,
    strategy: 'no_match',
    reason: 'No suitable match found',
    validated: false,
    validationIssue: 'NO MATCH: Create new account in Teelixir or manual mapping'
  }
}

async function main() {
  const args = process.argv.slice(2)
  const mode = args[0] || '--preview'

  console.log('\n╔═══════════════════════════════════════════════════════════════════╗')
  console.log('║  ACCOUNT MAPPING - VALIDATED                                      ║')
  console.log('║  Elevate Wholesale → Teelixir                                     ║')
  console.log(`║  Mode: ${mode.padEnd(56)}║`)
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

  // Generate suggestions with validation
  const suggestions: MappingSuggestion[] = elevateAccounts.map(e =>
    suggestMapping(e, teelixirAccounts)
  )

  // Categorize
  const validated = suggestions.filter(s => s.validated && s.teelixir)
  const needsReview = suggestions.filter(s => !s.validated && s.teelixir)
  const noMatch = suggestions.filter(s => !s.teelixir)

  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('VALIDATION SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log(`  ✅ Validated (safe to apply):    ${validated.length} accounts`)
  console.log(`  ⚠️  Needs review:                 ${needsReview.length} accounts`)
  console.log(`  ❌ No match:                      ${noMatch.length} accounts`)
  console.log('')

  // Show validated mappings
  console.log('\n✅ VALIDATED MAPPINGS (Will be applied)')
  console.log('─'.repeat(70))
  for (const s of validated.sort((a, b) => b.confidence - a.confidence)) {
    console.log(`  [${s.confidence.toString().padStart(3)}%] ${s.elevate.code} "${s.elevate.name}"`)
    console.log(`         → ${s.teelixir?.code} "${s.teelixir?.name}"`)
  }

  // Show items needing review
  if (needsReview.length > 0) {
    console.log('\n\n⚠️  NEEDS MANUAL REVIEW (Will NOT be applied automatically)')
    console.log('─'.repeat(70))
    for (const s of needsReview) {
      console.log(`  [${s.confidence.toString().padStart(3)}%] ${s.elevate.code} "${s.elevate.name}"`)
      console.log(`         → ${s.teelixir?.code} "${s.teelixir?.name}"`)
      console.log(`         Issue: ${s.validationIssue}`)
      console.log('')
    }
  }

  // Show no-match items
  if (noMatch.length > 0) {
    console.log('\n\n❌ NO MATCH FOUND')
    console.log('─'.repeat(70))
    for (const s of noMatch) {
      console.log(`  ${s.elevate.code} "${s.elevate.name}" (${s.elevate.account_type})`)
    }
  }

  // Apply mappings based on mode
  if (mode === '--preview') {
    console.log('\n\n═══════════════════════════════════════════════════════════════════')
    console.log('PREVIEW MODE - No changes made')
    console.log('═══════════════════════════════════════════════════════════════════')
    console.log('Run with --high to apply validated mappings')
    console.log('Run with --all to apply validated + review mappings (use caution)')
    return
  }

  if (mode === '--high' || mode === '--all') {
    const toApply = mode === '--all'
      ? [...validated, ...needsReview]
      : validated

    console.log(`\n\nApplying ${toApply.length} mappings...`)

    let applied = 0
    let errors = 0

    for (const s of toApply) {
      if (!s.teelixir) continue

      const { error } = await supabase
        .from('account_mappings')
        .upsert({
          source_account_id: s.elevate.id,
          consolidated_account_code: s.teelixir.code,
          consolidated_account_name: s.teelixir.name,
          mapping_type: 'standard',
          confidence_level: s.confidence >= 90 ? 'high' : s.confidence >= 70 ? 'medium' : 'low',
          mapping_reason: s.reason,
          is_active: true,
          approved_by: s.validated ? 'auto-validated' : 'manual-override',
          approved_at: new Date().toISOString()
        }, {
          onConflict: 'source_account_id'
        })

      if (error) {
        console.log(`  ❌ ${s.elevate.code}: ${error.message}`)
        errors++
      } else {
        console.log(`  ✅ ${s.elevate.code} → ${s.teelixir.code}`)
        applied++
      }
    }

    console.log(`\n✅ Applied: ${applied}`)
    console.log(`❌ Errors: ${errors}`)
  }

  // Final count
  const { count } = await supabase
    .from('account_mappings')
    .select('*', { count: 'exact', head: true })

  console.log(`\n📊 Total mappings in database: ${count}`)
}

main().catch(console.error)
