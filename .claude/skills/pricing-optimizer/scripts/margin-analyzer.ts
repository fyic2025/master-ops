#!/usr/bin/env npx tsx

/**
 * Margin Analyzer
 *
 * Analyzes product margins and generates pricing recommendations.
 *
 * Usage:
 *   npx tsx margin-analyzer.ts --business boo --cost 10 --price 25
 *   npx tsx margin-analyzer.ts --business teelixir --file products.csv
 */

interface MarginAnalysis {
  cost: number
  price: number
  margin: number
  markup: number
  profit: number
  status: 'healthy' | 'warning' | 'critical'
  recommendation: string
}

interface BusinessThresholds {
  target: number
  warning: number
  critical: number
}

// Business margin thresholds
const THRESHOLDS: Record<string, BusinessThresholds> = {
  boo: { target: 45, warning: 30, critical: 20 },
  teelixir: { target: 55, warning: 45, critical: 35 },
  elevate: { target: 20, warning: 15, critical: 10 },
  rhf: { target: 30, warning: 20, critical: 10 }
}

// Calculate margin percentage
function calculateMargin(cost: number, price: number): number {
  if (price <= 0) return 0
  return ((price - cost) / price) * 100
}

// Calculate markup percentage
function calculateMarkup(cost: number, price: number): number {
  if (cost <= 0) return 0
  return ((price - cost) / cost) * 100
}

// Calculate required price for target margin
function calculatePriceForMargin(cost: number, targetMargin: number): number {
  return cost / (1 - targetMargin / 100)
}

