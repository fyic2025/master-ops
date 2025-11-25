/**
 * BigCommerce Shipping Stress Test
 *
 * Tests various Australian postcodes and addresses to identify shipping calculation gaps
 */

import { BigCommerceConnector } from '../shared/libs/integrations/bigcommerce'

const bigcommerceClient = new BigCommerceConnector({
  storeHash: process.env.BOO_BC_STORE_HASH!,
  accessToken: process.env.BOO_BC_ACCESS_TOKEN!,
  clientId: process.env.BOO_BC_CLIENT_ID!,
})

// Test addresses covering different Australian regions
const testAddresses = [
  // Metro areas
  { name: 'Sydney Metro', postcode: '2000', city: 'Sydney', state: 'NSW', region: 'Metro' },
  { name: 'Melbourne Metro', postcode: '3000', city: 'Melbourne', state: 'VIC', region: 'Metro' },
  { name: 'Brisbane Metro', postcode: '4000', city: 'Brisbane', state: 'QLD', region: 'Metro' },
  { name: 'Perth Metro', postcode: '6000', city: 'Perth', state: 'WA', region: 'Metro' },
  { name: 'Adelaide Metro', postcode: '5000', city: 'Adelaide', state: 'SA', region: 'Metro' },
  { name: 'Canberra', postcode: '2600', city: 'Canberra', state: 'ACT', region: 'Capital' },

  // Regional areas
  { name: 'Newcastle', postcode: '2300', city: 'Newcastle', state: 'NSW', region: 'Regional' },
  { name: 'Geelong', postcode: '3220', city: 'Geelong', state: 'VIC', region: 'Regional' },
  { name: 'Gold Coast', postcode: '4217', city: 'Gold Coast', state: 'QLD', region: 'Regional' },
  { name: 'Wollongong', postcode: '2500', city: 'Wollongong', state: 'NSW', region: 'Regional' },

  // Remote areas
  { name: 'Darwin', postcode: '0800', city: 'Darwin', state: 'NT', region: 'Remote' },
  { name: 'Hobart', postcode: '7000', city: 'Hobart', state: 'TAS', region: 'Remote' },
  { name: 'Cairns', postcode: '4870', city: 'Cairns', state: 'QLD', region: 'Remote' },
  { name: 'Broome', postcode: '6725', city: 'Broome', state: 'WA', region: 'Remote' },
  { name: 'Alice Springs', postcode: '0870', city: 'Alice Springs', state: 'NT', region: 'Remote' },

  // Edge cases - outer suburbs
  { name: 'Penrith (West Sydney)', postcode: '2750', city: 'Penrith', state: 'NSW', region: 'Outer Metro' },
  { name: 'Cranbourne (Outer Melbourne)', postcode: '3977', city: 'Cranbourne', state: 'VIC', region: 'Outer Metro' },

  // Very remote
  { name: 'Thursday Island', postcode: '4875', city: 'Thursday Island', state: 'QLD', region: 'Very Remote' },
  { name: 'Christmas Island', postcode: '6798', city: 'Christmas Island', state: 'WA', region: 'Very Remote' },
  { name: 'Norfolk Island', postcode: '2899', city: 'Norfolk Island', state: 'NSW', region: 'Very Remote' },

  // Common problem postcodes (leading zeros)
  { name: 'Northern NSW (leading zero)', postcode: '0800', city: 'Darwin', state: 'NT', region: 'Leading Zero' },
  { name: 'NT Remote', postcode: '0872', city: 'Tennant Creek', state: 'NT', region: 'Leading Zero' },

  // Invalid postcodes (for testing error handling)
  { name: 'Invalid - 5 digits', postcode: '20000', city: 'Invalid', state: 'NSW', region: 'Invalid' },
  { name: 'Invalid - 3 digits', postcode: '200', city: 'Invalid', state: 'NSW', region: 'Invalid' },
  { name: 'Invalid - Letters', postcode: 'ABCD', city: 'Invalid', state: 'NSW', region: 'Invalid' },
]

interface ShippingZoneTest {
  zone: any
  methods: any[]
  coveredAddresses: string[]
  uncoveredAddresses: string[]
}

