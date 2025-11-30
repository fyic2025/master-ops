/**
 * Teelixir - Order Notes Parser
 *
 * Parses order comments and line item notes to detect:
 * - Out of stock (OOS) mentions
 * - Discontinued product mentions
 * - Short supply mentions
 * - Backorder mentions
 *
 * Usage:
 *   import { parseOrderNotes, OOSParseResult } from './parse-order-notes'
 *
 *   const result = parseOrderNotes(orderComments, lineItemComments)
 *   if (result.hasOOS) {
 *     console.log('OOS detected:', result.oosMatches)
 *   }
 */

export interface OOSParseResult {
  hasOOS: boolean
  hasDiscontinued: boolean
  hasShortSupply: boolean
  hasBackorder: boolean
  hasPOReference: boolean
  oosMatches: string[]
  discontinuedMatches: string[]
  shortSupplyMatches: string[]
  backorderMatches: string[]
  poReferences: string[]
  affectedProductCodes: string[]
  rawText: string
}

// ============================================================================
// REGEX PATTERNS
// ============================================================================

const OOS_PATTERNS = [
  /\bout\s+of\s+stock\b/gi,
  /\bOOS\b/g,
  /\bno\s+stock\b/gi,
  /\bstock\s+unavailable\b/gi,
  /\btemporarily\s+unavailable\b/gi,
  /\bnot\s+available\b/gi,
  /\b0\s+in\s+stock\b/gi,
  /\bzero\s+stock\b/gi,
  /\bnil\s+stock\b/gi,
]

const DISCONTINUED_PATTERNS = [
  /\bdiscontinued\b/gi,
  /\bno\s+longer\s+(?:available|stocked|made|carried)\b/gi,
  /\bdeleted?\b/gi,
  /\bobsolete\b/gi,
  /\bend\s+of\s+life\b/gi,
  /\bEOL\b/g,
  /\bphased?\s*out\b/gi,
  /\bnot\s+restocking\b/gi,
  /\bpermanently\s+unavailable\b/gi,
  /\bno\s+longer\s+manufacturing\b/gi,
]

const SHORT_SUPPLY_PATTERNS = [
  /\bshort\s*(?:supply|supplied|ship)?\b/gi,
  /\bpartial\s*(?:supply|shipment|order|fill)?\b/gi,
  /\blimited\s+stock\b/gi,
  /\blow\s+stock\b/gi,
  /\bshort\s+\d+/gi,  // "short 5" meaning 5 units short
  /\b\d+\s+short\b/gi,  // "5 short"
  /\bonly\s+\d+\s+(?:left|available|in\s+stock)\b/gi,
]

const BACKORDER_PATTERNS = [
  /\bback\s*order(?:ed)?\b/gi,
  /\bB\/O\b/g,
  /\bon\s+back\s*order\b/gi,
  /\bwaiting\s+(?:for\s+)?stock\b/gi,
  /\bstock\s+(?:due|arriving|expected)\b/gi,
  /\bETA\s*[:=]?\s*\d/gi,  // ETA followed by date
  /\bexpected\s+(?:in|by)\s+\w+/gi,
  /\bdue\s+(?:in|by)\s+\w+/gi,
]

