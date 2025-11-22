/**
 * Example 6: Business Health Monitoring
 *
 * Demonstrates how to use the business automation helpers to:
 * - Check health of individual businesses
 * - Monitor all businesses
 * - Generate business reports
 * - Identify businesses needing attention
 *
 * Run: npx tsx examples/06-business-health-check.ts [business-slug]
 */

import { businessAutomation } from '../shared/libs/automation'
import { logger } from '../shared/libs/logger'

async function main() {
  const businessSlug = process.argv[2] // Optional: check specific business

  console.log('🏥 Business Health Check Example\n')

  try {
    if (businessSlug) {
      // ========================================
      // Check specific business
      // ========================================
      console.log(`1️⃣  Checking health of business: ${businessSlug}\n`)

      const health = await businessAutomation.checkBusinessHealth(businessSlug)

      console.log(`Business: ${health.businessSlug}`)
      console.log(`Status: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`)
      console.log('')

      console.log('🔗 Service Connections:')
      console.log(`   HubSpot: ${health.services.hubspot.connected ? '✅ Connected' : '❌ Disconnected'}`)
      if (health.services.hubspot.lastSync) {
        console.log(`   - Last Sync: ${health.services.hubspot.lastSync.toISOString()}`)
      }
      if (health.services.hubspot.error) {
        console.log(`   - Error: ${health.services.hubspot.error}`)
      }

      console.log(`   Unleashed: ${health.services.unleashed.connected ? '✅ Connected' : '❌ Disconnected'}`)
      if (health.services.unleashed.lastSync) {
        console.log(`   - Last Sync: ${health.services.unleashed.lastSync.toISOString()}`)
      }
      if (health.services.unleashed.error) {
        console.log(`   - Error: ${health.services.unleashed.error}`)
      }

      console.log('')

      if (health.lastActivity) {
        const hoursSinceActivity = (Date.now() - health.lastActivity.getTime()) / (1000 * 60 * 60)
        console.log(`⏱️  Last Activity: ${health.lastActivity.toISOString()}`)
        console.log(`   (${hoursSinceActivity.toFixed(1)} hours ago)`)
        console.log('')
      }

      if (health.recentErrors.length > 0) {
        console.log(`⚠️  Recent Errors (${health.recentErrors.length}):`)
        health.recentErrors.forEach(error => {
          console.log(`   - [${error.source}] ${error.message}`)
          console.log(`     ${error.timestamp.toISOString()}`)
        })
        console.log('')
      }

      // ========================================
      // Generate business report
      // ========================================
      console.log(`2️⃣  Generating 7-day report...\n`)

      const report = await businessAutomation.generateBusinessReport(businessSlug, 7)

      console.log(`📊 Report (${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()})`)
      console.log('')

      console.log(`📈 Operations:`)
      console.log(`   Total: ${report.operations.total}`)
      console.log(`   Success Rate: ${report.operations.successRate.toFixed(1)}%`)
      console.log(`   By Service:`)
      Object.entries(report.operations.byService).forEach(([service, count]) => {
        console.log(`   - ${service}: ${count}`)
      })
      console.log('')

      if (report.errors.total > 0) {
        console.log(`⚠️  Errors:`)
        console.log(`   Total: ${report.errors.total}`)
        console.log(`   By Service:`)
        Object.entries(report.errors.byService).forEach(([service, count]) => {
          console.log(`   - ${service}: ${count}`)
        })

        if (report.errors.topErrors.length > 0) {
          console.log(`   Top Errors:`)
          report.errors.topErrors.forEach(error => {
            console.log(`   - ${error.message} (${error.count} times)`)
          })
        }
        console.log('')
      }

      console.log(`⚡ Performance:`)
      console.log(`   Avg Duration: ${report.performance.avgDuration.toFixed(0)}ms`)
      console.log(`   P95 Duration: ${report.performance.p95Duration.toFixed(0)}ms`)
      console.log('')

    } else {
      // ========================================
      // Check all businesses
      // ========================================
      console.log(`1️⃣  Checking all businesses needing attention...\n`)

      const needingAttention = await businessAutomation.getBusinessesNeedingAttention()

      if (needingAttention.length === 0) {
        console.log('✅ All businesses are healthy!\n')
      } else {
        console.log(`⚠️  ${needingAttention.length} business(es) need attention:\n`)

        for (const health of needingAttention) {
          console.log(`❌ ${health.businessSlug}`)

          if (!health.services.hubspot.connected) {
            console.log(`   - HubSpot disconnected${health.services.hubspot.error ? ': ' + health.services.hubspot.error : ''}`)
          }

          if (!health.services.unleashed.connected) {
            console.log(`   - Unleashed disconnected${health.services.unleashed.error ? ': ' + health.services.unleashed.error : ''}`)
          }

          if (health.recentErrors.length > 0) {
            console.log(`   - ${health.recentErrors.length} recent errors`)
          }

          if (health.lastActivity) {
            const daysSinceActivity = (Date.now() - health.lastActivity.getTime()) / (1000 * 60 * 60 * 24)
            if (daysSinceActivity > 7) {
              console.log(`   - No activity in ${daysSinceActivity.toFixed(1)} days`)
            }
          }

          console.log('')
        }
      }

      console.log('💡 To check a specific business, run:')
      console.log('   npx tsx examples/06-business-health-check.ts [business-slug]')
      console.log('')
    }

    // ========================================
    // Summary
    // ========================================
    console.log('✅ Business health check completed!\n')

    console.log('💡 Available business automation functions:')
    console.log('   - businessAutomation.checkBusinessHealth(id)')
    console.log('   - businessAutomation.getBusinessesNeedingAttention()')
    console.log('   - businessAutomation.syncBusiness(id, options)')
    console.log('   - businessAutomation.syncAllBusinesses(options)')
    console.log('   - businessAutomation.generateBusinessReport(id, days)')
    console.log('   - businessAutomation.archiveBusinessData(id, beforeDate)')

  } catch (error) {
    console.error('\n❌ Error:', error)
    logger.error('Business health check failed', {
      source: 'example',
      metadata: {
        businessSlug,
        error: error instanceof Error ? error.message : String(error)
      }
    }, error as Error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { main }
