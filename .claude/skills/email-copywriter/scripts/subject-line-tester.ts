#!/usr/bin/env npx tsx

/**
 * Subject Line Tester
 *
 * Analyzes email subject lines for effectiveness and provides suggestions.
 *
 * Usage:
 *   npx tsx subject-line-tester.ts "Your subject line here"
 *   npx tsx subject-line-tester.ts --file subjects.txt
 */

interface SubjectAnalysis {
  subject: string
  length: number
  score: number
  grade: string
  checks: {
    category: string
    check: string
    status: 'pass' | 'warn' | 'fail'
    message: string
  }[]
  suggestions: string[]
}

// Spam trigger words to check
const SPAM_TRIGGERS = [
  'free', 'act now', 'limited time', 'urgent', 'buy now',
  'click here', 'order now', 'special offer', 'winner',
  'congratulations', 'guaranteed', 'no obligation',
  'risk free', 'double your', 'earn extra', 'extra income'
]

// Power words that can boost opens
const POWER_WORDS = [
  'new', 'exclusive', 'secret', 'discover', 'proven',
  'save', 'easy', 'quick', 'simple', 'best',
  'today', 'now', 'introducing', 'finally', 'announcing'
]

// Personalization tokens
const PERSONALIZATION = [
  '{{ first_name', '{{ name', '[first_name]', '[name]',
  'first_name|', 'name|'
]

