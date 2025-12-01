#!/usr/bin/env npx tsx

/**
 * Caption Analyzer
 *
 * Analyzes social media captions for engagement optimization.
 *
 * Usage:
 *   npx tsx caption-analyzer.ts --platform instagram "Your caption here"
 *   npx tsx caption-analyzer.ts --platform linkedin --file caption.txt
 */

interface AnalysisResult {
  category: string
  check: string
  status: 'pass' | 'warn' | 'fail'
  message: string
}

interface CaptionAnalysis {
  platform: string
  caption: string
  charCount: number
  wordCount: number
  hashtagCount: number
  emojiCount: number
  results: AnalysisResult[]
  score: number
  grade: string
  suggestions: string[]
}

// Platform limits
const PLATFORM_LIMITS = {
  instagram: { chars: 2200, optimalChars: 200, hashtags: 30, optimalHashtags: 10 },
  facebook: { chars: 63206, optimalChars: 80, hashtags: 10, optimalHashtags: 2 },
  linkedin: { chars: 3000, optimalChars: 300, hashtags: 10, optimalHashtags: 4 },
  twitter: { chars: 280, optimalChars: 120, hashtags: 10, optimalHashtags: 2 }
}

// Hook patterns
const HOOK_PATTERNS = [
  /^(did you know|here's|this is|stop|don't|the secret|[0-9]+ (ways|tips|reasons))/i,
  /^(how to|what if|why do|are you|have you|ever wonder)/i,
  /^\p{Emoji}/u, // Starts with emoji
  /^[A-Z]{2,}/  // Starts with caps
]

// CTA patterns
const CTA_PATTERNS = [
  /\b(comment|share|tag|save|follow|click|shop|link in bio|dm|message)\b/i,
  /\b(let me know|what do you think|tell me|drop|double tap)\b/i,
  /\b(swipe|check out|visit|sign up|subscribe)\b/i,
  /👇|⬇️|🔗|📌/
]

// Count emojis
function countEmojis(text: string): number {
  const emojiRegex = /\p{Emoji}/gu
  return (text.match(emojiRegex) || []).length
}

