#!/usr/bin/env npx tsx

/**
 * Price Comparison Tool
 *
 * Compares prices against competitors and generates positioning report.
 *
 * Usage:
 *   npx tsx price-comparison.ts --business boo --product "Spirulina" --our-price 29.95
 *   npx tsx price-comparison.ts --business teelixir --file prices.csv
 */

interface PriceComparison {
  product: string
  ourPrice: number
  competitors: Record<string, number>
  position: 'budget' | 'value' | 'competitive' | 'premium' | 'luxury'
  avgCompetitorPrice: number
  priceDifference: number
  priceDifferencePercent: number
  recommendation: string
}

interface CompetitorPrices {
  [key: string]: number
}

// Competitor data by business
const COMPETITOR_DATA: Record<string, string[]> = {
  boo: ['iHerb', 'Nourished Life', 'Flora & Fauna', 'Healthy Life'],
  teelixir: ['Superfeast', 'Life Cykel', 'Four Sigmatic', 'Real Mushrooms'],
  elevate: ['UHP', 'Health World', 'Oborne Health'],
  rhf: ['YourGrocer', 'Aussie Farmers', 'Coles Online']
}

// Sample competitor price ranges (for demo - in production would be actual data)
function getCompetitorPriceEstimate(basePrice: number, competitor: string): number {
  // This simulates different competitor pricing strategies
  const modifiers: Record<string, number> = {
    'iHerb': 0.70,           // Usually cheaper
    'Nourished Life': 1.10,  // Premium
    'Flora & Fauna': 1.05,   // Slightly premium
    'Healthy Life': 0.95,    // Competitive
    'Superfeast': 1.25,      // Ultra premium
    'Life Cykel': 1.10,      // Premium
    'Four Sigmatic': 0.90,   // Mid-range
    'Real Mushrooms': 0.85,  // Value
    'UHP': 0.92,             // Wholesale competitive
    'Health World': 1.05,    // Practitioner premium
    'Oborne Health': 1.00,   // At par
    'YourGrocer': 1.02,      // Slight markup
    'Aussie Farmers': 1.08,  // Premium convenience
    'Coles Online': 0.90     // Mass market
  }

  const modifier = modifiers[competitor] || 1.0
  // Add some random variation (-5% to +5%)
  const variation = 1 + (Math.random() * 0.10 - 0.05)
  return Math.round(basePrice * modifier * variation * 100) / 100
}

// Determine price position
function determinePosition(ourPrice: number, avgCompetitorPrice: number): PriceComparison['position'] {
  const ratio = ourPrice / avgCompetitorPrice

  if (ratio < 0.85) return 'budget'
  if (ratio < 0.95) return 'value'
  if (ratio < 1.05) return 'competitive'
  if (ratio < 1.15) return 'premium'
  return 'luxury'
}

// Generate recommendation
function generateRecommendation(
  position: PriceComparison['position'],
  priceDiffPercent: number,
  business: string
): string {
  const recommendations: Record<string, Record<string, string>> = {
    boo: {
      budget: 'Priced aggressively low. Consider if margin is sustainable or raise to competitive.',
      value: 'Good value position. Maintain or use for volume drivers.',
      competitive: 'Well positioned. Monitor competitors for changes.',
      premium: 'Premium pricing. Ensure quality/service justifies.',
      luxury: 'Significantly above market. Verify brand supports this premium.'
    },
    teelixir: {
      budget: 'Below market for premium brand. Consider price increase.',
      value: 'Below typical premium pricing. Opportunity to increase.',
      competitive: 'At market rate. Premium brand could support higher pricing.',
      premium: 'Appropriate for premium brand positioning.',
      luxury: 'Ultra-premium pricing. Ensure value proposition is clear.'
    },
    elevate: {
      budget: 'Wholesale pricing is very competitive. Protect margins.',
      value: 'Good wholesale value. Sustainable for volume accounts.',
      competitive: 'Market-rate wholesale. Standard positioning.',
      premium: 'Above market wholesale. Ensure value-adds justify.',
      luxury: 'High for wholesale. May limit retailer uptake.'
    },
    rhf: {
      budget: 'Below local market. Good for traffic driving.',
      value: 'Fair local pricing. Good customer perception.',
      competitive: 'At local market rate. Appropriate for fresh.',
      premium: 'Premium for local delivery. Ensure quality matches.',
      luxury: 'High for local groceries. May limit volume.'
    }
  }

  return recommendations[business]?.[position] || recommendations.boo[position]
}

