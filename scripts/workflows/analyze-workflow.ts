/**
 * Analyze Specific Workflow
 */

import { n8nClient, analyzeWorkflow, generateWorkflowDocs } from '../../shared/libs/n8n'

const workflowId = process.argv[2] || 'lj35rsDvrz5LK9Ox'

async function analyzeSpecificWorkflow() {
  try {
    console.log('🔍 Analyzing workflow:', workflowId)
    console.log()

    // Get workflow details
    const workflow = await n8nClient.getWorkflow(workflowId)

    console.log('═'.repeat(70))
    console.log('WORKFLOW DETAILS')
    console.log('═'.repeat(70))
    console.log('Name:', workflow.name)
    console.log('ID:', workflow.id)
    console.log('Active:', workflow.active ? '🟢 Yes' : '⚫ No')
    console.log('Nodes:', workflow.nodes.length)
    console.log('Created:', workflow.createdAt)
    console.log('Updated:', workflow.updatedAt)
    console.log()

    // List nodes
    console.log('Node Structure:')
    workflow.nodes.forEach((node: { name: string; type: string; disabled?: boolean; notes?: string }, idx: number) => {
      const disabled = node.disabled ? ' [DISABLED]' : ''
      console.log(`  ${idx + 1}. ${node.name} (${node.type})${disabled}`)
      if (node.notes) {
        console.log(`     Notes: ${node.notes}`)
      }
    })
    console.log()

    // Analyze workflow
    const analysis = analyzeWorkflow(workflow)
    console.log('═'.repeat(70))
    console.log('WORKFLOW ANALYSIS')
    console.log('═'.repeat(70))
    console.log('Complexity:', analysis.complexity.toUpperCase())
    console.log('Node Count:', analysis.nodeCount)
    console.log('Trigger Type:', analysis.triggerType || 'None')
    console.log('Has Error Handling:', analysis.hasErrorHandling ? 'Yes' : 'No')
    console.log('Est. Execution Time:', analysis.estimatedExecutionTime)
    console.log()

    // Get recent executions
    const { data: executions } = await n8nClient.listExecutions({
      workflowId,
      limit: 10
    })

    console.log('═'.repeat(70))
    console.log('RECENT EXECUTIONS (Last 10)')
    console.log('═'.repeat(70))
    if (executions.length > 0) {
      executions.forEach((exec: { id: string; status?: string; finished?: boolean; startedAt: string }, idx: number) => {
        const status = exec.status || (exec.finished ? 'success' : 'error')
        const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳'
        const date = new Date(exec.startedAt).toLocaleString()
        console.log(`${emoji} ${exec.id} - ${status.toUpperCase()} - ${date}`)
      })
    } else {
      console.log('No executions found')
    }
    console.log()

    // Get statistics
    const stats = await n8nClient.getWorkflowStats(workflowId)
    console.log('═'.repeat(70))
    console.log('EXECUTION STATISTICS')
    console.log('═'.repeat(70))
    console.log('Total executions:', stats.total)
    console.log('✅ Success:', stats.success)
    console.log('❌ Errors:', stats.error)
    console.log('⏳ Running:', stats.running)
    console.log('⏸️  Waiting:', stats.waiting)

    if (stats.total > 0) {
      const successRate = (stats.success / stats.total) * 100
      console.log('Success rate:', successRate.toFixed(2) + '%')

      if (successRate < 80) {
        console.log('⚠️  WARNING: Low success rate detected!')
      }
    }
    console.log()

    // Get last failed execution details
    if (stats.error > 0) {
      console.log('═'.repeat(70))
      console.log('ANALYZING FAILURES')
      console.log('═'.repeat(70))

      const { data: failedExecs } = await n8nClient.listExecutions({
        workflowId,
        status: 'error',
        limit: 5
      })

      if (failedExecs.length > 0) {
        console.log('Recent failures:')
        failedExecs.forEach((exec: { id: string; startedAt: string; stoppedAt?: string; data?: { resultData?: { error?: { message?: string } } } }, idx: number) => {
          console.log(`\n${idx + 1}. Execution ${exec.id}`)
          console.log(`   Started: ${new Date(exec.startedAt).toLocaleString()}`)
          console.log(`   Stopped: ${exec.stoppedAt ? new Date(exec.stoppedAt).toLocaleString() : 'N/A'}`)

          // Try to extract error information
          if (exec.data?.resultData?.error) {
            console.log(`   Error: ${exec.data.resultData.error.message || 'Unknown error'}`)
          }
        })
      }
      console.log()
    }

    // Generate documentation
    console.log('═'.repeat(70))
    console.log('WORKFLOW DOCUMENTATION')
    console.log('═'.repeat(70))
    const docs = generateWorkflowDocs(workflow)
    console.log(docs)
    console.log()

    // Recommendations
    console.log('═'.repeat(70))
    console.log('RECOMMENDATIONS')
    console.log('═'.repeat(70))

    const recommendations: string[] = []

    if (!workflow.active) {
      recommendations.push('⚫ Workflow is inactive - activate it to start processing')
    }

    if (!analysis.hasErrorHandling) {
      recommendations.push('⚠️  Add error handling nodes to catch and handle failures')
    }

    if (stats.error > stats.success && stats.total > 5) {
      recommendations.push('❌ More failures than successes - needs immediate attention')
    }

    if (analysis.complexity === 'complex' && !analysis.hasErrorHandling) {
      recommendations.push('⚠️  Complex workflow without error handling is risky')
    }

    if (workflow.nodes.some((n: { disabled?: boolean }) => n.disabled)) {
      recommendations.push('ℹ️  Some nodes are disabled - review if this is intentional')
    }

    if (recommendations.length > 0) {
      recommendations.forEach((rec, idx) => {
        console.log(`${idx + 1}. ${rec}`)
      })
    } else {
      console.log('✅ No major issues detected')
    }
    console.log()

    // Export workflow for backup
    console.log('💾 Exporting workflow for backup...')
    const filename = `backup-${workflow.id}-${Date.now()}.json`
    await n8nClient.exportWorkflowToFile(workflowId, filename)
    console.log(`   Saved to: ${filename}`)
    console.log()

  } catch (error) {
    console.error('❌ Error analyzing workflow:')
    if (error instanceof Error) {
      console.error(error.message)
    } else {
      console.error(String(error))
    }
    process.exit(1)
  }
}

analyzeSpecificWorkflow()
