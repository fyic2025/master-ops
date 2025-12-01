#!/usr/bin/env npx tsx

/**
 * Shipping Calculator
 *
 * Calculate shipping rates and compare carriers.
 *
 * Usage:
 *   npx tsx shipping-calc.ts rate --from 3000 --to 2000 --weight 1.5
 *   npx tsx shipping-calc.ts compare --from 3000 --to 2000 --weight 2
 *   npx tsx shipping-calc.ts zone --postcode 2000
 */

// Zone definitions
interface ShippingZone {
  name: string
  postcodeRanges: Array<{ from: string; to: string }>
  baseRate: number
  freeThreshold: number
  deliveryDays: { min: number; max: number }
}

const zones: ShippingZone[] = [
  {
    name: 'Metro',
    postcodeRanges: [
      { from: '2000', to: '2234' },
      { from: '3000', to: '3207' },
      { from: '4000', to: '4179' },
      { from: '5000', to: '5199' },
      { from: '6000', to: '6199' }
    ],
    baseRate: 9.95,
    freeThreshold: 99,
    deliveryDays: { min: 2, max: 4 }
  },
  {
    name: 'Regional',
    postcodeRanges: [
      { from: '2250', to: '2999' },
      { from: '3208', to: '3999' },
      { from: '4180', to: '4699' },
      { from: '5200', to: '5999' },
      { from: '6200', to: '6999' }
    ],
    baseRate: 12.95,
    freeThreshold: 99,
    deliveryDays: { min: 4, max: 7 }
  },
  {
    name: 'Remote',
    postcodeRanges: [
      { from: '0800', to: '0899' },
      { from: '4700', to: '4999' },
      { from: '6700', to: '6999' },
      { from: '7000', to: '7999' }
    ],
    baseRate: 19.95,
    freeThreshold: 149,
    deliveryDays: { min: 7, max: 14 }
  }
]

// Weight brackets
interface WeightBracket {
  maxWeight: number
  standardRate: number
  expressRate: number
}

const weightBrackets: WeightBracket[] = [
  { maxWeight: 0.5, standardRate: 8.95, expressRate: 12.95 },
  { maxWeight: 1, standardRate: 10.95, expressRate: 14.95 },
  { maxWeight: 3, standardRate: 12.95, expressRate: 18.95 },
  { maxWeight: 5, standardRate: 15.95, expressRate: 22.95 },
  { maxWeight: 10, standardRate: 19.95, expressRate: 29.95 },
  { maxWeight: 20, standardRate: 29.95, expressRate: 44.95 }
]

// Helper functions
function getZone(postcode: string): ShippingZone | null {
  for (const zone of zones) {
    for (const range of zone.postcodeRanges) {
      if (postcode >= range.from && postcode <= range.to) {
        return zone
      }
    }
  }
  return null
}

function getWeightBracket(weight: number): WeightBracket | null {
  for (const bracket of weightBrackets) {
    if (weight <= bracket.maxWeight) {
      return bracket
    }
  }
  return weightBrackets[weightBrackets.length - 1]
}

function calculateRate(
  toPostcode: string,
  weight: number,
  orderTotal: number,
  express: boolean = false
): {
  rate: number
  zone: string
  deliveryDays: string
  freeShippingEligible: boolean
  savings: number
} {
  const zone = getZone(toPostcode)
  const weightBracket = getWeightBracket(weight)

  if (!zone) {
    const remoteRate = express ? 44.95 : 24.95
    return {
      rate: remoteRate,
      zone: 'Remote/Unknown',
      deliveryDays: '7-14 business days',
      freeShippingEligible: false,
      savings: 0
    }
  }

  const weightRate = express ? weightBracket!.expressRate : weightBracket!.standardRate
  const zoneRate = zone.baseRate + (express ? 5 : 0)
  const baseRate = Math.max(weightRate, zoneRate)

  const freeShippingEligible = orderTotal >= zone.freeThreshold && !express
  const finalRate = freeShippingEligible ? 0 : baseRate

  const days = express
    ? { min: Math.max(1, zone.deliveryDays.min - 1), max: Math.ceil(zone.deliveryDays.max / 2) }
    : zone.deliveryDays

  return {
    rate: finalRate,
    zone: zone.name,
    deliveryDays: `${days.min}-${days.max} business days`,
    freeShippingEligible,
    savings: freeShippingEligible ? baseRate : 0
  }
}