// Count hashtags
function countHashtags(text: string): number {
  return (text.match(/#\w+/g) || []).length
}

// Check for hook
function hasHook(text: string): boolean {
  const firstLine = text.split('\n')[0]
  return HOOK_PATTERNS.some(pattern => pattern.test(firstLine))
}

// Check for CTA
function hasCTA(text: string): boolean {
  return CTA_PATTERNS.some(pattern => pattern.test(text))
}

// Check for line breaks
function hasLineBreaks(text: string): boolean {
  return text.includes('\n\n') || (text.match(/\n/g) || []).length >= 2
}

// Analyze caption
function analyzeCaption(caption: string, platform: string): CaptionAnalysis {
  const limits = PLATFORM_LIMITS[platform as keyof typeof PLATFORM_LIMITS]
  if (!limits) {
    throw new Error(`Unknown platform: ${platform}`)
  }

  const results: AnalysisResult[] = []
  const suggestions: string[] = []

  const charCount = caption.length
  const wordCount = caption.split(/\s+/).filter(w => w.length > 0).length
  const hashtagCount = countHashtags(caption)
  const emojiCount = countEmojis(caption)

  // Character count check
  if (charCount > limits.chars) {
    results.push({
      category: 'Length',
      check: 'Character Count',
      status: 'fail',
      message: `${charCount}/${limits.chars} - exceeds limit by ${charCount - limits.chars}`
    })
    suggestions.push('Shorten caption to fit platform limit')
  } else if (charCount > limits.optimalChars * 3) {
    results.push({
      category: 'Length',
      check: 'Character Count',
      status: 'warn',
      message: `${charCount} chars - quite long (optimal: ~${limits.optimalChars})`
    })
  } else {
    results.push({
      category: 'Length',
      check: 'Character Count',
      status: 'pass',
      message: `${charCount} characters - within optimal range`
    })
  }

  // Hashtag check
  if (hashtagCount > limits.hashtags) {
    results.push({
      category: 'Hashtags',
      check: 'Hashtag Count',
      status: 'fail',
      message: `${hashtagCount} hashtags - exceeds max of ${limits.hashtags}`
    })
    suggestions.push(`Reduce to ${limits.hashtags} hashtags or fewer`)
  } else if (platform === 'instagram' && hashtagCount === 0) {
    results.push({
      category: 'Hashtags',
      check: 'Hashtag Count',
      status: 'warn',
      message: 'No hashtags - consider adding 5-15 for reach'
    })
    suggestions.push('Add relevant hashtags for discoverability')
  } else if (platform === 'instagram' && hashtagCount > 0 && hashtagCount < 5) {
    results.push({
      category: 'Hashtags',
      check: 'Hashtag Count',
      status: 'warn',
      message: `${hashtagCount} hashtags - consider adding more (optimal: 5-15)`
    })
  } else {
    results.push({
      category: 'Hashtags',
      check: 'Hashtag Count',
      status: 'pass',
      message: `${hashtagCount} hashtags - good amount`
    })
  }

  // Hook check
  if (hasHook(caption)) {
    results.push({
      category: 'Engagement',
      check: 'Hook',
      status: 'pass',
      message: 'Strong hook detected in opening'
    })
  } else {
    results.push({
      category: 'Engagement',
      check: 'Hook',
      status: 'warn',
      message: 'Consider starting with a stronger hook'
    })
    suggestions.push('Start with a question, number, or attention-grabbing statement')
  }

  // CTA check
  if (hasCTA(caption)) {
    results.push({
      category: 'Engagement',
      check: 'Call to Action',
      status: 'pass',
      message: 'CTA detected - good for engagement'
    })
  } else {
    results.push({
      category: 'Engagement',
      check: 'Call to Action',
      status: 'warn',
      message: 'No clear CTA - consider adding one'
    })
    suggestions.push('Add a call to action (question, save prompt, or comment request)')
  }

  // Readability - line breaks
  if (charCount > 200) {
    if (hasLineBreaks(caption)) {
      results.push({
        category: 'Readability',
        check: 'Formatting',
        status: 'pass',
        message: 'Good use of line breaks for readability'
      })
    } else {
      results.push({
        category: 'Readability',
        check: 'Formatting',
        status: 'warn',
        message: 'Long caption without line breaks - consider breaking up'
      })
      suggestions.push('Add line breaks to improve scannability')
    }
  }

  // Emoji check
  if (platform === 'instagram' || platform === 'facebook') {
    if (emojiCount === 0) {
      results.push({
        category: 'Engagement',
        check: 'Emojis',
        status: 'warn',
        message: 'No emojis - consider adding for visual appeal'
      })
    } else if (emojiCount > 15) {
      results.push({
        category: 'Engagement',
        check: 'Emojis',
        status: 'warn',
        message: `${emojiCount} emojis - may be excessive`
      })
    } else {
      results.push({
        category: 'Engagement',
        check: 'Emojis',
        status: 'pass',
        message: `${emojiCount} emojis - good visual appeal`
      })
    }
  }

  // LinkedIn-specific
  if (platform === 'linkedin') {
    // Check for professional tone
    const casualWords = caption.match(/\b(lol|omg|tbh|ngl|fr|bruh)\b/gi) || []
    if (casualWords.length > 0) {
      results.push({
        category: 'Tone',
        check: 'Professional Language',
        status: 'warn',
        message: `Casual language detected: ${casualWords.join(', ')}`
      })
      suggestions.push('Consider more professional language for LinkedIn')
    }
  }

  // Calculate score
  const passCount = results.filter(r => r.status === 'pass').length
  const warnCount = results.filter(r => r.status === 'warn').length
  const failCount = results.filter(r => r.status === 'fail').length

  const score = failCount > 0
    ? Math.min(50, Math.round(((passCount * 10) + (warnCount * 5)) / results.length * 10))
    : Math.round(((passCount * 10) + (warnCount * 5)) / results.length * 10)

  let grade: string
  if (failCount > 0) grade = 'F'
  else if (score >= 90) grade = 'A'
  else if (score >= 80) grade = 'B'
  else if (score >= 70) grade = 'C'
  else if (score >= 60) grade = 'D'
  else grade = 'F'

  return {
    platform,
    caption: caption.substring(0, 100) + (caption.length > 100 ? '...' : ''),
    charCount,
    wordCount,
    hashtagCount,
    emojiCount,
    results,
    score,
    grade,
    suggestions
  }
}

// Print analysis
function printAnalysis(analysis: CaptionAnalysis): void {
  console.log('\n' + '='.repeat(60))
  console.log(`${analysis.platform.toUpperCase()} CAPTION ANALYSIS`)
  console.log('='.repeat(60))
  console.log(`Characters: ${analysis.charCount}`)
  console.log(`Words: ${analysis.wordCount}`)
  console.log(`Hashtags: ${analysis.hashtagCount}`)
  console.log(`Emojis: ${analysis.emojiCount}`)
  console.log('-'.repeat(60))

  // Group by category
  const categories = [...new Set(analysis.results.map(r => r.category))]

  for (const category of categories) {
    console.log(`\n${category}:`)
    const categoryResults = analysis.results.filter(r => r.category === category)

    for (const result of categoryResults) {
      const icon = result.status === 'pass' ? '✅' :
                   result.status === 'warn' ? '⚠️' : '❌'
      console.log(`  ${icon} ${result.check}: ${result.message}`)
    }
  }

  console.log('\n' + '-'.repeat(60))
  console.log(`SCORE: ${analysis.score}/100`)
  console.log(`GRADE: ${analysis.grade}`)
  console.log('='.repeat(60))

  if (analysis.suggestions.length > 0) {
    console.log('\n💡 SUGGESTIONS:')
    analysis.suggestions.forEach((s, i) => {
      console.log(`${i + 1}. ${s}`)
    })
  } else {
    console.log('\n✨ Great caption! Ready to post.')
  }
}

// Generate improved version
function suggestImprovements(caption: string, platform: string): string[] {
  const improvements: string[] = []

  if (!hasHook(caption)) {
    improvements.push('Try starting with: "Did you know..." or "Here\'s why..."')
  }

  if (!hasCTA(caption)) {
    improvements.push('Add a CTA like: "What do you think?" or "Save this for later 📌"')
  }

  if (countEmojis(caption) === 0 && (platform === 'instagram' || platform === 'facebook')) {
    improvements.push('Add 2-3 relevant emojis to increase visual appeal')
  }

  return improvements
}

// CLI
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Caption Analyzer

Usage:
  npx tsx caption-analyzer.ts --platform <platform> "caption text"
  npx tsx caption-analyzer.ts --platform <platform> --file <path>

Platforms:
  instagram, facebook, linkedin, twitter

Options:
  --platform <name>   Platform to analyze for (required)
  --file <path>       Read caption from file
  --json              Output as JSON
  --help              Show this help

Examples:
  npx tsx caption-analyzer.ts --platform instagram "Check out our new product! 🌟"
  npx tsx caption-analyzer.ts --platform linkedin --file post.txt
    `)
    process.exit(0)
  }

  const platformIdx = args.indexOf('--platform')
  const fileIdx = args.indexOf('--file')
  const jsonOutput = args.includes('--json')

  if (platformIdx === -1) {
    console.error('Error: --platform is required')
    process.exit(1)
  }

  const platform = args[platformIdx + 1]?.toLowerCase()

  let caption: string

  if (fileIdx !== -1) {
    const fs = await import('fs')
    const filePath = args[fileIdx + 1]
    if (!filePath || !fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`)
      process.exit(1)
    }
    caption = fs.readFileSync(filePath, 'utf-8')
  } else {
    // Find caption (first arg that's not a flag)
    caption = args.find((a, i) =>
      !a.startsWith('--') &&
      args[i - 1] !== '--platform' &&
      args[i - 1] !== '--file'
    ) || ''
  }

  if (!caption) {
    console.error('Error: No caption provided')
    process.exit(1)
  }

  try {
    const analysis = analyzeCaption(caption, platform)

    if (jsonOutput) {
      console.log(JSON.stringify(analysis, null, 2))
    } else {
      printAnalysis(analysis)

      const improvements = suggestImprovements(caption, platform)
      if (improvements.length > 0) {
        console.log('\n🔧 QUICK IMPROVEMENTS:')
        improvements.forEach(imp => console.log(`  • ${imp}`))
      }
    }

    process.exit(analysis.score >= 70 ? 0 : 1)
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}

main()
