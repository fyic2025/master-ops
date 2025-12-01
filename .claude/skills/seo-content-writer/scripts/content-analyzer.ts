#!/usr/bin/env npx tsx

/**
 * SEO Content Analyzer
 *
 * Analyzes content for SEO quality, readability, and optimization.
 *
 * Usage:
 *   npx tsx content-analyzer.ts --file content.txt --keyword "primary keyword"
 *   npx tsx content-analyzer.ts --url https://example.com/page --keyword "keyword"
 */

import * as fs from 'fs'

interface AnalysisResult {
  category: string
  metric: string
  value: string | number
  status: 'good' | 'warning' | 'poor'
  recommendation?: string
}

interface ContentAnalysis {
  url?: string
  keyword: string
  timestamp: string
  wordCount: number
  readingTime: number
  results: AnalysisResult[]
  score: number
  grade: string
}

// Calculate word count
function getWordCount(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length
}

// Calculate reading time (200 wpm average)
function getReadingTime(wordCount: number): number {
  return Math.ceil(wordCount / 200)
}

// Calculate keyword density
function getKeywordDensity(text: string, keyword: string): number {
  const words = text.toLowerCase().split(/\s+/)
  const keywordWords = keyword.toLowerCase().split(/\s+/)
  let count = 0

  for (let i = 0; i <= words.length - keywordWords.length; i++) {
    const phrase = words.slice(i, i + keywordWords.length).join(' ')
    if (phrase === keyword.toLowerCase()) {
      count++
    }
  }

  return (count / words.length) * 100
}

// Count headings
function countHeadings(text: string): { h1: number; h2: number; h3: number } {
  const h1 = (text.match(/^#\s|<h1/gim) || []).length
  const h2 = (text.match(/^##\s|<h2/gim) || []).length
  const h3 = (text.match(/^###\s|<h3/gim) || []).length
  return { h1, h2, h3 }
}

// Check if keyword is in first paragraph
function keywordInFirstParagraph(text: string, keyword: string): boolean {
  const firstParagraph = text.split(/\n\n/)[0] || text.slice(0, 500)
  return firstParagraph.toLowerCase().includes(keyword.toLowerCase())
}

// Count internal and external links
function countLinks(text: string): { internal: number; external: number } {
  const internalMatches = text.match(/\[.*?\]\(\/[^)]+\)|href="\/[^"]+"/g) || []
  const externalMatches = text.match(/\[.*?\]\(https?:\/\/[^)]+\)|href="https?:\/\/[^"]+"/g) || []
  return {
    internal: internalMatches.length,
    external: externalMatches.length
  }
}

// Calculate average sentence length
function getAvgSentenceLength(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length === 0) return 0
  const totalWords = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0)
  return Math.round(totalWords / sentences.length)
}

// Calculate average paragraph length
function getAvgParagraphLength(text: string): number {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)
  if (paragraphs.length === 0) return 0
  const totalSentences = paragraphs.reduce((sum, p) => {
    return sum + (p.match(/[.!?]+/g) || []).length
  }, 0)
  return Math.round(totalSentences / paragraphs.length)
}

// Check for passive voice (simple detection)
function getPassiveVoicePercentage(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length === 0) return 0

  const passivePatterns = [
    /\b(is|are|was|were|been|being)\s+\w+ed\b/gi,
    /\b(is|are|was|were|been|being)\s+\w+en\b/gi,
  ]

  let passiveCount = 0
  for (const sentence of sentences) {
    for (const pattern of passivePatterns) {
      if (pattern.test(sentence)) {
        passiveCount++
        break
      }
    }
  }

  return Math.round((passiveCount / sentences.length) * 100)
}