// Simulated carrier rates
function getCarrierRates(
  fromPostcode: string,
  toPostcode: string,
  weight: number
): Array<{ carrier: string; service: string; rate: number; days: string }> {
  const zone = getZone(toPostcode)
  const isMetro = zone?.name === 'Metro'
  const isRegional = zone?.name === 'Regional'

  // Base rates with some variation
  const auspostBase = weight <= 1 ? 10.95 : weight <= 3 ? 14.95 : weight <= 5 ? 18.95 : 24.95
  const sendleBase = weight <= 1 ? 9.95 : weight <= 3 ? 13.95 : weight <= 5 ? 17.95 : 22.95

  const results = [
    {
      carrier: 'Australia Post',
      service: 'Parcel Post',
      rate: auspostBase + (isRegional ? 3 : 0) + (!isMetro && !isRegional ? 8 : 0),
      days: isMetro ? '2-4 days' : isRegional ? '4-7 days' : '7-14 days'
    },
    {
      carrier: 'Australia Post',
      service: 'Express Post',
      rate: auspostBase + 6 + (isRegional ? 2 : 0) + (!isMetro && !isRegional ? 5 : 0),
      days: isMetro ? '1-2 days' : isRegional ? '2-3 days' : '3-5 days'
    },
    {
      carrier: 'Sendle',
      service: 'Standard',
      rate: sendleBase + (isRegional ? 2 : 0) + (!isMetro && !isRegional ? 6 : 0),
      days: isMetro ? '2-5 days' : isRegional ? '4-7 days' : '7-10 days'
    },
    {
      carrier: 'Sendle',
      service: 'Express',
      rate: sendleBase + 5 + (isRegional ? 2 : 0) + (!isMetro && !isRegional ? 4 : 0),
      days: isMetro ? '1-3 days' : isRegional ? '2-4 days' : '3-6 days'
    }
  ]

  return results.sort((a, b) => a.rate - b.rate)
}

// Zone lookup
function lookupZone(postcode: string): void {
  const zone = getZone(postcode)

  console.log('\n📍 ZONE LOOKUP')
  console.log('='.repeat(50))
  console.log(`Postcode:       ${postcode}`)

  if (zone) {
    console.log(`Zone:           ${zone.name}`)
    console.log(`Base Rate:      $${zone.baseRate.toFixed(2)}`)
    console.log(`Free Threshold: $${zone.freeThreshold}`)
    console.log(`Delivery:       ${zone.deliveryDays.min}-${zone.deliveryDays.max} business days`)
  } else {
    console.log(`Zone:           Remote/Unknown`)
    console.log(`Base Rate:      $24.95+`)
    console.log(`Free Threshold: $149`)
    console.log(`Delivery:       7-14 business days`)
  }
}

// Rate calculation
function showRate(toPostcode: string, weight: number, orderTotal: number, express: boolean): void {
  const result = calculateRate(toPostcode, weight, orderTotal, express)

  console.log('\n💰 SHIPPING RATE')
  console.log('='.repeat(50))
  console.log(`To Postcode:    ${toPostcode}`)
  console.log(`Weight:         ${weight}kg`)
  console.log(`Order Total:    $${orderTotal.toFixed(2)}`)
  console.log(`Service:        ${express ? 'Express' : 'Standard'}`)
  console.log('-'.repeat(50))
  console.log(`Zone:           ${result.zone}`)
  console.log(`Delivery:       ${result.deliveryDays}`)
  console.log(`Rate:           $${result.rate.toFixed(2)}`)

  if (result.freeShippingEligible) {
    console.log(`\n✅ FREE SHIPPING APPLIED (saved $${result.savings.toFixed(2)})`)
  } else {
    const zone = getZone(toPostcode)
    const threshold = zone?.freeThreshold || 149
    if (orderTotal < threshold) {
      const remaining = threshold - orderTotal
      console.log(`\n💡 Add $${remaining.toFixed(2)} more for FREE shipping!`)
    }
  }
}

// Compare carriers
function showComparison(fromPostcode: string, toPostcode: string, weight: number): void {
  const rates = getCarrierRates(fromPostcode, toPostcode, weight)

  console.log('\n📦 CARRIER COMPARISON')
  console.log('='.repeat(70))
  console.log(`From: ${fromPostcode} → To: ${toPostcode} | Weight: ${weight}kg`)
  console.log('-'.repeat(70))

  rates.forEach((r, i) => {
    const cheapest = i === 0 ? ' ⭐ CHEAPEST' : ''
    console.log(
      `${r.carrier.padEnd(18)} ${r.service.padEnd(12)} $${r.rate.toFixed(2).padStart(8)} ${r.days.padEnd(12)}${cheapest}`
    )
  })

  const cheapest = rates[0]
  const mostExpensive = rates[rates.length - 1]
  const savings = mostExpensive.rate - cheapest.rate

  console.log('-'.repeat(70))
  console.log(`Best option: ${cheapest.carrier} ${cheapest.service} ($${cheapest.rate.toFixed(2)})`)
  console.log(`Potential savings: $${savings.toFixed(2)} vs most expensive`)
}