// Analyze margin
function analyzeMargin(
  cost: number,
  price: number,
  business: string
): MarginAnalysis {
  const thresholds = THRESHOLDS[business] || THRESHOLDS.boo
  const margin = calculateMargin(cost, price)
  const markup = calculateMarkup(cost, price)
  const profit = price - cost

  let status: MarginAnalysis['status']
  let recommendation: string

  if (margin >= thresholds.target) {
    status = 'healthy'
    recommendation = 'Margin is healthy. Monitor for competitive changes.'
  } else if (margin >= thresholds.warning) {
    status = 'warning'
    const targetPrice = calculatePriceForMargin(cost, thresholds.target)
    recommendation = `Below target. Consider increasing to $${targetPrice.toFixed(2)} for ${thresholds.target}% margin.`
  } else if (margin >= thresholds.critical) {
    status = 'warning'
    const targetPrice = calculatePriceForMargin(cost, thresholds.warning)
    recommendation = `Low margin alert. Recommend price of $${targetPrice.toFixed(2)} minimum.`
  } else {
    status = 'critical'
    if (margin < 0) {
      recommendation = `CRITICAL: Selling below cost! Loss of $${Math.abs(profit).toFixed(2)} per unit.`
    } else {
      const targetPrice = calculatePriceForMargin(cost, thresholds.critical)
      recommendation = `CRITICAL: Below minimum threshold. Urgent price review needed. Min price: $${targetPrice.toFixed(2)}`
    }
  }

  return {
    cost,
    price,
    margin: Math.round(margin * 100) / 100,
    markup: Math.round(markup * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    status,
    recommendation
  }
}

// Generate price recommendations
function generatePriceRecommendations(cost: number, business: string): Record<string, number> {
  const thresholds = THRESHOLDS[business] || THRESHOLDS.boo

  return {
    minimum: Math.ceil(calculatePriceForMargin(cost, thresholds.critical) * 100) / 100,
    target: Math.ceil(calculatePriceForMargin(cost, thresholds.target) * 100) / 100,
    premium: Math.ceil(calculatePriceForMargin(cost, thresholds.target + 10) * 100) / 100
  }
}

// Calculate discount impact
function analyzeDiscount(
  originalPrice: number,
  cost: number,
  discountPercent: number
): {
  discountedPrice: number
  originalMargin: number
  discountedMargin: number
  volumeIncreaseNeeded: number
} {
  const discountedPrice = originalPrice * (1 - discountPercent / 100)
  const originalMargin = calculateMargin(cost, originalPrice)
  const discountedMargin = calculateMargin(cost, discountedPrice)

  // Volume increase needed to maintain same profit
  const volumeIncreaseNeeded = discountPercent / (originalMargin - discountPercent)

  return {
    discountedPrice: Math.round(discountedPrice * 100) / 100,
    originalMargin: Math.round(originalMargin * 100) / 100,
    discountedMargin: Math.round(discountedMargin * 100) / 100,
    volumeIncreaseNeeded: Math.round(volumeIncreaseNeeded * 10000) / 100
  }
}

// Print analysis report
function printReport(analysis: MarginAnalysis, business: string, cost: number): void {
  const thresholds = THRESHOLDS[business] || THRESHOLDS.boo
  const statusIcon = analysis.status === 'healthy' ? '✅' :
                     analysis.status === 'warning' ? '⚠️' : '❌'

  console.log('\n' + '='.repeat(60))
  console.log('MARGIN ANALYSIS REPORT')
  console.log('='.repeat(60))
  console.log(`Business: ${business.toUpperCase()}`)
  console.log('-'.repeat(60))

  console.log('\n📊 PRICING BREAKDOWN:')
  console.log(`   Cost:     $${analysis.cost.toFixed(2)}`)
  console.log(`   Price:    $${analysis.price.toFixed(2)}`)
  console.log(`   Profit:   $${analysis.profit.toFixed(2)}`)
  console.log(`   Margin:   ${analysis.margin.toFixed(1)}%`)
  console.log(`   Markup:   ${analysis.markup.toFixed(1)}%`)

  console.log('\n📈 THRESHOLDS:')
  console.log(`   Target:   ${thresholds.target}%`)
  console.log(`   Warning:  ${thresholds.warning}%`)
  console.log(`   Critical: ${thresholds.critical}%`)

  console.log('\n' + '-'.repeat(60))
  console.log(`STATUS: ${statusIcon} ${analysis.status.toUpperCase()}`)
  console.log(`\n💡 ${analysis.recommendation}`)

  // Price recommendations
  const recs = generatePriceRecommendations(cost, business)
  console.log('\n💰 RECOMMENDED PRICES:')
  console.log(`   Minimum:  $${recs.minimum.toFixed(2)} (${thresholds.critical}% margin)`)
  console.log(`   Target:   $${recs.target.toFixed(2)} (${thresholds.target}% margin)`)
  console.log(`   Premium:  $${recs.premium.toFixed(2)} (${thresholds.target + 10}% margin)`)

  // Discount impact
  console.log('\n🏷️ DISCOUNT IMPACT:')
  const discounts = [10, 20, 30]
  for (const disc of discounts) {
    const impact = analyzeDiscount(analysis.price, cost, disc)
    if (impact.discountedMargin < thresholds.critical) {
      console.log(`   ${disc}% off: $${impact.discountedPrice.toFixed(2)} (${impact.discountedMargin.toFixed(1)}% margin) ❌ Below critical`)
    } else if (impact.discountedMargin < thresholds.warning) {
      console.log(`   ${disc}% off: $${impact.discountedPrice.toFixed(2)} (${impact.discountedMargin.toFixed(1)}% margin) ⚠️ Low margin`)
    } else {
      console.log(`   ${disc}% off: $${impact.discountedPrice.toFixed(2)} (${impact.discountedMargin.toFixed(1)}% margin) ✅`)
    }
    console.log(`           Need +${impact.volumeIncreaseNeeded.toFixed(0)}% volume to break even`)
  }

  console.log('\n' + '='.repeat(60))
}

// CLI
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Margin Analyzer

Usage:
  npx tsx margin-analyzer.ts --business <name> --cost <$> --price <$>

Options:
  --business <name>   Business: boo, teelixir, elevate, rhf
  --cost <amount>     Product cost
  --price <amount>    Selling price
  --discount <pct>    Analyze specific discount impact
  --json              Output as JSON
  --help              Show this help

Examples:
  npx tsx margin-analyzer.ts --business boo --cost 10 --price 25
  npx tsx margin-analyzer.ts --business teelixir --cost 15 --price 45 --discount 20
    `)
    process.exit(0)
  }

  const businessIdx = args.indexOf('--business')
  const costIdx = args.indexOf('--cost')
  const priceIdx = args.indexOf('--price')
  const discountIdx = args.indexOf('--discount')
  const jsonOutput = args.includes('--json')

  if (businessIdx === -1 || costIdx === -1 || priceIdx === -1) {
    console.error('Error: --business, --cost, and --price are required')
    process.exit(1)
  }

  const business = args[businessIdx + 1]?.toLowerCase()
  const cost = parseFloat(args[costIdx + 1])
  const price = parseFloat(args[priceIdx + 1])

  if (isNaN(cost) || isNaN(price)) {
    console.error('Error: Cost and price must be valid numbers')
    process.exit(1)
  }

  const analysis = analyzeMargin(cost, price, business)

  if (jsonOutput) {
    const result = {
      ...analysis,
      business,
      recommendations: generatePriceRecommendations(cost, business),
      discountImpact: [10, 20, 30].map(d => ({
        discount: d,
        ...analyzeDiscount(price, cost, d)
      }))
    }
    console.log(JSON.stringify(result, null, 2))
  } else {
    printReport(analysis, business, cost)

    // Specific discount analysis if requested
    if (discountIdx !== -1) {
      const discount = parseFloat(args[discountIdx + 1])
      if (!isNaN(discount)) {
        const impact = analyzeDiscount(price, cost, discount)
        console.log(`\n📋 ${discount}% DISCOUNT DETAILS:`)
        console.log(`   Original Price: $${price.toFixed(2)}`)
        console.log(`   Discounted Price: $${impact.discountedPrice.toFixed(2)}`)
        console.log(`   Original Margin: ${impact.originalMargin.toFixed(1)}%`)
        console.log(`   Discounted Margin: ${impact.discountedMargin.toFixed(1)}%`)
        console.log(`   Volume Increase Needed: ${impact.volumeIncreaseNeeded.toFixed(0)}%`)
      }
    }
  }

  // Exit code based on status
  process.exit(analysis.status === 'critical' ? 1 : 0)
}

main()