// Main analysis function
function analyzeContent(text: string, keyword: string): ContentAnalysis {
  const results: AnalysisResult[] = []
  const wordCount = getWordCount(text)
  const readingTime = getReadingTime(wordCount)

  // Word count analysis
  if (wordCount < 300) {
    results.push({
      category: 'Content Length',
      metric: 'Word Count',
      value: wordCount,
      status: 'poor',
      recommendation: 'Content is too short. Aim for at least 1,000 words for blog posts.'
    })
  } else if (wordCount < 1000) {
    results.push({
      category: 'Content Length',
      metric: 'Word Count',
      value: wordCount,
      status: 'warning',
      recommendation: 'Consider expanding to 1,000-1,500 words for better SEO.'
    })
  } else {
    results.push({
      category: 'Content Length',
      metric: 'Word Count',
      value: wordCount,
      status: 'good'
    })
  }

  // Keyword density
  const density = getKeywordDensity(text, keyword)
  if (density < 0.5) {
    results.push({
      category: 'Keyword Optimization',
      metric: 'Keyword Density',
      value: `${density.toFixed(2)}%`,
      status: 'warning',
      recommendation: 'Keyword density is low. Include the keyword more naturally.'
    })
  } else if (density > 3) {
    results.push({
      category: 'Keyword Optimization',
      metric: 'Keyword Density',
      value: `${density.toFixed(2)}%`,
      status: 'poor',
      recommendation: 'Keyword density is too high. Reduce to avoid keyword stuffing.'
    })
  } else {
    results.push({
      category: 'Keyword Optimization',
      metric: 'Keyword Density',
      value: `${density.toFixed(2)}%`,
      status: 'good'
    })
  }

  // Keyword in first paragraph
  const keywordInFirst = keywordInFirstParagraph(text, keyword)
  results.push({
    category: 'Keyword Optimization',
    metric: 'Keyword in First 100 Words',
    value: keywordInFirst ? 'Yes' : 'No',
    status: keywordInFirst ? 'good' : 'warning',
    recommendation: keywordInFirst ? undefined : 'Include the primary keyword in the first paragraph.'
  })

  // Headings analysis
  const headings = countHeadings(text)
  if (headings.h1 === 0) {
    results.push({
      category: 'Structure',
      metric: 'H1 Heading',
      value: headings.h1,
      status: 'poor',
      recommendation: 'Add an H1 heading with the primary keyword.'
    })
  } else if (headings.h1 > 1) {
    results.push({
      category: 'Structure',
      metric: 'H1 Heading',
      value: headings.h1,
      status: 'warning',
      recommendation: 'Use only one H1 heading per page.'
    })
  } else {
    results.push({
      category: 'Structure',
      metric: 'H1 Heading',
      value: headings.h1,
      status: 'good'
    })
  }

  // H2 headings
  const expectedH2s = Math.floor(wordCount / 300)
  if (headings.h2 < expectedH2s - 1) {
    results.push({
      category: 'Structure',
      metric: 'H2 Headings',
      value: headings.h2,
      status: 'warning',
      recommendation: `Add more H2 headings. Aim for one every 200-300 words (${expectedH2s} expected).`
    })
  } else {
    results.push({
      category: 'Structure',
      metric: 'H2 Headings',
      value: headings.h2,
      status: 'good'
    })
  }

  // Links analysis
  const links = countLinks(text)
  const expectedInternalLinks = Math.max(2, Math.floor(wordCount / 500))

  if (links.internal < expectedInternalLinks) {
    results.push({
      category: 'Links',
      metric: 'Internal Links',
      value: links.internal,
      status: 'warning',
      recommendation: `Add more internal links. Aim for ${expectedInternalLinks} for this content length.`
    })
  } else {
    results.push({
      category: 'Links',
      metric: 'Internal Links',
      value: links.internal,
      status: 'good'
    })
  }

  if (links.external === 0) {
    results.push({
      category: 'Links',
      metric: 'External Links',
      value: links.external,
      status: 'warning',
      recommendation: 'Add 1-2 links to authoritative external sources.'
    })
  } else {
    results.push({
      category: 'Links',
      metric: 'External Links',
      value: links.external,
      status: 'good'
    })
  }

  // Readability - sentence length
  const avgSentence = getAvgSentenceLength(text)
  if (avgSentence > 25) {
    results.push({
      category: 'Readability',
      metric: 'Avg Sentence Length',
      value: `${avgSentence} words`,
      status: 'warning',
      recommendation: 'Sentences are too long. Aim for 15-20 words average.'
    })
  } else if (avgSentence < 10) {
    results.push({
      category: 'Readability',
      metric: 'Avg Sentence Length',
      value: `${avgSentence} words`,
      status: 'warning',
      recommendation: 'Sentences are very short. Vary sentence length for better flow.'
    })
  } else {
    results.push({
      category: 'Readability',
      metric: 'Avg Sentence Length',
      value: `${avgSentence} words`,
      status: 'good'
    })
  }

  // Readability - paragraph length
  const avgParagraph = getAvgParagraphLength(text)
  if (avgParagraph > 5) {
    results.push({
      category: 'Readability',
      metric: 'Avg Paragraph Length',
      value: `${avgParagraph} sentences`,
      status: 'warning',
      recommendation: 'Paragraphs are too long. Keep to 2-3 sentences max.'
    })
  } else {
    results.push({
      category: 'Readability',
      metric: 'Avg Paragraph Length',
      value: `${avgParagraph} sentences`,
      status: 'good'
    })
  }

  // Passive voice
  const passivePercent = getPassiveVoicePercentage(text)
  if (passivePercent > 20) {
    results.push({
      category: 'Readability',
      metric: 'Passive Voice',
      value: `${passivePercent}%`,
      status: 'warning',
      recommendation: 'Too much passive voice. Use active voice for better engagement.'
    })
  } else {
    results.push({
      category: 'Readability',
      metric: 'Passive Voice',
      value: `${passivePercent}%`,
      status: 'good'
    })
  }

  // Calculate score
  const goodCount = results.filter(r => r.status === 'good').length
  const warningCount = results.filter(r => r.status === 'warning').length
  const poorCount = results.filter(r => r.status === 'poor').length

  const score = Math.round(
    ((goodCount * 10) + (warningCount * 5) + (poorCount * 0)) / results.length * 10
  )

  let grade: string
  if (score >= 90) grade = 'A'
  else if (score >= 80) grade = 'B'
  else if (score >= 70) grade = 'C'
  else if (score >= 60) grade = 'D'
  else grade = 'F'

  return {
    keyword,
    timestamp: new Date().toISOString(),
    wordCount,
    readingTime,
    results,
    score,
    grade
  }
}

