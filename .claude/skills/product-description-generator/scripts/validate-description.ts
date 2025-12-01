#!/usr/bin/env npx tsx

/**
 * Product Description Validator
 *
 * Validates product descriptions against brand guidelines,
 * SEO requirements, and compliance rules.
 *
 * Usage:
 *   npx tsx validate-description.ts --business boo --file description.txt
 *   npx tsx validate-description.ts --business teelixir --text "Your description here"
 */

import * as fs from 'fs'

interface ValidationResult {
  category: string
  check: string
  status: 'pass' | 'warn' | 'fail'
  message: string
}

interface ValidationReport {
  business: string
  timestamp: string
  wordCount: number
  charCount: number
  results: ValidationResult[]
  score: number
  maxScore: number
  grade: string
}

// Compliance patterns to check
const PROHIBITED_CLAIMS = [
  { pattern: /\bcures?\b/i, message: 'Cannot claim product "cures" anything' },
  { pattern: /\btreats?\b/i, message: 'Cannot claim product "treats" conditions' },
  { pattern: /\bprevents?\b/i, message: 'Cannot claim product "prevents" disease' },
  { pattern: /\bguaranteed?\s+(results?|to)\b/i, message: 'Cannot guarantee results' },
  { pattern: /\bclinically\s+proven\b/i, message: 'Clinical claims require evidence' },
  { pattern: /\bdoctor\s+recommended\b/i, message: 'Doctor recommendations need verification' },
  { pattern: /\bmiracl(e|ous)\b/i, message: 'Avoid miracle claims' },
]

// Brand voice patterns
const BRAND_VOICE = {
  boo: {
    encouraged: ['nourish', 'wellness', 'natural', 'journey', 'support', 'quality'],
    discouraged: ['miracle', 'revolutionary', 'breakthrough', 'guaranteed'],
    tone: 'warm and informative',
  },
  teelixir: {
    encouraged: ['traditional', 'ancient', 'harness', 'potent', 'transform', 'ritual'],
    discouraged: ['cheap', 'basic', 'simple'],
    tone: 'inspiring and knowledgeable',
  },
  elevate: {
    encouraged: ['margin', 'wholesale', 'proven', 'popular', 'partner', 'stock'],
    discouraged: ['consumer', 'retail therapy', 'treat yourself'],
    tone: 'professional and business-like',
  },
  rhf: {
    encouraged: ['local', 'fresh', 'farm', 'community', 'family', 'peninsula'],
    discouraged: ['corporate', 'industrial', 'mass produced'],
    tone: 'friendly and authentic',
  },
}

// SEO checks
function checkSEO(text: string): ValidationResult[] {
  const results: ValidationResult[] = []
  const words = text.split(/\s+/).length
  const chars = text.length

  // Word count
  if (words < 50) {
    results.push({
      category: 'SEO',
      check: 'Word Count',
      status: 'fail',
      message: `Too short (${words} words). Aim for 100-300 words.`,
    })
  } else if (words < 100) {
    results.push({
      category: 'SEO',
      check: 'Word Count',
      status: 'warn',
      message: `Short (${words} words). Consider expanding to 150+ words.`,
    })
  } else if (words > 500) {
    results.push({
      category: 'SEO',
      check: 'Word Count',
      status: 'warn',
      message: `Long (${words} words). Consider trimming for readability.`,
    })
  } else {
    results.push({
      category: 'SEO',
      check: 'Word Count',
      status: 'pass',
      message: `Good length (${words} words).`,
    })
  }

  // Check for headings/structure
  const hasHeadings = /<h[2-6]|##|\*\*[A-Z]/.test(text)
  results.push({
    category: 'SEO',
    check: 'Structure',
    status: hasHeadings ? 'pass' : 'warn',
    message: hasHeadings ? 'Has headings/structure' : 'Consider adding headings for better structure',
  })

  // Check for bullet points
  const hasBullets = /^[-*•]|\n[-*•]/m.test(text)
  results.push({
    category: 'SEO',
    check: 'Formatting',
    status: hasBullets ? 'pass' : 'warn',
    message: hasBullets ? 'Uses bullet points' : 'Consider using bullet points for benefits',
  })

  return results
}

