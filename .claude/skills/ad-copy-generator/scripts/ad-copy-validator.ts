#!/usr/bin/env npx tsx

/**
 * Ad Copy Validator
 *
 * Validates ad copy against platform character limits and policies.
 *
 * Usage:
 *   npx tsx ad-copy-validator.ts --platform google --type rsa --file ads.json
 *   npx tsx ad-copy-validator.ts --platform meta --headline "Your headline"
 */

interface ValidationResult {
  element: string
  value: string
  length: number
  limit: number
  status: 'pass' | 'warn' | 'fail'
  message: string
}

interface AdValidation {
  platform: string
  type: string
  timestamp: string
  results: ValidationResult[]
  score: number
  grade: string
  issues: string[]
}

// Platform limits
const LIMITS = {
  google: {
    rsa: {
      headline: 30,
      description: 90,
      path: 15
    },
    pmax: {
      headline: 30,
      longHeadline: 90,
      description: 90,
      businessName: 25
    },
    display: {
      headline: 30,
      longHeadline: 90,
      description: 90,
      businessName: 25
    }
  },
  meta: {
    feed: {
      primaryText: 1000,
      primaryTextVisible: 125,
      headline: 40,
      linkDescription: 30
    },
    stories: {
      primaryText: 1000,
      primaryTextVisible: 125,
      headline: 40
    }
  }
}

