/**
 * Execute and Monitor Workflow
 *
 * Manually trigger a workflow and monitor its execution
 */

import { n8nClient } from './shared/libs/n8n'

const WORKFLOW_ID = process.argv[2] || 'lj35rsDvrz5LK9Ox'

async function executeAndMonitor() {
  console.log('🚀 Execute and Monitor Workflow\n')

  try {
    // Step 1: Get workflow info
    console.log('1️⃣  Getting workflow details...')
    const workflow = await n8nClient.getWorkflow(WORKFLOW_ID)
    console.log(`   Name: ${workflow.name}`)
    console.log(`   Status: ${workflow.active ? '🟢 Active' : '⚫ Inactive'}`)
    console.log(`   Nodes: ${workflow.nodes.length}`)
    console.log()

    // Step 2: Execute the workflow
    console.log('2️⃣  Manually triggering workflow...')
    console.log('   ⚠️  This will run the workflow immediately')
    console.log()

    let execution
    try {
      execution = await n8nClient.executeWorkflow(WORKFLOW_ID)
      console.log(`   ✅ Execution started: ${execution.id}`)
      console.log(`      Mode: ${execution.mode}`)
      console.log(`      Started at: ${new Date(execution.startedAt).toLocaleString()}`)
      console.log()
    } catch (error: any) {
      if (error.message.includes('404')) {
        console.log('   ⚠️  Cannot execute via API (workflow may need to be active)')
        console.log('   💡 Checking most recent execution instead...')
        console.log()

        const { data: recentExecs } = await n8nClient.listExecutions({
          workflowId: WORKFLOW_ID,
          limit: 1
        })

        if (recentExecs.length === 0) {
          console.log('   ℹ️  No executions found.')
          console.log('   Please manually trigger in n8n UI:')
          console.log(`   https://automation.growthcohq.com/workflow/${WORKFLOW_ID}`)
          return
        }

        execution = recentExecs[0]
        console.log(`   Using latest execution: ${execution.id}`)
        console.log()
      } else {
        throw error
      }
    }

    // Step 3: Wait for execution to complete
    console.log('3️⃣  Waiting for execution to complete...')
    const startTime = Date.now()
    let attempts = 0
    let fullExecution

    while (attempts < 30) { // Max 30 seconds
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++

      fullExecution = await n8nClient.getExecution(execution.id)

      if (fullExecution.finished || fullExecution.stoppedAt) {
        break
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000)
      process.stdout.write(`\r   ⏳ Running... ${elapsed}s`)
    }

    console.log('\n')

    if (!fullExecution) {
      console.log('   ⚠️  Could not get execution status')
      return
    }

    // Step 4: Analyze results
    console.log('4️⃣  Analyzing execution results...')
    const status = fullExecution.status || (fullExecution.finished ? 'success' : 'error')
    const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳'

    console.log(`   ${emoji} Status: ${status.toUpperCase()}`)

    if (fullExecution.stoppedAt) {
      const duration = (new Date(fullExecution.stoppedAt).getTime() -
                       new Date(fullExecution.startedAt).getTime()) / 1000
      console.log(`   Duration: ${duration.toFixed(2)}s`)
    }
    console.log()

    // Step 5: Show execution details
    console.log('═'.repeat(70))
    console.log('EXECUTION DETAILS')
    console.log('═'.repeat(70))

    if (fullExecution.data?.resultData?.runData) {
      const runData = fullExecution.data.resultData.runData
      console.log('\nNodes executed:')

      Object.entries(runData).forEach(([nodeName, runs]: [string, any], idx) => {
        const lastRun = runs[runs.length - 1]
        const hasError = lastRun?.error

        if (hasError) {
          console.log(`  ${idx + 1}. ❌ ${nodeName}`)
          console.log(`      Error: ${lastRun.error.message}`)
        } else {
          const dataCount = lastRun?.data?.main?.[0]?.length || 0
          console.log(`  ${idx + 1}. ✅ ${nodeName} (${dataCount} item${dataCount !== 1 ? 's' : ''})`)
        }
      })
      console.log()
    }

    // Step 6: Show errors if any
    if (status === 'error') {
      console.log('═'.repeat(70))
      console.log('❌ ERROR INFORMATION')
      console.log('═'.repeat(70))

      if (fullExecution.data?.resultData?.error) {
        const error = fullExecution.data.resultData.error
        console.log('Error:', error.message || 'Unknown error')
        console.log()

        if (error.description) {
          console.log('Description:', error.description)
          console.log()
        }
      }

      if (fullExecution.data?.resultData?.lastNodeExecuted) {
        console.log('Failed at node:', fullExecution.data.resultData.lastNodeExecuted)
        console.log()
      }

      console.log('View full details:')
      console.log(`https://automation.growthcohq.com/execution/${execution.id}`)
      console.log()
    } else {
      console.log('═'.repeat(70))
      console.log('✅ EXECUTION SUCCESSFUL')
      console.log('═'.repeat(70))
      console.log()
      console.log('The workflow completed without errors!')
      console.log()
      console.log('View execution:')
      console.log(`https://automation.growthcohq.com/execution/${execution.id}`)
      console.log()
    }

    // Step 7: Updated statistics
    console.log('5️⃣  Getting updated statistics...')
    const stats = await n8nClient.getWorkflowStats(WORKFLOW_ID)
    const successRate = stats.total > 0 ? (stats.success / stats.total * 100).toFixed(2) : '0.00'

    console.log()
    console.log('Workflow Statistics:')
    console.log(`  Total executions: ${stats.total}`)
    console.log(`  ✅ Success: ${stats.success}`)
    console.log(`  ❌ Errors: ${stats.error}`)
    console.log(`  📊 Success Rate: ${successRate}%`)
    console.log()

    return { execution: fullExecution, stats }

  } catch (error) {
    console.error('\n❌ Error:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    } else {
      console.error(`   ${String(error)}`)
    }
    process.exit(1)
  }
}

executeAndMonitor()