const PO_REFERENCE_PATTERNS = [
  /\bPO\s*(?:#|number|num|no\.?)?\s*[:=]?\s*[\w-]+/gi,
  /\bpurchase\s+order\s*(?:#|number|num|no\.?)?\s*[:=]?\s*[\w-]+/gi,
  /\battach(?:ed|ment)?\s*(?:PO|purchase\s+order)/gi,
  /\bsee\s+attach(?:ed|ment)/gi,
  /\bPO\s+attach/gi,
]

// Product code patterns - common formats
const PRODUCT_CODE_PATTERNS = [
  /\b[A-Z]{2,4}-?\d{2,4}[A-Z]?\b/g,  // Like "LM-100G", "REI50"
  /\b\d{4,8}\b/g,  // Numeric codes
]

// ============================================================================
// PARSER FUNCTION
// ============================================================================

/**
 * Parse order and line item comments for OOS/discontinued mentions
 *
 * @param orderComments - The main order comments/notes field
 * @param lineItemComments - Array of line item comment strings
 * @returns Parsed results with flags and matched text
 */
export function parseOrderNotes(
  orderComments: string,
  lineItemComments: string[]
): OOSParseResult {
  // Combine all text for analysis
  const allText = [orderComments, ...lineItemComments].filter(Boolean).join(' \n ')

  const result: OOSParseResult = {
    hasOOS: false,
    hasDiscontinued: false,
    hasShortSupply: false,
    hasBackorder: false,
    hasPOReference: false,
    oosMatches: [],
    discontinuedMatches: [],
    shortSupplyMatches: [],
    backorderMatches: [],
    poReferences: [],
    affectedProductCodes: [],
    rawText: allText,
  }

  if (!allText.trim()) {
    return result
  }

  // Check for OOS patterns
  for (const pattern of OOS_PATTERNS) {
    const matches = allText.match(pattern)
    if (matches) {
      result.hasOOS = true
      result.oosMatches.push(...matches.map(m => extractContext(allText, m)))
    }
  }

  // Check for discontinued patterns
  for (const pattern of DISCONTINUED_PATTERNS) {
    const matches = allText.match(pattern)
    if (matches) {
      result.hasDiscontinued = true
      result.discontinuedMatches.push(...matches.map(m => extractContext(allText, m)))
    }
  }

  // Check for short supply patterns
  for (const pattern of SHORT_SUPPLY_PATTERNS) {
    const matches = allText.match(pattern)
    if (matches) {
      result.hasShortSupply = true
      result.shortSupplyMatches.push(...matches.map(m => extractContext(allText, m)))
    }
  }

  // Check for backorder patterns
  for (const pattern of BACKORDER_PATTERNS) {
    const matches = allText.match(pattern)
    if (matches) {
      result.hasBackorder = true
      result.backorderMatches.push(...matches.map(m => extractContext(allText, m)))
    }
  }

  // Check for PO references
  for (const pattern of PO_REFERENCE_PATTERNS) {
    const matches = allText.match(pattern)
    if (matches) {
      result.hasPOReference = true
      result.poReferences.push(...matches)
    }
  }

  // Try to extract product codes mentioned
  for (const pattern of PRODUCT_CODE_PATTERNS) {
    const matches = allText.match(pattern)
    if (matches) {
      result.affectedProductCodes.push(...matches)
    }
  }

  // Deduplicate arrays
  result.oosMatches = [...new Set(result.oosMatches)]
  result.discontinuedMatches = [...new Set(result.discontinuedMatches)]
  result.shortSupplyMatches = [...new Set(result.shortSupplyMatches)]
  result.backorderMatches = [...new Set(result.backorderMatches)]
  result.poReferences = [...new Set(result.poReferences)]
  result.affectedProductCodes = [...new Set(result.affectedProductCodes)]

  return result
}

/**
 * Extract surrounding context for a match
 * Returns up to 50 chars before and after the match
 */
function extractContext(fullText: string, match: string): string {
  const index = fullText.toLowerCase().indexOf(match.toLowerCase())
  if (index === -1) return match

  const start = Math.max(0, index - 30)
  const end = Math.min(fullText.length, index + match.length + 30)

  let context = fullText.substring(start, end).trim()

  // Add ellipsis if truncated
  if (start > 0) context = '...' + context
  if (end < fullText.length) context = context + '...'

  return context
}

// ============================================================================
// CLI USAGE (for standalone testing)
// ============================================================================

if (require.main === module) {
  // Test with sample notes
  const testCases = [
    'Lions Mane 100g - OOS, expected back in stock next week',
    'Customer requested Reishi - discontinued, suggested Chaga instead',
    'Short 5 units on Cordyceps 50g, remainder to follow',
    'PO #12345 attached - please reference',
    'All items shipped as ordered',
    'B/O on tremella, ETA: 15th Nov',
    'Partial shipment - waiting for stock on 3 items',
  ]

  console.log('Testing OOS Note Parser\n')
  console.log('=' .repeat(60))

  for (const test of testCases) {
    const result = parseOrderNotes(test, [])
    console.log(`\nInput: "${test}"`)
    console.log(`  OOS: ${result.hasOOS} ${result.oosMatches.length > 0 ? `(${result.oosMatches.join(', ')})` : ''}`)
    console.log(`  Discontinued: ${result.hasDiscontinued}`)
    console.log(`  Short Supply: ${result.hasShortSupply}`)
    console.log(`  Backorder: ${result.hasBackorder}`)
    console.log(`  PO Reference: ${result.hasPOReference}`)
  }

  console.log('\n' + '='.repeat(60))
}