// Compliance checks
function checkCompliance(text: string): ValidationResult[] {
  const results: ValidationResult[] = []

  for (const claim of PROHIBITED_CLAIMS) {
    if (claim.pattern.test(text)) {
      results.push({
        category: 'Compliance',
        check: 'Prohibited Claims',
        status: 'fail',
        message: claim.message,
      })
    }
  }

  if (results.length === 0) {
    results.push({
      category: 'Compliance',
      check: 'Prohibited Claims',
      status: 'pass',
      message: 'No prohibited claims detected',
    })
  }

  // Check for disclaimers if supplement-related
  const isSupplementRelated = /supplement|vitamin|capsule|tablet|extract|tincture/i.test(text)
  if (isSupplementRelated) {
    const hasDisclaimer = /always read the label|healthcare professional|not intended to diagnose/i.test(text)
    results.push({
      category: 'Compliance',
      check: 'Disclaimer',
      status: hasDisclaimer ? 'pass' : 'warn',
      message: hasDisclaimer ? 'Has appropriate disclaimer' : 'Consider adding standard disclaimer for supplements',
    })
  }

  return results
}

// Brand voice checks
function checkBrandVoice(text: string, business: string): ValidationResult[] {
  const results: ValidationResult[] = []
  const voice = BRAND_VOICE[business as keyof typeof BRAND_VOICE]

  if (!voice) {
    results.push({
      category: 'Brand Voice',
      check: 'Business',
      status: 'warn',
      message: `Unknown business: ${business}. Using generic checks.`,
    })
    return results
  }

  // Check for encouraged words
  const encouragedFound = voice.encouraged.filter(word =>
    new RegExp(`\\b${word}\\b`, 'i').test(text)
  )

  if (encouragedFound.length >= 2) {
    results.push({
      category: 'Brand Voice',
      check: 'Tone Words',
      status: 'pass',
      message: `Good use of brand voice words: ${encouragedFound.join(', ')}`,
    })
  } else {
    results.push({
      category: 'Brand Voice',
      check: 'Tone Words',
      status: 'warn',
      message: `Consider using more brand voice words: ${voice.encouraged.join(', ')}`,
    })
  }

  // Check for discouraged words
  const discouragedFound = voice.discouraged.filter(word =>
    new RegExp(`\\b${word}\\b`, 'i').test(text)
  )

  if (discouragedFound.length > 0) {
    results.push({
      category: 'Brand Voice',
      check: 'Discouraged Words',
      status: 'warn',
      message: `Avoid these words for ${business}: ${discouragedFound.join(', ')}`,
    })
  } else {
    results.push({
      category: 'Brand Voice',
      check: 'Discouraged Words',
      status: 'pass',
      message: 'No discouraged words found',
    })
  }

  return results
}

// Quality checks
function checkQuality(text: string): ValidationResult[] {
  const results: ValidationResult[] = []

  // Check for Australian spelling
  const usSpellings = text.match(/\b(color|flavor|favorite|organize|recognize)\b/gi)
  if (usSpellings) {
    results.push({
      category: 'Quality',
      check: 'Australian English',
      status: 'fail',
      message: `Use Australian spelling: ${usSpellings.join(', ')} -> colour, flavour, favourite, etc.`,
    })
  } else {
    results.push({
      category: 'Quality',
      check: 'Australian English',
      status: 'pass',
      message: 'No US spellings detected',
    })
  }

  // Check for excessive punctuation
  if (/!{2,}|\.{4,}/.test(text)) {
    results.push({
      category: 'Quality',
      check: 'Punctuation',
      status: 'warn',
      message: 'Avoid excessive punctuation (multiple ! or ...)',
    })
  }

  // Check for all caps
  if (/\b[A-Z]{4,}\b/.test(text) && !/\b(BOO|RHF|MOQ|RRP|SKU)\b/.test(text)) {
    results.push({
      category: 'Quality',
      check: 'Caps Usage',
      status: 'warn',
      message: 'Avoid ALL CAPS for emphasis',
    })
  }

  // Check for call to action
  const hasCTA = /shop|buy|order|add to cart|try|discover|experience/i.test(text)
  results.push({
    category: 'Quality',
    check: 'Call to Action',
    status: hasCTA ? 'pass' : 'warn',
    message: hasCTA ? 'Has call to action' : 'Consider adding a soft call to action',
  })

  return results
}

