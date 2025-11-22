/**
 * Example 5: Workflow Monitoring and Management
 *
 * Demonstrates how to use the workflow automation helpers to:
 * - Monitor workflow health
 * - Retry failed executions
 * - Generate workflow reports
 * - Manage workflow activation
 *
 * Run: npx tsx examples/05-workflow-monitoring.ts
 */

import { workflowAutomation } from '../shared/libs/automation'
import { logger } from '../shared/libs/logger'

async function main() {
  console.log('🔍 Workflow Monitoring Example\n')

  try {
    // ========================================
    // 1. Check health of all workflows
    // ========================================
    console.log('1️⃣  Checking health of all workflows...\n')

    const healthStatuses = await workflowAutomation.checkAllWorkflowsHealth()

    console.log(`Found ${healthStatuses.length} workflows:\n`)

    healthStatuses.forEach(status => {
      const healthIcon = status.healthy ? '✅' : '❌'
      const activeIcon = status.active ? '🟢' : '⚪'

      console.log(`${healthIcon} ${activeIcon} ${status.workflowName}`)
      console.log(`   Success Rate: ${status.successRate.toFixed(1)}%`)
      console.log(`   Recent Failures: ${status.recentFailures}`)
      console.log(`   Avg Duration: ${status.avgDuration.toFixed(0)}ms`)

      if (status.issues.length > 0) {
        console.log(`   Issues: ${status.issues.join(', ')}`)
      }

      if (status.lastExecution) {
        console.log(`   Last Execution: ${status.lastExecution.toISOString()}`)
      }

      console.log('')
    })

    // ========================================
    // 2. Get workflows needing attention
    // ========================================
    console.log('2️⃣  Finding workflows that need attention...\n')

    const needingAttention = await workflowAutomation.getWorkflowsNeedingAttention()

    if (needingAttention.length === 0) {
      console.log('✅ All workflows are healthy!\n')
    } else {
      console.log(`⚠️  ${needingAttention.length} workflow(s) need attention:\n`)

      needingAttention.forEach(status => {
        console.log(`❌ ${status.workflowName}`)
        console.log(`   Issues:`)
        status.issues.forEach(issue => console.log(`   - ${issue}`))
        console.log('')
      })
    }

    // ========================================
    // 3. Monitor specific workflow
    // ========================================
    if (healthStatuses.length > 0) {
      const firstWorkflow = healthStatuses[0]

      console.log(`3️⃣  Monitoring workflow: ${firstWorkflow.workflowName}...\n`)

      await workflowAutomation.monitorWorkflow(firstWorkflow.workflowId, {
        errorThreshold: 3,
        sendAlerts: false // Set to true in production
      })

      console.log('✅ Monitoring complete\n')
    }

    // ========================================
    // 4. Generate workflow summary
    // ========================================
    if (healthStatuses.length > 0) {
      const firstWorkflow = healthStatuses[0]

      console.log(`4️⃣  Generating 7-day summary for: ${firstWorkflow.workflowName}...\n`)

      const summary = await workflowAutomation.generateWorkflowSummary(
        firstWorkflow.workflowId,
        7 // last 7 days
      )

      console.log(`📊 Summary (${summary.period.start.toLocaleDateString()} - ${summary.period.end.toLocaleDateString()})`)
      console.log(`   Total Executions: ${summary.totalExecutions}`)
      console.log(`   Success: ${summary.successCount} (${summary.successRate.toFixed(1)}%)`)
      console.log(`   Failures: ${summary.failureCount}`)
      console.log(`   Avg Duration: ${summary.avgDuration.toFixed(0)}ms`)
      console.log(`   P95 Duration: ${summary.p95Duration.toFixed(0)}ms`)

      if (summary.topErrors.length > 0) {
        console.log(`\n   Top Errors:`)
        summary.topErrors.forEach(error => {
          console.log(`   - ${error.message} (${error.count} times)`)
        })
      }

      console.log('')
    }

    // ========================================
    // 5. Retry failed executions (example)
    // ========================================
    if (healthStatuses.some(s => s.recentFailures > 0)) {
      const workflowWithFailures = healthStatuses.find(s => s.recentFailures > 0)

      if (workflowWithFailures) {
        console.log(`5️⃣  Retrying failed executions for: ${workflowWithFailures.workflowName}...\n`)

        const retryResult = await workflowAutomation.retryFailedExecutions(
          workflowWithFailures.workflowId,
          { limit: 5 } // Retry up to 5 failed executions
        )

        console.log(`📋 Retry Results:`)
        console.log(`   Retried: ${retryResult.retried}`)
        console.log(`   Succeeded: ${retryResult.succeeded}`)
        console.log(`   Failed: ${retryResult.failed}`)
        console.log('')
      }
    } else {
      console.log('5️⃣  No failed executions to retry\n')
    }

    // ========================================
    // 6. Example: Activate/Deactivate workflow
    // ========================================
    console.log('6️⃣  Workflow activation example...\n')

    // Find an inactive workflow
    const inactiveWorkflow = healthStatuses.find(s => !s.active)

    if (inactiveWorkflow) {
      console.log(`   Found inactive workflow: ${inactiveWorkflow.workflowName}`)
      console.log(`   Note: Use workflowAutomation.toggleWorkflow() to activate/deactivate`)
      console.log(`   Example: await workflowAutomation.toggleWorkflow('${inactiveWorkflow.workflowId}', true)`)
    } else {
      console.log(`   All workflows are active`)
    }

    console.log('')

    // ========================================
    // Summary
    // ========================================
    console.log('✅ Workflow monitoring example completed!\n')

    console.log('💡 Available automation functions:')
    console.log('   - workflowAutomation.checkWorkflowHealth(id)')
    console.log('   - workflowAutomation.checkAllWorkflowsHealth()')
    console.log('   - workflowAutomation.getWorkflowsNeedingAttention()')
    console.log('   - workflowAutomation.monitorWorkflow(id, options)')
    console.log('   - workflowAutomation.retryFailedExecutions(id, options)')
    console.log('   - workflowAutomation.generateWorkflowSummary(id, days)')
    console.log('   - workflowAutomation.toggleWorkflow(id, active)')
    console.log('   - workflowAutomation.activateAllWorkflows()')
    console.log('   - workflowAutomation.deactivateAllWorkflows()')
    console.log('   - workflowAutomation.cleanupOldExecutions(id, days)')

  } catch (error) {
    console.error('\n❌ Error:', error)
    logger.error('Workflow monitoring example failed', {
      source: 'example',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    }, error as Error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { main }
