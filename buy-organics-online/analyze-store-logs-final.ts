/**
 * Final Store Logs Analysis - Working Credentials
 */

import { BigCommerceConnector } from '../shared/libs/integrations/bigcommerce'

const bigcommerceClient = new BigCommerceConnector({
  storeHash: 'hhhi',
  accessToken: 'eeikmonznnsxcq4f24m9d6uvv1e0qjn',
  clientId: 'dpl0bkhwwslejw3yk2vo9z7w54iusv2',
})

interface LogAnalysis {
  totalLogs: number
  errorLogs: number
  logsByType: Record<string, number>
  logsByModule: Record<string, number>
  logsBySeverity: Record<number, number>
  recentErrors: any[]
}

async function analyzeStoreLogs() {
  console.log('🔍 Fetching BigCommerce Store Logs...\n')

  try {
    // Fetch all available logs
    const allLogs = await bigcommerceClient.storeLogs.list({ limit: 250 })

    console.log(`📊 Total logs retrieved: ${allLogs.length}\n`)

    if (allLogs.length === 0) {
      console.log('✅ No logs found. Store appears to be running cleanly!')
      return
    }

    // Analyze logs
    const analysis: LogAnalysis = {
      totalLogs: allLogs.length,
      errorLogs: 0,
      logsByType: {},
      logsByModule: {},
      logsBySeverity: {},
      recentErrors: []
    }

    // Process each log
    for (const log of allLogs) {
      // Count by type
      analysis.logsByType[log.type] = (analysis.logsByType[log.type] || 0) + 1

      // Count by module
      analysis.logsByModule[log.module] = (analysis.logsByModule[log.module] || 0) + 1

      // Count by severity
      analysis.logsBySeverity[log.severity] = (analysis.logsBySeverity[log.severity] || 0) + 1

      // Track errors (severity >= 3)
      if (log.severity >= 3) {
        analysis.errorLogs++
        analysis.recentErrors.push(log)
      }
    }

    // Display analysis
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('                    LOG ANALYSIS SUMMARY')
    console.log('═══════════════════════════════════════════════════════════════\n')

    console.log(`📈 TOTAL LOGS: ${analysis.totalLogs}`)
    console.log(`🔴 ERROR LOGS (Severity >= 3): ${analysis.errorLogs}`)
    console.log(`🟢 INFO LOGS (Severity < 3): ${analysis.totalLogs - analysis.errorLogs}\n`)

    console.log('📊 LOGS BY SEVERITY:')
    Object.entries(analysis.logsBySeverity)
      .sort(([a], [b]) => Number(b) - Number(a))
      .forEach(([severity, count]) => {
        const emoji = Number(severity) >= 3 ? '🔴' : Number(severity) === 2 ? '🟡' : '🟢'
        const pct = ((count / analysis.totalLogs) * 100).toFixed(1)
        console.log(`   ${emoji} Severity ${severity}: ${count} (${pct}%)`)
      })
    console.log()

    console.log('📋 LOGS BY TYPE:')
    Object.entries(analysis.logsByType)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        const pct = ((count / analysis.totalLogs) * 100).toFixed(1)
        console.log(`   • ${type}: ${count} (${pct}%)`)
      })
    console.log()

    console.log('🔧 LOGS BY MODULE:')
    Object.entries(analysis.logsByModule)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10) // Top 10 modules
      .forEach(([module, count]) => {
        const pct = ((count / analysis.totalLogs) * 100).toFixed(1)
        console.log(`   • ${module}: ${count} (${pct}%)`)
      })
    if (Object.keys(analysis.logsByModule).length > 10) {
      console.log(`   ... and ${Object.keys(analysis.logsByModule).length - 10} more modules`)
    }
    console.log()

    // Display recent errors in detail
    if (analysis.recentErrors.length > 0) {
      console.log('═══════════════════════════════════════════════════════════════')
      console.log('                    DETAILED ERROR LOGS')
      console.log('═══════════════════════════════════════════════════════════════\n')

      // Sort by date (most recent first)
      analysis.recentErrors.sort((a, b) =>
        new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
      )

      // Show up to 20 most recent errors
      const errorsToShow = analysis.recentErrors.slice(0, 20)

      errorsToShow.forEach((error, index) => {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`ERROR ${index + 1} of ${errorsToShow.length} (Total Errors: ${analysis.recentErrors.length})`)
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`🔴 Severity: ${error.severity}`)
        console.log(`📅 Date: ${new Date(error.date_created).toLocaleString()}`)
        console.log(`📦 Type: ${error.type}`)
        console.log(`🔧 Module: ${error.module}`)
        console.log(`📝 Summary: ${error.summary}`)
        console.log(`💬 Message: ${error.message}`)
        if (error.staff_name) {
          console.log(`👤 Staff: ${error.staff_name} (ID: ${error.staff_id})`)
        }
      })

      if (analysis.recentErrors.length > 20) {
        console.log(`\n... and ${analysis.recentErrors.length - 20} more errors not shown`)
      }

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    } else {
      console.log('✅ No error-level logs found!\n')
    }

    // Return analysis for programmatic use
    return analysis

  } catch (error) {
    console.error('❌ Error fetching store logs:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
    throw error
  }
}

// Run the analysis
analyzeStoreLogs()
  .then((analysis) => {
    if (analysis) {
      console.log('✅ Log analysis complete!')
      console.log('\n📊 SUMMARY:')
      console.log(`   Total Logs: ${analysis.totalLogs}`)
      console.log(`   Errors: ${analysis.errorLogs}`)
      console.log(`   Error Rate: ${((analysis.errorLogs / analysis.totalLogs) * 100).toFixed(1)}%`)
      process.exit(0)
    }
  })
  .catch((error) => {
    console.error('\n❌ Log analysis failed!')
    process.exit(1)
  })
