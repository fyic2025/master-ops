/**
 * Diagnose Workflow Errors
 *
 * Check recent executions and identify what's failing
 */

import { n8nClient } from '../../shared/libs/n8n'

const WORKFLOW_ID = 'lj35rsDvrz5LK9Ox'

async function diagnoseErrors() {
  console.log('🔍 Diagnosing Workflow Errors\n')

  try {
    // Get workflow status
    console.log('1️⃣  Checking workflow status...')
    const workflow = await n8nClient.getWorkflow(WORKFLOW_ID)
    console.log(`   Workflow: ${workflow.name}`)
    console.log(`   Status: ${workflow.active ? '🟢 Active' : '⚫ Inactive'}`)
    console.log(`   Last updated: ${workflow.updatedAt}`)
    console.log()

    // Get recent executions
    console.log('2️⃣  Fetching recent executions...')
    const { data: executions } = await n8nClient.listExecutions({
      workflowId: WORKFLOW_ID,
      limit: 5
    })

    console.log(`   Found ${executions.length} recent execution(s)`)
    console.log()

    if (executions.length === 0) {
      console.log('   ℹ️  No executions yet. Workflow may not have run since activation.')
      console.log('   💡 Manually trigger it in n8n or wait for the schedule.')
      return
    }

    // Display execution summary
    console.log('═'.repeat(70))
    console.log('RECENT EXECUTIONS')
    console.log('═'.repeat(70))
    executions.forEach((exec: { id: string; status?: string; finished?: boolean; startedAt: string }, idx: number) => {
      const status = exec.status || (exec.finished ? 'success' : 'error')
      const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳'
      const date = new Date(exec.startedAt).toLocaleString()
      console.log(`${idx + 1}. ${emoji} ${exec.id} - ${status.toUpperCase()} - ${date}`)
    })
    console.log()

    // Get the latest execution details
    const latestExec = executions[0]
    const status = latestExec.status || (latestExec.finished ? 'success' : 'error')

    console.log('3️⃣  Analyzing latest execution...')
    console.log(`   ID: ${latestExec.id}`)
    console.log(`   Status: ${status}`)
    console.log(`   Started: ${new Date(latestExec.startedAt).toLocaleString()}`)
    if (latestExec.stoppedAt) {
      const duration = (new Date(latestExec.stoppedAt).getTime() - new Date(latestExec.startedAt).getTime()) / 1000
      console.log(`   Duration: ${duration.toFixed(2)}s`)
    }
    console.log()

    // Get full execution details
    const fullExec = await n8nClient.getExecution(latestExec.id)

    if (status === 'error' || !fullExec.finished) {
      console.log('═'.repeat(70))
      console.log('❌ ERROR DETAILS')
      console.log('═'.repeat(70))

      // Try to extract error information
      if (fullExec.data?.resultData) {
        const resultData = fullExec.data.resultData

        // Check for error object
        if (resultData.error) {
          console.log('Error Type:', resultData.error.name || 'Unknown')
          console.log('Error Message:', resultData.error.message || 'No message')
          console.log()

          if (resultData.error.stack) {
            console.log('Stack Trace:')
            console.log(resultData.error.stack.split('\n').slice(0, 10).join('\n'))
            console.log()
          }
        }

        // Check lastNodeExecuted
        if (resultData.lastNodeExecuted) {
          console.log('Failed at Node:', resultData.lastNodeExecuted)
          console.log()
        }

        // Check runData for node-specific errors
        if (resultData.runData) {
          console.log('Node Execution Details:')
          Object.entries(resultData.runData).forEach(([nodeName, runs]: [string, any]) => {
            const lastRun = runs[runs.length - 1]
            if (lastRun?.error) {
              console.log(`\n  ❌ ${nodeName}:`)
              console.log(`     Error: ${lastRun.error.message}`)
              if (lastRun.error.description) {
                console.log(`     Description: ${lastRun.error.description}`)
              }
            }
          })
          console.log()
        }
      }

      // Print full execution data for debugging
      console.log('═'.repeat(70))
      console.log('FULL EXECUTION DATA (First 2000 chars)')
      console.log('═'.repeat(70))
      if (fullExec.data) {
        const execJson = JSON.stringify(fullExec.data, null, 2)
        console.log(execJson.substring(0, 2000))
        if (execJson.length > 2000) {
          console.log('\n... (truncated)')
        }
      } else {
        console.log('No execution data available')
      }
      console.log()
    } else {
      console.log('✅ Latest execution was successful!')
      console.log()

      // Show what happened
      if (fullExec.data?.resultData?.runData) {
        console.log('Nodes executed:')
        Object.keys(fullExec.data.resultData.runData).forEach((nodeName, idx) => {
          console.log(`  ${idx + 1}. ${nodeName}`)
        })
        console.log()
      }
    }

    // Recommendations
    console.log('═'.repeat(70))
    console.log('RECOMMENDATIONS')
    console.log('═'.repeat(70))

    if (status === 'error') {
      console.log('Common issues to check:')
      console.log('  1. Google Sheets permissions - ensure FYIC Google Sheets credential is valid')
      console.log('  2. Unleashed API credentials - verify API Key and Secret are correct')
      console.log('  3. Data format - check if Google Sheet has required columns')
      console.log('  4. Network connectivity - ensure n8n can reach external APIs')
      console.log('  5. Node.js crypto module - ensure it\'s available in n8n environment')
      console.log()
      console.log('View full execution in n8n:')
      console.log(`  https://automation.growthcohq.com/execution/${latestExec.id}`)
    } else {
      console.log('✅ No issues detected!')
    }
    console.log()

  } catch (error) {
    console.error('❌ Error during diagnosis:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    } else {
      console.error(`   ${String(error)}`)
    }
    process.exit(1)
  }
}

diagnoseErrors()
