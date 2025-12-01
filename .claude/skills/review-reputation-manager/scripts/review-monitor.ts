#!/usr/bin/env npx tsx

/**
 * Review Monitor
 *
 * Monitor and analyze reviews across platforms.
 *
 * Usage:
 *   npx tsx review-monitor.ts summary
 *   npx tsx review-monitor.ts pending
 *   npx tsx review-monitor.ts analyze
 *   npx tsx review-monitor.ts alerts
 */

// Interfaces
interface Review {
  id: string
  platform: 'google' | 'bigcommerce' | 'judgeme' | 'woocommerce'
  business: string
  rating: 1 | 2 | 3 | 4 | 5
  reviewer: string
  content: string
  date: Date
  hasReply: boolean
  replyDate?: Date
  sentiment: 'positive' | 'neutral' | 'negative'
  productId?: string
  productName?: string
}

interface ReviewMetrics {
  totalReviews: number
  averageRating: number
  ratingDistribution: Record<number, number>
  responseRate: number
  avgResponseTime: number
  sentimentBreakdown: Record<string, number>
  recentTrend: 'improving' | 'stable' | 'declining'
}

// Sample data (in production, this would come from APIs)
const sampleReviews: Review[] = [
  {
    id: 'r1', platform: 'google', business: 'boo', rating: 5,
    reviewer: 'Sarah M.', content: 'Great selection of organic products! Fast shipping.',
    date: new Date('2024-11-28'), hasReply: true, replyDate: new Date('2024-11-28'),
    sentiment: 'positive'
  },
  {
    id: 'r2', platform: 'google', business: 'boo', rating: 4,
    reviewer: 'John D.', content: 'Good products but shipping was a bit slow.',
    date: new Date('2024-11-29'), hasReply: false, sentiment: 'neutral'
  },
  {
    id: 'r3', platform: 'bigcommerce', business: 'boo', rating: 5,
    reviewer: 'Emily R.', content: 'Love this protein powder! Best I\'ve tried.',
    date: new Date('2024-11-30'), hasReply: true, replyDate: new Date('2024-11-30'),
    sentiment: 'positive', productId: '123', productName: 'Organic Protein Powder'
  },
  {
    id: 'r4', platform: 'google', business: 'teelixir', rating: 5,
    reviewer: 'Mike T.', content: 'The Lion\'s Mane has been amazing for my focus!',
    date: new Date('2024-11-27'), hasReply: true, replyDate: new Date('2024-11-28'),
    sentiment: 'positive'
  },
  {
    id: 'r5', platform: 'judgeme', business: 'teelixir', rating: 2,
    reviewer: 'Anna K.', content: 'Product arrived damaged. Waiting for response.',
    date: new Date('2024-11-30'), hasReply: false, sentiment: 'negative',
    productId: '45', productName: 'Reishi Extract'
  },
  {
    id: 'r6', platform: 'google', business: 'rhf', rating: 5,
    reviewer: 'David L.', content: 'Freshest produce in the area! Love the delivery.',
    date: new Date('2024-11-29'), hasReply: true, replyDate: new Date('2024-11-29'),
    sentiment: 'positive'
  }
]

// Helper functions
function calculateMetrics(reviews: Review[]): ReviewMetrics {
  const totalReviews = reviews.length
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  reviews.forEach(r => distribution[r.rating]++)

  const responded = reviews.filter(r => r.hasReply)
  const responseRate = (responded.length / totalReviews) * 100

  const avgResponseTime = responded.length > 0
    ? responded.reduce((sum, r) => {
        const diff = r.replyDate!.getTime() - r.date.getTime()
        return sum + diff / (1000 * 60 * 60) // hours
      }, 0) / responded.length
    : 0

  const sentimentBreakdown: Record<string, number> = { positive: 0, neutral: 0, negative: 0 }
  reviews.forEach(r => sentimentBreakdown[r.sentiment]++)

  // Calculate trend (simplified)
  const recentReviews = reviews.filter(r =>
    r.date >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  )
  const recentAvg = recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length
  const recentTrend = recentAvg >= avgRating + 0.2 ? 'improving'
    : recentAvg <= avgRating - 0.2 ? 'declining'
    : 'stable'

  return {
    totalReviews,
    averageRating: Math.round(avgRating * 10) / 10,
    ratingDistribution: distribution,
    responseRate: Math.round(responseRate),
    avgResponseTime: Math.round(avgResponseTime * 10) / 10,
    sentimentBreakdown,
    recentTrend
  }
}