async function testShippingConfiguration() {
  console.log('🚀 BIGCOMMERCE SHIPPING STRESS TEST\n')
  console.log('═══════════════════════════════════════════════════════════════\n')

  try {
    // Step 1: Get all shipping zones
    console.log('📦 Fetching shipping zones...')
    const zones = await bigcommerceClient.shipping.listZones()
    console.log(`✅ Found ${zones.length} shipping zones\n`)

    // Step 2: Get methods for each zone
    const zoneTests: ShippingZoneTest[] = []

    for (const zone of zones) {
      console.log(`\n🔍 Analyzing Zone: ${zone.name}`)
      console.log(`   Type: ${zone.type}`)
      console.log(`   Enabled: ${zone.enabled}`)

      const methods = await bigcommerceClient.shipping.listMethods(zone.id)
      console.log(`   Methods: ${methods.length}`)

      // Display zone locations
      if (zone.locations && zone.locations.length > 0) {
        console.log(`   Locations (${zone.locations.length}):`)
        zone.locations.slice(0, 5).forEach((loc: any) => {
          const parts = []
          if (loc.country_iso2) parts.push(`Country: ${loc.country_iso2}`)
          if (loc.state_iso2) parts.push(`State: ${loc.state_iso2}`)
          if (loc.zip) parts.push(`Zip: ${loc.zip}`)
          console.log(`     • ${parts.join(', ')}`)
        })
        if (zone.locations.length > 5) {
          console.log(`     ... and ${zone.locations.length - 5} more`)
        }
      } else {
        console.log(`   ⚠️  No specific locations defined (may be global/all)`)
      }

      // Display shipping methods
      if (methods.length > 0) {
        console.log(`   Shipping Methods:`)
        methods.forEach((method: any) => {
          const status = method.enabled ? '✅' : '❌'
          console.log(`     ${status} ${method.name} (${method.type})`)
        })
      }

      zoneTests.push({
        zone,
        methods,
        coveredAddresses: [],
        uncoveredAddresses: []
      })
    }

    console.log('\n\n═══════════════════════════════════════════════════════════════')
    console.log('                  POSTCODE COVERAGE ANALYSIS')
    console.log('═══════════════════════════════════════════════════════════════\n')

    // Step 3: Test each address against zones
    const coverageResults: Record<string, { covered: boolean; zones: string[]; reason?: string }> = {}

    for (const address of testAddresses) {
      const matchingZones: string[] = []

      for (const zoneTest of zoneTests) {
        const zone = zoneTest.zone

        if (!zone.enabled) continue

        // Check if address matches zone
        let matches = false

        if (zone.type === 'global') {
          matches = true
        } else if (zone.locations && zone.locations.length > 0) {
          for (const loc of zone.locations) {
            // Match by country
            if (loc.country_iso2 === 'AU') {
              // If no state specified, matches all Australia
              if (!loc.state_iso2) {
                matches = true
                break
              }
              // Match by state
              if (loc.state_iso2 === address.state) {
                // If no zip specified, matches all in state
                if (!loc.zip) {
                  matches = true
                  break
                }
                // Match by zip/postcode
                if (loc.zip === address.postcode || loc.zip === '*') {
                  matches = true
                  break
                }
              }
            }
          }
        }

        if (matches) {
          matchingZones.push(zone.name)
          zoneTest.coveredAddresses.push(address.name)
        } else {
          zoneTest.uncoveredAddresses.push(address.name)
        }
      }

      coverageResults[address.name] = {
        covered: matchingZones.length > 0,
        zones: matchingZones,
        reason: matchingZones.length === 0 ? 'No matching zone found' : undefined
      }
    }

    // Step 4: Display results
    console.log('📊 COVERAGE BY REGION:\n')

    const regions = ['Metro', 'Capital', 'Regional', 'Outer Metro', 'Remote', 'Very Remote', 'Leading Zero', 'Invalid']

    for (const region of regions) {
      const regionAddresses = testAddresses.filter(a => a.region === region)
      if (regionAddresses.length === 0) continue

      const covered = regionAddresses.filter(a => coverageResults[a.name].covered).length
      const total = regionAddresses.length
      const percentage = ((covered / total) * 100).toFixed(0)

      const emoji = percentage === '100' ? '✅' : percentage === '0' ? '🔴' : '🟡'

      console.log(`${emoji} ${region}: ${covered}/${total} (${percentage}%)`)

      // Show uncovered addresses
      const uncovered = regionAddresses.filter(a => !coverageResults[a.name].covered)
      if (uncovered.length > 0) {
        uncovered.forEach(addr => {
          console.log(`   ❌ ${addr.name} (${addr.postcode}, ${addr.state}) - NO COVERAGE`)
        })
      }
    }

    console.log('\n\n═══════════════════════════════════════════════════════════════')
    console.log('                    DETAILED FINDINGS')
    console.log('═══════════════════════════════════════════════════════════════\n')

    // Find gaps
    const uncoveredAddresses = testAddresses.filter(a => !coverageResults[a.name].covered)

    if (uncoveredAddresses.length > 0) {
      console.log('🔴 GAPS FOUND - Addresses with NO shipping coverage:\n')
      uncoveredAddresses.forEach(addr => {
        console.log(`   ❌ ${addr.name}`)
        console.log(`      Postcode: ${addr.postcode}`)
        console.log(`      State: ${addr.state}`)
        console.log(`      Region: ${addr.region}`)
        console.log(`      Reason: ${coverageResults[addr.name].reason}`)
        console.log('')
      })
    } else {
      console.log('✅ All test addresses have shipping coverage!\n')
    }

    // Find zones with limited coverage
    console.log('\n📋 ZONE COVERAGE REPORT:\n')
    for (const zoneTest of zoneTests) {
      const coverage = ((zoneTest.coveredAddresses.length / testAddresses.length) * 100).toFixed(0)
      console.log(`Zone: ${zoneTest.zone.name}`)
      console.log(`  Coverage: ${zoneTest.coveredAddresses.length}/${testAddresses.length} addresses (${coverage}%)`)
      console.log(`  Enabled Methods: ${zoneTest.methods.filter(m => m.enabled).length}/${zoneTest.methods.length}`)
      console.log('')
    }

    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('                    RECOMMENDATIONS')
    console.log('═══════════════════════════════════════════════════════════════\n')

    // Generate recommendations
    if (uncoveredAddresses.length > 0) {
      console.log('🎯 ACTION ITEMS:\n')

      // Group by state
      const uncoveredByState: Record<string, typeof uncoveredAddresses> = {}
      uncoveredAddresses.forEach(addr => {
        if (!uncoveredByState[addr.state]) {
          uncoveredByState[addr.state] = []
        }
        uncoveredByState[addr.state].push(addr)
      })

      let actionNum = 1
      for (const [state, addresses] of Object.entries(uncoveredByState)) {
        console.log(`${actionNum}. Add shipping zone coverage for ${state}:`)
        addresses.forEach(addr => {
          console.log(`   • ${addr.name} (${addr.postcode})`)
        })
        console.log('')
        actionNum++
      }

      console.log(`${actionNum}. Implement postcode validation at checkout:`)
      console.log('   • Use Google Address Autocomplete (already implemented)')
      console.log('   • Add fallback validation for manual entry')
      console.log('   • Show warning for postcodes without shipping coverage')
      console.log('   • Suggest alternative delivery options\n')

      actionNum++
      console.log(`${actionNum}. Consider adding a catch-all zone:`)
      console.log('   • Create "Rest of Australia" zone for uncovered areas')
      console.log('   • Use higher shipping rates for remote areas')
      console.log('   • Or clearly communicate areas where shipping is not available\n')
    } else {
      console.log('✅ Configuration looks good! All test postcodes have coverage.\n')
      console.log('💡 Additional Recommendations:\n')
      console.log('1. Add real-time postcode validation at checkout')
      console.log('2. Log shipping calculation failures for analysis')
      console.log('3. Set up alerts for common calculation errors')
      console.log('4. Consider using Australia Post API for real-time validation\n')
    }

  } catch (error: any) {
    console.error('❌ Error during shipping test:', error.message)
    throw error
  }
}

// Run the test
console.log('Starting shipping stress test...\n')
testShippingConfiguration()
  .then(() => {
    console.log('✅ Shipping stress test complete!\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Shipping stress test failed!')
    process.exit(1)
  })