// Analyze price
function analyzePrice(
  product: string,
  ourPrice: number,
  competitorPrices: CompetitorPrices,
  business: string
): PriceComparison {
  const competitorValues = Object.values(competitorPrices)
  const avgCompetitorPrice = competitorValues.reduce((a, b) => a + b, 0) / competitorValues.length
  const priceDifference = ourPrice - avgCompetitorPrice
  const priceDifferencePercent = (priceDifference / avgCompetitorPrice) * 100

  const position = determinePosition(ourPrice, avgCompetitorPrice)
  const recommendation = generateRecommendation(position, priceDifferencePercent, business)

  return {
    product,
    ourPrice,
    competitors: competitorPrices,
    position,
    avgCompetitorPrice: Math.round(avgCompetitorPrice * 100) / 100,
    priceDifference: Math.round(priceDifference * 100) / 100,
    priceDifferencePercent: Math.round(priceDifferencePercent * 10) / 10,
    recommendation
  }
}

// Print comparison report
function printReport(comparison: PriceComparison, business: string): void {
  const positionIcon: Record<string, string> = {
    budget: '💰',
    value: '✨',
    competitive: '⚖️',
    premium: '👑',
    luxury: '💎'
  }

  console.log('\n' + '='.repeat(60))
  console.log('PRICE COMPARISON REPORT')
  console.log('='.repeat(60))
  console.log(`Business: ${business.toUpperCase()}`)
  console.log(`Product: ${comparison.product}`)
  console.log('-'.repeat(60))

  console.log('\n📊 PRICE ANALYSIS:')
  console.log(`   Our Price:     $${comparison.ourPrice.toFixed(2)}`)
  console.log(`   Market Avg:    $${comparison.avgCompetitorPrice.toFixed(2)}`)
  console.log(`   Difference:    $${comparison.priceDifference.toFixed(2)} (${comparison.priceDifferencePercent > 0 ? '+' : ''}${comparison.priceDifferencePercent}%)`)

  console.log('\n🏷️ COMPETITOR PRICES:')
  Object.entries(comparison.competitors).forEach(([name, price]) => {
    const diff = comparison.ourPrice - price
    const diffPercent = ((diff / price) * 100).toFixed(1)
    const indicator = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️'
    console.log(`   ${name}: $${price.toFixed(2)} ${indicator} (${diff > 0 ? '+' : ''}${diffPercent}%)`)
  })

  console.log('\n' + '-'.repeat(60))
  console.log(`POSITION: ${positionIcon[comparison.position]} ${comparison.position.toUpperCase()}`)
  console.log(`\n💡 ${comparison.recommendation}`)
  console.log('='.repeat(60))
}

// CLI
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Price Comparison Tool

Usage:
  npx tsx price-comparison.ts --business <name> --product <name> --our-price <$>
  npx tsx price-comparison.ts --business <name> --product <name> --our-price <$> --competitors "Name:$,Name:$"

Options:
  --business <name>        Business: boo, teelixir, elevate, rhf
  --product <name>         Product name
  --our-price <amount>     Our selling price
  --competitors "..."      Custom competitor prices (Name:Price,Name:Price)
  --json                   Output as JSON
  --help                   Show this help

Examples:
  npx tsx price-comparison.ts --business boo --product "Spirulina 250g" --our-price 29.95
  npx tsx price-comparison.ts --business teelixir --product "Reishi" --our-price 49.95 --competitors "Superfeast:59.95,Life Cykel:54.00"
    `)
    process.exit(0)
  }

  const businessIdx = args.indexOf('--business')
  const productIdx = args.indexOf('--product')
  const priceIdx = args.indexOf('--our-price')
  const competitorsIdx = args.indexOf('--competitors')
  const jsonOutput = args.includes('--json')

  if (businessIdx === -1 || productIdx === -1 || priceIdx === -1) {
    console.error('Error: --business, --product, and --our-price are required')
    process.exit(1)
  }

  const business = args[businessIdx + 1]?.toLowerCase()
  const product = args[productIdx + 1]
  const ourPrice = parseFloat(args[priceIdx + 1])

  if (!business || !product || isNaN(ourPrice)) {
    console.error('Error: Invalid arguments')
    process.exit(1)
  }

  // Get or generate competitor prices
  let competitorPrices: CompetitorPrices = {}

  if (competitorsIdx !== -1 && args[competitorsIdx + 1]) {
    // Parse custom competitor prices
    const pairs = args[competitorsIdx + 1].split(',')
    for (const pair of pairs) {
      const [name, price] = pair.split(':')
      if (name && price) {
        competitorPrices[name.trim()] = parseFloat(price)
      }
    }
  } else {
    // Generate estimated competitor prices
    const competitors = COMPETITOR_DATA[business] || COMPETITOR_DATA.boo
    for (const competitor of competitors) {
      competitorPrices[competitor] = getCompetitorPriceEstimate(ourPrice, competitor)
    }
  }

  const comparison = analyzePrice(product, ourPrice, competitorPrices, business)

  if (jsonOutput) {
    console.log(JSON.stringify(comparison, null, 2))
  } else {
    printReport(comparison, business)
  }
}

main()