function analyzeSubjectLine(subject: string): SubjectAnalysis {
  const checks: SubjectAnalysis['checks'] = []
  const suggestions: string[] = []

  // Length check
  const length = subject.length
  if (length > 60) {
    checks.push({
      category: 'Length',
      check: 'Character Count',
      status: 'fail',
      message: `${length} chars - will be truncated on mobile (aim for <50)`
    })
    suggestions.push('Shorten to under 50 characters for full mobile visibility')
  } else if (length > 50) {
    checks.push({
      category: 'Length',
      check: 'Character Count',
      status: 'warn',
      message: `${length} chars - may be truncated on some mobile clients`
    })
  } else if (length < 20) {
    checks.push({
      category: 'Length',
      check: 'Character Count',
      status: 'warn',
      message: `${length} chars - very short, consider adding more context`
    })
  } else {
    checks.push({
      category: 'Length',
      check: 'Character Count',
      status: 'pass',
      message: `${length} chars - good length for all devices`
    })
  }

  // Word count
  const wordCount = subject.split(/\s+/).length
  if (wordCount > 9) {
    checks.push({
      category: 'Length',
      check: 'Word Count',
      status: 'warn',
      message: `${wordCount} words - consider reducing for better scannability`
    })
  } else {
    checks.push({
      category: 'Length',
      check: 'Word Count',
      status: 'pass',
      message: `${wordCount} words - good for quick reading`
    })
  }

  // Spam trigger check
  const foundSpam = SPAM_TRIGGERS.filter(word =>
    subject.toLowerCase().includes(word.toLowerCase())
  )
  if (foundSpam.length > 0) {
    checks.push({
      category: 'Deliverability',
      check: 'Spam Triggers',
      status: 'warn',
      message: `Contains potential spam triggers: ${foundSpam.join(', ')}`
    })
    suggestions.push(`Consider removing or rephrasing: ${foundSpam.join(', ')}`)
  } else {
    checks.push({
      category: 'Deliverability',
      check: 'Spam Triggers',
      status: 'pass',
      message: 'No common spam trigger words detected'
    })
  }

  // All caps check
  const allCapsWords = subject.match(/\b[A-Z]{4,}\b/g) || []
  if (allCapsWords.length > 1) {
    checks.push({
      category: 'Deliverability',
      check: 'Caps Usage',
      status: 'warn',
      message: `Multiple ALL CAPS words: ${allCapsWords.join(', ')}`
    })
    suggestions.push('Reduce ALL CAPS usage - it can trigger spam filters and feels aggressive')
  } else if (allCapsWords.length === 1) {
    checks.push({
      category: 'Deliverability',
      check: 'Caps Usage',
      status: 'pass',
      message: 'Minimal caps usage'
    })
  } else {
    checks.push({
      category: 'Deliverability',
      check: 'Caps Usage',
      status: 'pass',
      message: 'No excessive caps'
    })
  }

  // Excessive punctuation
  const exclamations = (subject.match(/!/g) || []).length
  if (exclamations > 1) {
    checks.push({
      category: 'Deliverability',
      check: 'Punctuation',
      status: 'warn',
      message: `${exclamations} exclamation marks - consider reducing to 1 or none`
    })
    suggestions.push('Limit exclamation marks to one at most')
  } else {
    checks.push({
      category: 'Deliverability',
      check: 'Punctuation',
      status: 'pass',
      message: 'Appropriate punctuation'
    })
  }

  // Personalization check
  const hasPersonalization = PERSONALIZATION.some(token =>
    subject.includes(token)
  )
  if (hasPersonalization) {
    checks.push({
      category: 'Engagement',
      check: 'Personalization',
      status: 'pass',
      message: 'Contains personalization token - good for engagement'
    })
  } else {
    checks.push({
      category: 'Engagement',
      check: 'Personalization',
      status: 'warn',
      message: 'No personalization - consider adding {{ first_name }}'
    })
    suggestions.push('Consider adding personalization like {{ first_name }}')
  }

  // Power words check
  const foundPowerWords = POWER_WORDS.filter(word =>
    subject.toLowerCase().includes(word.toLowerCase())
  )
  if (foundPowerWords.length > 0) {
    checks.push({
      category: 'Engagement',
      check: 'Power Words',
      status: 'pass',
      message: `Contains power words: ${foundPowerWords.join(', ')}`
    })
  } else {
    checks.push({
      category: 'Engagement',
      check: 'Power Words',
      status: 'warn',
      message: 'No power words detected'
    })
    suggestions.push(`Consider adding a power word: ${POWER_WORDS.slice(0, 5).join(', ')}`)
  }

  // Emoji check
  const hasEmoji = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u.test(subject)
  if (hasEmoji) {
    checks.push({
      category: 'Engagement',
      check: 'Emoji',
      status: 'pass',
      message: 'Contains emoji - can boost open rates (test performance)'
    })
  } else {
    checks.push({
      category: 'Engagement',
      check: 'Emoji',
      status: 'pass',
      message: 'No emoji - professional look (consider A/B testing with emoji)'
    })
  }

  // Question check
  const isQuestion = subject.includes('?')
  if (isQuestion) {
    checks.push({
      category: 'Engagement',
      check: 'Question Format',
      status: 'pass',
      message: 'Question format can increase curiosity and opens'
    })
  }

  // Number check
  const hasNumber = /\d/.test(subject)
  if (hasNumber) {
    checks.push({
      category: 'Engagement',
      check: 'Numbers',
      status: 'pass',
      message: 'Contains numbers - can improve specificity and trust'
    })
  }

  // Calculate score
  const passCount = checks.filter(c => c.status === 'pass').length
  const warnCount = checks.filter(c => c.status === 'warn').length
  const failCount = checks.filter(c => c.status === 'fail').length

  const score = Math.round(
    ((passCount * 10) + (warnCount * 5) + (failCount * 0)) / checks.length * 10
  )

  let grade: string
  if (score >= 90) grade = 'A'
  else if (score >= 80) grade = 'B'
  else if (score >= 70) grade = 'C'
  else if (score >= 60) grade = 'D'
  else grade = 'F'

  return {
    subject,
    length,
    score,
    grade,
    checks,
    suggestions
  }
}

function printAnalysis(analysis: SubjectAnalysis): void {
  console.log('\n' + '='.repeat(70))
  console.log('SUBJECT LINE ANALYSIS')
  console.log('='.repeat(70))
  console.log(`Subject: "${analysis.subject}"`)
  console.log(`Length: ${analysis.length} characters`)
  console.log('-'.repeat(70))

  // Group by category
  const categories = [...new Set(analysis.checks.map(c => c.category))]

  for (const category of categories) {
    console.log(`\n${category}:`)
    const categoryChecks = analysis.checks.filter(c => c.category === category)

    for (const check of categoryChecks) {
      const icon = check.status === 'pass' ? '✅' :
                   check.status === 'warn' ? '⚠️' : '❌'
      console.log(`  ${icon} ${check.check}: ${check.message}`)
    }
  }

  console.log('\n' + '-'.repeat(70))
  console.log(`SCORE: ${analysis.score}/100`)
  console.log(`GRADE: ${analysis.grade}`)
  console.log('='.repeat(70))

  if (analysis.suggestions.length > 0) {
    console.log('\n💡 SUGGESTIONS:')
    analysis.suggestions.forEach((s, i) => {
      console.log(`${i + 1}. ${s}`)
    })
  } else {
    console.log('\n✨ Great subject line! Consider A/B testing variations.')
  }
}

