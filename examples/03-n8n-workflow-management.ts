#!/usr/bin/env tsx
/**
 * Example: n8n Workflow Management
 *
 * Demonstrates managing n8n workflows programmatically:
 * - List workflows
 * - Get workflow details
 * - Activate/deactivate workflows
 * - View execution history
 * - Retry failed executions
 *
 * Usage:
 *   npx tsx examples/03-n8n-workflow-management.ts
 */

import { n8nClient, logger } from '../shared/libs/integrations'

async function main() {
  console.log('🔧 n8n Workflow Management Examples\n')

  try {
    // ==========================================================================
    // EXAMPLE 1: List All Workflows
    // ==========================================================================

    console.log('1️⃣  Listing all workflows...')
    const workflowsResponse = await n8nClient.workflows.list()

    console.log(`   ✓ Found ${workflowsResponse.data.length} workflows`)
    workflowsResponse.data.forEach(wf => {
      const status = wf.active ? '🟢 Active' : '⚪ Inactive'
      console.log(`     ${status} - ${wf.name} (${wf.id})`)
    })

    // ==========================================================================
    // EXAMPLE 2: Get Active Workflows
    // ==========================================================================

    console.log('\n2️⃣  Getting active workflows...')
    const activeWorkflows = await n8nClient.getActiveWorkflows()

    console.log(`   ✓ ${activeWorkflows.length} active workflows`)
    activeWorkflows.forEach(wf => {
      console.log(`     - ${wf.name}`)
    })

    // ==========================================================================
    // EXAMPLE 3: View Workflow Executions
    // ==========================================================================

    if (workflowsResponse.data.length > 0) {
      const firstWorkflow = workflowsResponse.data[0]

      console.log(`\n3️⃣  Viewing executions for: ${firstWorkflow.name}`)
      const executions = await n8nClient.executions.list({
        workflowId: firstWorkflow.id,
        limit: 10,
      })

      console.log(`   ✓ Found ${executions.data.length} executions`)
      executions.data.forEach(exec => {
        const status = exec.finished ? '✅ Completed' : '⏳ Running'
        const date = new Date(exec.startedAt).toLocaleString()
        console.log(`     ${status} - ${date} (${exec.id})`)
      })

      // ==========================================================================
      // EXAMPLE 4: Get Workflow Statistics
      // ==========================================================================

      console.log(`\n4️⃣  Getting statistics for: ${firstWorkflow.name}`)
      const stats = await n8nClient.getWorkflowStats(firstWorkflow.id)

      console.log(`   ✓ Total executions: ${stats.totalExecutions}`)
      console.log(`   ✓ Successful: ${stats.successfulExecutions}`)
      console.log(`   ✓ Failed: ${stats.failedExecutions}`)
      console.log(`   ✓ Success rate: ${stats.successRate.toFixed(2)}%`)

      // ==========================================================================
      // EXAMPLE 5: Get Failed Executions
      // ==========================================================================

      console.log(`\n5️⃣  Checking for failed executions...`)
      const failedExecs = await n8nClient.getFailedExecutions(firstWorkflow.id, 5)

      if (failedExecs.length > 0) {
        console.log(`   ⚠️  Found ${failedExecs.length} failed executions`)
        failedExecs.forEach(exec => {
          const date = new Date(exec.startedAt).toLocaleString()
          console.log(`     - ${date} (${exec.id})`)
        })

        console.log('\n   💡 To retry a failed execution:')
        console.log(`      await n8nClient.executions.retry('execution-id')`)
      } else {
        console.log(`   ✅ No failed executions`)
      }
    }

    // ==========================================================================
    // EXAMPLE 6: Workflow Activation (Dry Run)
    // ==========================================================================

    console.log('\n6️⃣  Workflow activation example (not executing)')
    console.log('     To activate/deactivate a workflow:')
    console.log(`
    // Activate
    await n8nClient.workflows.activate('workflow-id')

    // Deactivate
    await n8nClient.workflows.deactivate('workflow-id')
    `)

    // ==========================================================================
    // EXAMPLE 7: Custom Logging
    // ==========================================================================

    console.log('\n7️⃣  Logging workflow health check...')
    logger.info('n8n workflow health check completed', {
      source: 'n8n',
      operation: 'healthCheck',
      metadata: {
        totalWorkflows: workflowsResponse.data.length,
        activeWorkflows: activeWorkflows.length,
      },
    })

    console.log('   ✓ Logged to Supabase')

    console.log('\n✅ All examples completed!\n')
    console.log('💡 View logs: ops logs --source=n8n\n')

  } catch (error) {
    console.error('❌ Error running examples:', (error as Error).message)
    logger.error('n8n examples failed', {
      source: 'n8n',
      operation: 'examples',
    }, error as Error)
    process.exit(1)
  }
}

main()