// Free shipping analysis
function analyzeThreshold(orders: Array<{ total: number; shipping: number }>): void {
  const currentThreshold = 99

  const aboveThreshold = orders.filter(o => o.total >= currentThreshold)
  const belowThreshold = orders.filter(o => o.total < currentThreshold)

  const avgOrder = orders.reduce((sum, o) => sum + o.total, 0) / orders.length
  const shippingRevenue = belowThreshold.reduce((sum, o) => sum + o.shipping, 0)
  const lostShipping = aboveThreshold.length * 9.95  // What we'd have charged

  console.log('\n📊 FREE SHIPPING ANALYSIS')
  console.log('='.repeat(50))
  console.log(`Current Threshold:   $${currentThreshold}`)
  console.log(`Total Orders:        ${orders.length}`)
  console.log(`Above Threshold:     ${aboveThreshold.length} (${Math.round(aboveThreshold.length / orders.length * 100)}%)`)
  console.log(`Below Threshold:     ${belowThreshold.length} (${Math.round(belowThreshold.length / orders.length * 100)}%)`)
  console.log(`Average Order:       $${avgOrder.toFixed(2)}`)
  console.log(`Shipping Revenue:    $${shippingRevenue.toFixed(2)}`)
  console.log(`Free Shipping Cost:  $${lostShipping.toFixed(2)}`)
}

// Help
function showHelp(): void {
  console.log(`
Shipping Calculator

Usage:
  npx tsx shipping-calc.ts <command> [options]

Commands:
  rate     Calculate shipping rate
  compare  Compare carrier rates
  zone     Look up zone for postcode
  analyze  Analyze free shipping threshold

Options:
  --from <postcode>     Origin postcode (default: 3000)
  --to <postcode>       Destination postcode (required for rate/compare)
  --weight <kg>         Package weight in kg (default: 1)
  --total <$>           Order total for free shipping calc (default: 50)
  --express             Calculate express rate

Examples:
  npx tsx shipping-calc.ts rate --to 2000 --weight 1.5 --total 80
  npx tsx shipping-calc.ts rate --to 4000 --weight 2 --express
  npx tsx shipping-calc.ts compare --from 3000 --to 2000 --weight 3
  npx tsx shipping-calc.ts zone --postcode 2000
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

  // Parse arguments
  const getArg = (name: string, defaultValue: string): string => {
    const idx = args.indexOf(`--${name}`)
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue
  }

  const fromPostcode = getArg('from', '3000')
  const toPostcode = getArg('to', '')
  const weight = parseFloat(getArg('weight', '1'))
  const orderTotal = parseFloat(getArg('total', '50'))
  const express = args.includes('--express')
  const postcode = getArg('postcode', '')

  try {
    switch (command) {
      case 'rate':
        if (!toPostcode) {
          console.error('Error: --to postcode required')
          process.exit(1)
        }
        showRate(toPostcode, weight, orderTotal, express)
        break

      case 'compare':
        if (!toPostcode) {
          console.error('Error: --to postcode required')
          process.exit(1)
        }
        showComparison(fromPostcode, toPostcode, weight)
        break

      case 'zone':
        const pc = postcode || toPostcode
        if (!pc) {
          console.error('Error: --postcode required')
          process.exit(1)
        }
        lookupZone(pc)
        break

      case 'analyze':
        // Sample data for demo
        const sampleOrders = [
          { total: 45, shipping: 9.95 },
          { total: 120, shipping: 0 },
          { total: 78, shipping: 9.95 },
          { total: 105, shipping: 0 },
          { total: 32, shipping: 9.95 },
          { total: 156, shipping: 0 },
          { total: 89, shipping: 9.95 },
          { total: 67, shipping: 9.95 },
          { total: 234, shipping: 0 },
          { total: 99, shipping: 0 }
        ]
        analyzeThreshold(sampleOrders)
        break

      default:
        console.error(`Unknown command: ${command}`)
        showHelp()
        process.exit(1)
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
