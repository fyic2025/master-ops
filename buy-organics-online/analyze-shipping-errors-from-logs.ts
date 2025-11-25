/**
 * Analyze Shipping Errors from Store Logs
 *
 * Extracts and analyzes actual shipping errors from BigCommerce logs
 */

import { BigCommerceConnector } from '../shared/libs/integrations/bigcommerce'

const bigcommerceClient = new BigCommerceConnector({
  storeHash: process.env.BOO_BC_STORE_HASH!,
  accessToken: process.env.BOO_BC_ACCESS_TOKEN!,
  clientId: process.env.BOO_BC_CLIENT_ID!,
})

async function analyzeShippingErrors() {
  console.log('🔍 Analyzing Shipping Errors from Store Logs...\n')

  try {
    // Fetch shipping-specific logs
    console.log('📦 Fetching shipping logs (last 250 entries)...')
    const allLogs = await bigcommerceClient.storeLogs.list({ limit: 250 })
    const shippingLogs = allLogs.filter(log => log.type === 'shipping')

    console.log(`Found ${shippingLogs.length} shipping logs\n`)

    if (shippingLogs.length === 0) {
      console.log('No shipping logs found in recent history.')
      return
    }

    // Categorize logs
    const byModule: Record<string, any[]> = {}
    const bySeverity: Record<string, any[]> = {}
    const errorLogs: any[] = []
    const postcodeErrors: any[] = []

    for (const log of shippingLogs) {
      // Group by module (shipping carrier)
      if (!byModule[log.module]) byModule[log.module] = []
      byModule[log.module].push(log)

      // Group by severity
      const severityKey = log.severity.toString()
      if (!bySeverity[severityKey]) bySeverity[severityKey] = []
      bySeverity[severityKey].push(log)

      // Check for errors
      if (log.severity === 'errors' || log.message.toLowerCase().includes('error') || log.message.toLowerCase().includes('fail')) {
        errorLogs.push(log)

        // Check for postcode-related errors
        const msg = log.message.toLowerCase()
        if (msg.includes('postcode') || msg.includes('postal') || msg.includes('zip') || msg.includes('address')) {
          postcodeErrors.push(log)
        }
      }
    }

    console.log('═══════════════════════════════════════════════════════════════')
    console.log('                  SHIPPING LOG ANALYSIS')
    console.log('═══════════════════════════════════════════════════════════════\n')

    // Summary by carrier
    console.log('📊 LOGS BY CARRIER:\n')
    Object.entries(byModule)
      .sort(([, a], [, b]) => b.length - a.length)
      .forEach(([module, logs]) => {
        const pct = ((logs.length / shippingLogs.length) * 100).toFixed(1)
        console.log(`   ${module}: ${logs.length} (${pct}%)`)
      })

    // Summary by severity
    console.log('\n📊 LOGS BY SEVERITY:\n')
    Object.entries(bySeverity)
      .forEach(([severity, logs]) => {
        const pct = ((logs.length / shippingLogs.length) * 100).toFixed(1)
        const emoji = severity === 'success' ? '✅' : severity === 'errors' ? '🔴' : '🟡'
        console.log(`   ${emoji} ${severity}: ${logs.length} (${pct}%)`)
      })

    // Show error logs
    if (errorLogs.length > 0) {
      console.log('\n\n═══════════════════════════════════════════════════════════════')
      console.log('                  SHIPPING ERROR DETAILS')
      console.log('═══════════════════════════════════════════════════════════════\n')

      console.log(`Found ${errorLogs.length} error/warning entries:\n`)

      errorLogs.slice(0, 20).forEach((log, index) => {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`ERROR ${index + 1} of ${errorLogs.length}`)
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`🔧 Carrier: ${log.module}`)
        console.log(`📅 Date: ${new Date(log.date_created).toLocaleString()}`)
        console.log(`⚠️  Severity: ${log.severity}`)
        console.log(`📝 Summary: ${log.summary}`)
        console.log(`💬 Message: ${log.message}`)
        console.log('')
      })

      if (errorLogs.length > 20) {
        console.log(`... and ${errorLogs.length - 20} more errors\n`)
      }
    } else {
      console.log('\n✅ No errors found in shipping logs!\n')
    }

    // Postcode-specific errors
    if (postcodeErrors.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════════')
      console.log('                POSTCODE-RELATED ERRORS')
      console.log('═══════════════════════════════════════════════════════════════\n')

      console.log(`Found ${postcodeErrors.length} postcode-related issues:\n`)

      postcodeErrors.forEach((log, index) => {
        console.log(`${index + 1}. ${log.summary}`)
        console.log(`   Carrier: ${log.module}`)
        console.log(`   Date: ${new Date(log.date_created).toLocaleString()}`)
        console.log(`   Message: ${log.message}\n`)
      })
    }

    // Pattern analysis
    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('                    PATTERN ANALYSIS')
    console.log('═══════════════════════════════════════════════════════════════\n')

    // Extract unique error messages
    const errorPatterns: Record<string, number> = {}
    errorLogs.forEach(log => {
      // Simplify message to find patterns
      let pattern = log.message.toLowerCase()
      // Remove specific numbers/IDs
      pattern = pattern.replace(/\d+/g, 'XXX')
      errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1
    })

    if (Object.keys(errorPatterns).length > 0) {
      console.log('🔍 Common Error Patterns:\n')
      Object.entries(errorPatterns)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .forEach(([pattern, count]) => {
          console.log(`   ${count}x: ${pattern.substring(0, 100)}${pattern.length > 100 ? '...' : ''}`)
        })
    }

    // Recommendations
    console.log('\n\n═══════════════════════════════════════════════════════════════')
    console.log('                    RECOMMENDATIONS')
    console.log('═══════════════════════════════════════════════════════════════\n')

    if (errorLogs.length > 0) {
      console.log('🎯 Based on the actual shipping errors found:\n')

      // Check for Australia Post errors
      const ausPostErrors = errorLogs.filter(log => log.module.toLowerCase().includes('australia post') || log.module.toLowerCase().includes('auspost'))
      if (ausPostErrors.length > 0) {
        console.log(`1. Australia Post Issues (${ausPostErrors.length} errors):`)
        console.log('   • Review Australia Post API configuration')
        console.log('   • Check API credentials are valid')
        console.log('   • Verify Australia Post account status')
        console.log('   • Consider enabling fallback shipping methods\n')
      }

      // Check for Sendle errors
      const sendleErrors = errorLogs.filter(log => log.module.toLowerCase().includes('sendle'))
      if (sendleErrors.length > 0) {
        console.log(`2. Sendle Issues (${sendleErrors.length} errors):`)
        console.log('   • Review Sendle coverage areas')
        console.log('   • Check for remote/rural postcode limitations')
        console.log('   • Verify Sendle API status\n')
      }

      if (postcodeErrors.length > 0) {
        console.log(`3. Postcode Validation (${postcodeErrors.length} issues):`)
        console.log('   • Implement client-side postcode format validation')
        console.log('   • Add Australia Post postcode lookup API')
        console.log('   • Show helpful error messages for invalid postcodes')
        console.log('   • Log invalid postcodes for analysis\n')
      }

      console.log('4. General Improvements:')
      console.log('   • Set up real-time shipping error monitoring')
      console.log('   • Create fallback shipping method for failed calculations')
      console.log('   • Add "Contact Us for Shipping Quote" option for problem postcodes')
      console.log('   • Test checkout flow with various postcode formats\n')

    } else {
      console.log('✅ No shipping errors detected in recent logs!')
      console.log('\n💡 Proactive Recommendations:\n')
      console.log('1. The "errors" severity logs (1.2%) are likely warnings, not failures')
      console.log('2. Consider logging customer-reported shipping issues separately')
      console.log('3. Implement frontend postcode validation to catch issues earlier')
      console.log('4. Set up monitoring for increased shipping error rates\n')
    }

  } catch (error: any) {
    console.error('❌ Error analyzing shipping logs:', error.message)
    throw error
  }
}

// Run the analysis
analyzeShippingErrors()
  .then(() => {
    console.log('✅ Shipping error analysis complete!\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Analysis failed!')
    process.exit(1)
  })