// Policy checks
const POLICY_CHECKS = {
  google: {
    allCaps: /\b[A-Z]{4,}\b/g,
    excessivePunctuation: /[!?]{2,}|\.{4,}/g,
    restrictedSymbols: /[★☆✓✔✗✘►▶]/g,
    spamWords: /\b(free|click here|act now|limited time|buy now|order now)\b/gi
  },
  meta: {
    personalAttributes: /\b(are you|do you have|suffering from)\b/gi,
    clickbait: /\b(you won't believe|shocking|this one trick)\b/gi,
    allCaps: /\b[A-Z]{5,}\b/g
  }
}

function validateGoogleRSA(headlines: string[], descriptions: string[], paths?: string[]): AdValidation {
  const results: ValidationResult[] = []
  const issues: string[] = []

  // Validate headlines
  headlines.forEach((headline, i) => {
    const length = headline.length
    const limit = LIMITS.google.rsa.headline

    results.push({
      element: `Headline ${i + 1}`,
      value: headline,
      length,
      limit,
      status: length <= limit ? 'pass' : 'fail',
      message: length <= limit
        ? `${length}/${limit} characters`
        : `Too long: ${length}/${limit} (${length - limit} over)`
    })

    if (length > limit) {
      issues.push(`Headline ${i + 1} exceeds limit by ${length - limit} characters`)
    }

    // Policy checks
    if (POLICY_CHECKS.google.allCaps.test(headline)) {
      results.push({
        element: `Headline ${i + 1} - Policy`,
        value: headline,
        length,
        limit,
        status: 'warn',
        message: 'Contains ALL CAPS words (policy violation)'
      })
      issues.push(`Headline ${i + 1}: Remove ALL CAPS`)
    }
  })

  // Validate descriptions
  descriptions.forEach((desc, i) => {
    const length = desc.length
    const limit = LIMITS.google.rsa.description

    results.push({
      element: `Description ${i + 1}`,
      value: desc,
      length,
      limit,
      status: length <= limit ? 'pass' : 'fail',
      message: length <= limit
        ? `${length}/${limit} characters`
        : `Too long: ${length}/${limit} (${length - limit} over)`
    })

    if (length > limit) {
      issues.push(`Description ${i + 1} exceeds limit by ${length - limit} characters`)
    }

    // Excessive punctuation check
    if (POLICY_CHECKS.google.excessivePunctuation.test(desc)) {
      results.push({
        element: `Description ${i + 1} - Policy`,
        value: desc,
        length,
        limit,
        status: 'warn',
        message: 'Contains excessive punctuation'
      })
      issues.push(`Description ${i + 1}: Reduce punctuation`)
    }
  })

  // Validate paths
  if (paths) {
    paths.forEach((path, i) => {
      const length = path.length
      const limit = LIMITS.google.rsa.path

      results.push({
        element: `Path ${i + 1}`,
        value: path,
        length,
        limit,
        status: length <= limit ? 'pass' : 'fail',
        message: length <= limit
          ? `${length}/${limit} characters`
          : `Too long: ${length}/${limit}`
      })
    })
  }

  // Check minimums
  if (headlines.length < 3) {
    issues.push('Minimum 3 headlines required')
  } else if (headlines.length < 8) {
    issues.push('Recommend 8-15 headlines for better performance')
  }

  if (descriptions.length < 2) {
    issues.push('Minimum 2 descriptions required')
  }

  // Calculate score
  const passCount = results.filter(r => r.status === 'pass').length
  const warnCount = results.filter(r => r.status === 'warn').length
  const failCount = results.filter(r => r.status === 'fail').length

  const score = Math.round(
    ((passCount * 10) + (warnCount * 5)) / results.length * 10
  )

  let grade: string
  if (failCount > 0) grade = 'F'
  else if (score >= 90) grade = 'A'
  else if (score >= 80) grade = 'B'
  else if (score >= 70) grade = 'C'
  else grade = 'D'

  return {
    platform: 'Google',
    type: 'RSA',
    timestamp: new Date().toISOString(),
    results,
    score,
    grade,
    issues
  }
}

function validateMetaAd(
  primaryText: string,
  headline: string,
  linkDescription?: string
): AdValidation {
  const results: ValidationResult[] = []
  const issues: string[] = []

  // Primary text
  const ptLength = primaryText.length
  const ptLimit = LIMITS.meta.feed.primaryText
  const ptVisibleLimit = LIMITS.meta.feed.primaryTextVisible

  results.push({
    element: 'Primary Text',
    value: primaryText.substring(0, 100) + (ptLength > 100 ? '...' : ''),
    length: ptLength,
    limit: ptLimit,
    status: ptLength <= ptLimit ? 'pass' : 'fail',
    message: ptLength <= ptLimit
      ? `${ptLength}/${ptLimit} characters`
      : `Too long: ${ptLength}/${ptLimit}`
  })

  // Visibility warning
  if (ptLength > ptVisibleLimit) {
    results.push({
      element: 'Primary Text - Visibility',
      value: primaryText.substring(0, 100) + '...',
      length: ptLength,
      limit: ptVisibleLimit,
      status: 'warn',
      message: `Only first ${ptVisibleLimit} chars visible without "See More" (${ptLength} total)`
    })
  }

  // Headline
  const hLength = headline.length
  const hLimit = LIMITS.meta.feed.headline

  results.push({
    element: 'Headline',
    value: headline,
    length: hLength,
    limit: hLimit,
    status: hLength <= hLimit ? 'pass' : 'fail',
    message: hLength <= hLimit
      ? `${hLength}/${hLimit} characters`
      : `Too long: ${hLength}/${hLimit} (${hLength - hLimit} over)`
  })

  if (hLength > hLimit) {
    issues.push(`Headline exceeds limit by ${hLength - hLimit} characters`)
  }

  // Link description
  if (linkDescription) {
    const ldLength = linkDescription.length
    const ldLimit = LIMITS.meta.feed.linkDescription

    results.push({
      element: 'Link Description',
      value: linkDescription,
      length: ldLength,
      limit: ldLimit,
      status: ldLength <= ldLimit ? 'pass' : 'fail',
      message: ldLength <= ldLimit
        ? `${ldLength}/${ldLimit} characters`
        : `Too long: ${ldLength}/${ldLimit}`
    })
  }

  // Policy checks
  if (POLICY_CHECKS.meta.personalAttributes.test(primaryText)) {
    results.push({
      element: 'Primary Text - Policy',
      value: 'Policy check',
      length: 0,
      limit: 0,
      status: 'warn',
      message: 'May contain personal attributes (policy risk)'
    })
    issues.push('Avoid personal attribute questions ("Are you...", "Do you have...")')
  }

  if (POLICY_CHECKS.meta.clickbait.test(primaryText)) {
    results.push({
      element: 'Primary Text - Policy',
      value: 'Policy check',
      length: 0,
      limit: 0,
      status: 'warn',
      message: 'May contain clickbait language (policy risk)'
    })
    issues.push('Remove clickbait phrases')
  }

  // Calculate score
  const passCount = results.filter(r => r.status === 'pass').length
  const warnCount = results.filter(r => r.status === 'warn').length
  const failCount = results.filter(r => r.status === 'fail').length

  const score = failCount > 0 ? 50 : Math.round(
    ((passCount * 10) + (warnCount * 5)) / results.length * 10
  )

  let grade: string
  if (failCount > 0) grade = 'F'
  else if (score >= 90) grade = 'A'
  else if (score >= 80) grade = 'B'
  else if (score >= 70) grade = 'C'
  else grade = 'D'

  return {
    platform: 'Meta',
    type: 'Feed Ad',
    timestamp: new Date().toISOString(),
    results,
    score,
    grade,
    issues
  }
}

function printValidation(validation: AdValidation): void {
  console.log('\n' + '='.repeat(70))
  console.log(`${validation.platform} ${validation.type} VALIDATION`)
  console.log('='.repeat(70))
  console.log(`Timestamp: ${validation.timestamp}`)
  console.log('-'.repeat(70))

  for (const result of validation.results) {
    const icon = result.status === 'pass' ? '✅' :
                 result.status === 'warn' ? '⚠️' : '❌'
    console.log(`\n${icon} ${result.element}`)
    if (result.value && result.value.length <= 50) {
      console.log(`   "${result.value}"`)
    }
    console.log(`   ${result.message}`)
  }

  console.log('\n' + '-'.repeat(70))
  console.log(`SCORE: ${validation.score}/100`)
  console.log(`GRADE: ${validation.grade}`)
  console.log('='.repeat(70))

  if (validation.issues.length > 0) {
    console.log('\n🚨 ISSUES TO FIX:')
    validation.issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`)
    })
  } else {
    console.log('\n✨ All checks passed!')
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Ad Copy Validator

Usage:
  npx tsx ad-copy-validator.ts --platform <platform> [options]

Platforms:
  google    Google Ads (RSA, PMax, Display)
  meta      Meta/Facebook Ads

Options:
  --platform <name>     Platform: google or meta (required)
  --type <type>         Ad type: rsa, pmax, display, feed
  --headlines "h1,h2"   Comma-separated headlines
  --descriptions "d1"   Comma-separated descriptions
  --primary-text "..."  Meta primary text
  --headline "..."      Single headline
  --link-desc "..."     Meta link description
  --json                Output as JSON
  --help                Show this help

Examples:
  # Validate Google RSA
  npx tsx ad-copy-validator.ts --platform google --type rsa \\
    --headlines "Shop Organic Online,Free Shipping Over $99" \\
    --descriptions "Quality organic products delivered to your door."

  # Validate Meta Ad
  npx tsx ad-copy-validator.ts --platform meta \\
    --primary-text "Discover our organic range..." \\
    --headline "Shop Organic Today"
    `)
    process.exit(0)
  }

  const platformIdx = args.indexOf('--platform')
  const typeIdx = args.indexOf('--type')
  const headlinesIdx = args.indexOf('--headlines')
  const descriptionsIdx = args.indexOf('--descriptions')
  const primaryTextIdx = args.indexOf('--primary-text')
  const headlineIdx = args.indexOf('--headline')
  const linkDescIdx = args.indexOf('--link-desc')
  const jsonOutput = args.includes('--json')

  if (platformIdx === -1) {
    console.error('Error: --platform is required')
    process.exit(1)
  }

  const platform = args[platformIdx + 1]?.toLowerCase()

  let validation: AdValidation

  if (platform === 'google') {
    const type = typeIdx !== -1 ? args[typeIdx + 1] : 'rsa'
    const headlines = headlinesIdx !== -1
      ? args[headlinesIdx + 1].split(',').map(h => h.trim())
      : []
    const descriptions = descriptionsIdx !== -1
      ? args[descriptionsIdx + 1].split(',').map(d => d.trim())
      : []

    if (headlines.length === 0) {
      console.error('Error: --headlines required for Google Ads')
      process.exit(1)
    }

    validation = validateGoogleRSA(headlines, descriptions)

  } else if (platform === 'meta') {
    const primaryText = primaryTextIdx !== -1 ? args[primaryTextIdx + 1] : ''
    const headline = headlineIdx !== -1 ? args[headlineIdx + 1] : ''
    const linkDesc = linkDescIdx !== -1 ? args[linkDescIdx + 1] : undefined

    if (!primaryText && !headline) {
      console.error('Error: --primary-text or --headline required for Meta Ads')
      process.exit(1)
    }

    validation = validateMetaAd(primaryText, headline, linkDesc)

  } else {
    console.error(`Error: Unknown platform: ${platform}`)
    process.exit(1)
  }

  if (jsonOutput) {
    console.log(JSON.stringify(validation, null, 2))
  } else {
    printValidation(validation)
  }

  // Exit with appropriate code
  const hasFails = validation.results.some(r => r.status === 'fail')
  process.exit(hasFails ? 1 : 0)
}

main()