// Calculate score
function calculateScore(results: ValidationResult[]): { score: number; maxScore: number; grade: string } {
  let score = 0
  let maxScore = 0

  for (const result of results) {
    maxScore += 10
    if (result.status === 'pass') score += 10
    else if (result.status === 'warn') score += 5
    // fail = 0
  }

  const percentage = (score / maxScore) * 100
  let grade: string
  if (percentage >= 90) grade = 'A'
  else if (percentage >= 80) grade = 'B'
  else if (percentage >= 70) grade = 'C'
  else if (percentage >= 60) grade = 'D'
  else grade = 'F'

  return { score, maxScore, grade }
}

// Main validation function
function validateDescription(text: string, business: string): ValidationReport {
  const results: ValidationResult[] = [
    ...checkSEO(text),
    ...checkCompliance(text),
    ...checkBrandVoice(text, business),
    ...checkQuality(text),
  ]

  const { score, maxScore, grade } = calculateScore(results)

  return {
    business,
    timestamp: new Date().toISOString(),
    wordCount: text.split(/\s+/).length,
    charCount: text.length,
    results,
    score,
    maxScore,
    grade,
  }
}

// Print report
function printReport(report: ValidationReport): void {
  console.log('\n' + '='.repeat(60))
  console.log('PRODUCT DESCRIPTION VALIDATION REPORT')
  console.log('='.repeat(60))
  console.log(`Business: ${report.business.toUpperCase()}`)
  console.log(`Timestamp: ${report.timestamp}`)
  console.log(`Word Count: ${report.wordCount}`)
  console.log(`Character Count: ${report.charCount}`)
  console.log('-'.repeat(60))

  // Group by category
  const categories = [...new Set(report.results.map(r => r.category))]

  for (const category of categories) {
    console.log(`\n${category}:`)
    const categoryResults = report.results.filter(r => r.category === category)

    for (const result of categoryResults) {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌'
      console.log(`  ${icon} ${result.check}: ${result.message}`)
    }
  }

  console.log('\n' + '-'.repeat(60))
  console.log(`SCORE: ${report.score}/${report.maxScore} (${Math.round((report.score/report.maxScore)*100)}%)`)
  console.log(`GRADE: ${report.grade}`)
  console.log('='.repeat(60))

  // Recommendations
  const fails = report.results.filter(r => r.status === 'fail')
  const warns = report.results.filter(r => r.status === 'warn')

  if (fails.length > 0) {
    console.log('\n🚨 MUST FIX:')
    fails.forEach(f => console.log(`  - ${f.message}`))
  }

  if (warns.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:')
    warns.forEach(w => console.log(`  - ${w.message}`))
  }

  if (fails.length === 0 && warns.length === 0) {
    console.log('\n✨ Excellent! Description meets all requirements.')
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Product Description Validator

Usage:
  npx tsx validate-description.ts --business <name> --file <path>
  npx tsx validate-description.ts --business <name> --text "description"

Options:
  --business <name>  Business: boo, teelixir, elevate, rhf
  --file <path>      Path to file containing description
  --text "..."       Description text directly
  --json             Output as JSON
  --help             Show this help

Examples:
  npx tsx validate-description.ts --business boo --file product.txt
  npx tsx validate-description.ts --business teelixir --text "Organic reishi..."
    `)
    process.exit(0)
  }

  // Parse arguments
  const businessIdx = args.indexOf('--business')
  const fileIdx = args.indexOf('--file')
  const textIdx = args.indexOf('--text')
  const jsonOutput = args.includes('--json')

  if (businessIdx === -1) {
    console.error('Error: --business is required')
    process.exit(1)
  }

  const business = args[businessIdx + 1]?.toLowerCase()
  if (!business) {
    console.error('Error: Business name required')
    process.exit(1)
  }

  let text: string

  if (fileIdx !== -1) {
    const filePath = args[fileIdx + 1]
    if (!filePath || !fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`)
      process.exit(1)
    }
    text = fs.readFileSync(filePath, 'utf-8')
  } else if (textIdx !== -1) {
    text = args[textIdx + 1]
    if (!text) {
      console.error('Error: Description text required')
      process.exit(1)
    }
  } else {
    console.error('Error: Either --file or --text is required')
    process.exit(1)
  }

  const report = validateDescription(text, business)

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printReport(report)
  }

  // Exit with appropriate code
  const hasFails = report.results.some(r => r.status === 'fail')
  process.exit(hasFails ? 1 : 0)
}

main()