function getStarDisplay(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

function getSentimentIcon(sentiment: string): string {
  switch (sentiment) {
    case 'positive': return '😊'
    case 'negative': return '😟'
    default: return '😐'
  }
}

function getTrendIcon(trend: string): string {
  switch (trend) {
    case 'improving': return '📈'
    case 'declining': return '📉'
    default: return '➡️'
  }
}

// Commands
function showSummary(): void {
  console.log('\n📊 REVIEW SUMMARY')
  console.log('='.repeat(70))

  const businesses = ['boo', 'teelixir', 'rhf']

  businesses.forEach(business => {
    const reviews = sampleReviews.filter(r => r.business === business)
    if (reviews.length === 0) return

    const metrics = calculateMetrics(reviews)
    const businessName = business === 'boo' ? 'Buy Organics Online'
      : business === 'teelixir' ? 'Teelixir'
      : 'Red Hill Fresh'

    console.log(`\n${businessName}`)
    console.log('-'.repeat(40))
    console.log(`Rating:         ${getStarDisplay(Math.round(metrics.averageRating))} ${metrics.averageRating}`)
    console.log(`Total Reviews:  ${metrics.totalReviews}`)
    console.log(`Response Rate:  ${metrics.responseRate}%`)
    console.log(`Avg Response:   ${metrics.avgResponseTime}h`)
    console.log(`Trend:          ${getTrendIcon(metrics.recentTrend)} ${metrics.recentTrend}`)
  })

  // Overall
  const allMetrics = calculateMetrics(sampleReviews)
  console.log('\n' + '='.repeat(70))
  console.log('OVERALL')
  console.log('-'.repeat(40))
  console.log(`Total Reviews:  ${allMetrics.totalReviews}`)
  console.log(`Average Rating: ${allMetrics.averageRating}`)
  console.log(`Response Rate:  ${allMetrics.responseRate}%`)
  console.log(`\nSentiment:`)
  console.log(`  😊 Positive: ${allMetrics.sentimentBreakdown.positive}`)
  console.log(`  😐 Neutral:  ${allMetrics.sentimentBreakdown.neutral}`)
  console.log(`  😟 Negative: ${allMetrics.sentimentBreakdown.negative}`)
}

function showPending(): void {
  const pending = sampleReviews.filter(r => !r.hasReply)

  console.log('\n⏳ PENDING RESPONSES')
  console.log('='.repeat(70))

  if (pending.length === 0) {
    console.log('✅ All reviews have been responded to!')
    return
  }

  // Sort by priority (low ratings first, then by date)
  pending.sort((a, b) => {
    if (a.rating !== b.rating) return a.rating - b.rating
    return a.date.getTime() - b.date.getTime()
  })

  pending.forEach(r => {
    const urgency = r.rating <= 2 ? '🚨 URGENT' : r.rating === 3 ? '⚠️ Soon' : '📝 Normal'
    const age = Math.round((Date.now() - r.date.getTime()) / (1000 * 60 * 60))

    console.log(`\n${urgency} | ${r.business.toUpperCase()} | ${r.platform}`)
    console.log(`${getStarDisplay(r.rating)} by ${r.reviewer} (${age}h ago)`)
    console.log(`"${r.content.substring(0, 80)}${r.content.length > 80 ? '...' : ''}"`)
    if (r.productName) {
      console.log(`Product: ${r.productName}`)
    }
  })

  console.log(`\n-`.repeat(35))
  console.log(`Total pending: ${pending.length}`)
  console.log(`Urgent (1-2 stars): ${pending.filter(r => r.rating <= 2).length}`)
}

function showAlerts(): void {
  console.log('\n🔔 REVIEW ALERTS')
  console.log('='.repeat(70))

  // Check for negative reviews
  const negative = sampleReviews.filter(r => r.rating <= 2 && !r.hasReply)
  if (negative.length > 0) {
    console.log('\n🚨 NEGATIVE REVIEWS NEED ATTENTION:')
    negative.forEach(r => {
      console.log(`  - ${r.business}: ${r.rating} stars from ${r.reviewer}`)
      console.log(`    "${r.content.substring(0, 60)}..."`)
    })
  }

  // Check response rate
  const allMetrics = calculateMetrics(sampleReviews)
  if (allMetrics.responseRate < 100) {
    console.log(`\n⚠️ Response rate is ${allMetrics.responseRate}% (target: 100%)`)
  }

  // Check for old unresponded
  const oldPending = sampleReviews.filter(r =>
    !r.hasReply && (Date.now() - r.date.getTime()) > 24 * 60 * 60 * 1000
  )
  if (oldPending.length > 0) {
    console.log(`\n⏰ ${oldPending.length} review(s) pending for 24+ hours`)
  }

  // All clear?
  if (negative.length === 0 && allMetrics.responseRate === 100 && oldPending.length === 0) {
    console.log('\n✅ No alerts - all reviews under control!')
  }
}

function showAnalysis(): void {
  console.log('\n📈 REVIEW ANALYSIS')
  console.log('='.repeat(70))

  const metrics = calculateMetrics(sampleReviews)

  console.log('\nRATING DISTRIBUTION:')
  for (let i = 5; i >= 1; i--) {
    const count = metrics.ratingDistribution[i]
    const percent = Math.round((count / metrics.totalReviews) * 100)
    const bar = '█'.repeat(Math.round(percent / 5)) + '░'.repeat(20 - Math.round(percent / 5))
    console.log(`  ${i} ★ ${bar} ${count} (${percent}%)`)
  }

  console.log('\nPLATFORM BREAKDOWN:')
  const platforms = ['google', 'bigcommerce', 'judgeme', 'woocommerce'] as const
  platforms.forEach(p => {
    const platformReviews = sampleReviews.filter(r => r.platform === p)
    if (platformReviews.length > 0) {
      const avg = platformReviews.reduce((sum, r) => sum + r.rating, 0) / platformReviews.length
      console.log(`  ${p.padEnd(12)}: ${platformReviews.length} reviews, ${avg.toFixed(1)} avg`)
    }
  })

  console.log('\nTOP PRODUCTS (by reviews):')
  const productCounts = new Map<string, { count: number; avgRating: number; name: string }>()
  sampleReviews
    .filter(r => r.productName)
    .forEach(r => {
      const existing = productCounts.get(r.productId!) || { count: 0, avgRating: 0, name: r.productName! }
      existing.count++
      existing.avgRating = (existing.avgRating * (existing.count - 1) + r.rating) / existing.count
      productCounts.set(r.productId!, existing)
    })

  Array.from(productCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .forEach(([id, data]) => {
      console.log(`  ${data.name}: ${data.count} reviews, ${data.avgRating.toFixed(1)} avg`)
    })

  console.log('\nRECOMMENDATIONS:')
  if (metrics.averageRating < 4.5) {
    console.log('  • Focus on improving customer experience to boost ratings')
  }
  if (metrics.responseRate < 100) {
    console.log('  • Respond to all pending reviews within 24 hours')
  }
  if (metrics.sentimentBreakdown.negative > metrics.totalReviews * 0.1) {
    console.log('  • Investigate root causes of negative reviews')
  }
  if (metrics.recentTrend === 'declining') {
    console.log('  • Recent trend is declining - review recent changes')
  }
  if (metrics.averageRating >= 4.5 && metrics.responseRate === 100) {
    console.log('  • Great job! Consider requesting more reviews to build volume')
  }
}

// Help
function showHelp(): void {
  console.log(`
Review Monitor

Usage:
  npx tsx review-monitor.ts <command>

Commands:
  summary   Show review summary by business
  pending   Show reviews pending response (prioritized)
  alerts    Show urgent alerts and issues
  analyze   Show detailed review analysis

Examples:
  npx tsx review-monitor.ts summary
  npx tsx review-monitor.ts pending
  npx tsx review-monitor.ts alerts
  npx tsx review-monitor.ts analyze
`)
}

// CLI
function main(): void {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp()
    process.exit(0)
  }

  const command = args[0]

  switch (command) {
    case 'summary':
      showSummary()
      break

    case 'pending':
      showPending()
      break

    case 'alerts':
      showAlerts()
      break

    case 'analyze':
      showAnalysis()
      break

    default:
      console.error(`Unknown command: ${command}`)
      showHelp()
      process.exit(1)
  }
}

main()