function generateVariations(subject: string): string[] {
  const variations: string[] = []

  // Add personalization if not present
  if (!PERSONALIZATION.some(token => subject.includes(token))) {
    variations.push(`{{ first_name|default:"Hey" }}, ${subject.toLowerCase()}`)
  }

  // Question version
  if (!subject.includes('?')) {
    const words = subject.split(' ')
    if (words.length > 2) {
      variations.push(`${words.slice(0, -1).join(' ')}?`)
    }
  }

  // Add emoji
  if (!/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u.test(subject)) {
    variations.push(`${subject} ✨`)
    variations.push(`🎉 ${subject}`)
  }

  // Shorter version
  if (subject.length > 40) {
    const words = subject.split(' ')
    if (words.length > 5) {
      variations.push(words.slice(0, 5).join(' '))
    }
  }

  return variations.slice(0, 3) // Return max 3 variations
}

// CLI
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Subject Line Tester

Usage:
  npx tsx subject-line-tester.ts "Your subject line"
  npx tsx subject-line-tester.ts --file subjects.txt

Options:
  --file <path>     Test multiple subject lines from file (one per line)
  --json            Output as JSON
  --variations      Generate A/B test variations
  --help            Show this help

Examples:
  npx tsx subject-line-tester.ts "New arrivals just dropped!"
  npx tsx subject-line-tester.ts "{{ first_name }}, your cart is waiting" --variations
    `)
    process.exit(0)
  }

  const jsonOutput = args.includes('--json')
  const showVariations = args.includes('--variations')

  // Get subject line(s)
  let subjects: string[] = []

  const fileIdx = args.indexOf('--file')
  if (fileIdx !== -1) {
    const fs = await import('fs')
    const filePath = args[fileIdx + 1]
    if (!filePath || !fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`)
      process.exit(1)
    }
    subjects = fs.readFileSync(filePath, 'utf-8')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
  } else {
    // Get subject from args (not flags)
    const subject = args.find(a => !a.startsWith('--'))
    if (subject) {
      subjects = [subject]
    }
  }

  if (subjects.length === 0) {
    console.error('Error: No subject line provided')
    process.exit(1)
  }

  const analyses = subjects.map(s => analyzeSubjectLine(s))

  if (jsonOutput) {
    console.log(JSON.stringify(analyses, null, 2))
  } else {
    for (const analysis of analyses) {
      printAnalysis(analysis)

      if (showVariations) {
        const variations = generateVariations(analysis.subject)
        if (variations.length > 0) {
          console.log('\n🔄 A/B TEST VARIATIONS:')
          variations.forEach((v, i) => {
            console.log(`  ${String.fromCharCode(65 + i)}. "${v}"`)
          })
        }
      }

      if (analyses.length > 1) {
        console.log('\n')
      }
    }

    // Summary for multiple subjects
    if (analyses.length > 1) {
      console.log('='.repeat(70))
      console.log('SUMMARY')
      console.log('='.repeat(70))
      console.log(`Analyzed: ${analyses.length} subject lines`)
      console.log(`Average Score: ${Math.round(analyses.reduce((s, a) => s + a.score, 0) / analyses.length)}/100`)

      const best = analyses.reduce((a, b) => a.score > b.score ? a : b)
      console.log(`Best: "${best.subject}" (${best.score}/100)`)
    }
  }

  // Exit with appropriate code
  const avgScore = analyses.reduce((s, a) => s + a.score, 0) / analyses.length
  process.exit(avgScore >= 70 ? 0 : 1)
}

main()