// Print analysis report
function printReport(analysis: ContentAnalysis): void {
  console.log('\n' + '='.repeat(70))
  console.log('SEO CONTENT ANALYSIS REPORT')
  console.log('='.repeat(70))
  console.log(`Keyword: "${analysis.keyword}"`)
  console.log(`Word Count: ${analysis.wordCount}`)
  console.log(`Reading Time: ${analysis.readingTime} min`)
  console.log(`Timestamp: ${analysis.timestamp}`)
  console.log('-'.repeat(70))

  // Group by category
  const categories = [...new Set(analysis.results.map(r => r.category))]

  for (const category of categories) {
    console.log(`\n${category}:`)
    const categoryResults = analysis.results.filter(r => r.category === category)

    for (const result of categoryResults) {
      const icon = result.status === 'good' ? '✅' :
                   result.status === 'warning' ? '⚠️' : '❌'
      console.log(`  ${icon} ${result.metric}: ${result.value}`)
      if (result.recommendation) {
        console.log(`     → ${result.recommendation}`)
      }
    }
  }

  console.log('\n' + '-'.repeat(70))
  console.log(`SCORE: ${analysis.score}/100`)
  console.log(`GRADE: ${analysis.grade}`)
  console.log('='.repeat(70))

  // Summary recommendations
  const recommendations = analysis.results
    .filter(r => r.recommendation)
    .map(r => r.recommendation!)

  if (recommendations.length > 0) {
    console.log('\n📋 IMPROVEMENT CHECKLIST:')
    recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`)
    })
  } else {
    console.log('\n✨ Excellent! Content is well-optimized.')
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.length === 0) {
    console.log(`
SEO Content Analyzer

Usage:
  npx tsx content-analyzer.ts --file <path> --keyword <keyword>
  npx tsx content-analyzer.ts --text "content" --keyword <keyword>

Options:
  --file <path>       Path to content file
  --text "content"    Content text directly
  --keyword <keyword> Primary keyword to analyze (required)
  --json              Output as JSON
  --help              Show this help

Examples:
  npx tsx content-analyzer.ts --file blog-post.md --keyword "organic spirulina"
  npx tsx content-analyzer.ts --text "Your content here..." --keyword "adaptogens"
    `)
    process.exit(0)
  }

  // Parse arguments
  const fileIdx = args.indexOf('--file')
  const textIdx = args.indexOf('--text')
  const keywordIdx = args.indexOf('--keyword')
  const jsonOutput = args.includes('--json')

  if (keywordIdx === -1) {
    console.error('Error: --keyword is required')
    process.exit(1)
  }

  const keyword = args[keywordIdx + 1]
  if (!keyword) {
    console.error('Error: Keyword value required')
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
      console.error('Error: Content text required')
      process.exit(1)
    }
  } else {
    console.error('Error: Either --file or --text is required')
    process.exit(1)
  }

  const analysis = analyzeContent(text, keyword)

  if (jsonOutput) {
    console.log(JSON.stringify(analysis, null, 2))
  } else {
    printReport(analysis)
  }

  // Exit with appropriate code
  process.exit(analysis.score >= 70 ? 0 : 1)
}

main()
