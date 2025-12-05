import { n8nClient } from '../../shared/libs/n8n'

async function deepCheck() {
  const exec = await n8nClient.getExecution('19068')

  console.log('═'.repeat(70))
  console.log('EXECUTION 19068 - DEEP ANALYSIS')
  console.log('═'.repeat(70))
  console.log()
  console.log('Basic Info:')
  console.log('  ID:', exec.id)
  console.log('  Workflow ID:', exec.workflowId)
  console.log('  Started:', exec.startedAt)
  console.log('  Stopped:', exec.stoppedAt || 'Still running')
  console.log('  Finished:', exec.finished)
  console.log('  Mode:', exec.mode)
  console.log()

  console.log('Status:')
  console.log('  exec.status:', exec.status || 'undefined')
  console.log()

  console.log('Data availability:')
  console.log('  Has data:', !!exec.data)
  console.log('  Has workflowData:', !!exec.workflowData)
  console.log()

  if (exec.data) {
    console.log('Data structure:')
    console.log('  Keys:', Object.keys(exec.data))
    console.log()

    if ((exec.data as any).resultData) {
      const resultData = (exec.data as any).resultData
      console.log('Result Data:')
      console.log('  Keys:', Object.keys(resultData))
      console.log()

      if (resultData.error) {
        console.log('═'.repeat(70))
        console.log('ERROR FOUND')
        console.log('═'.repeat(70))
        console.log(JSON.stringify(resultData.error, null, 2))
        console.log()
      }

      if (resultData.lastNodeExecuted) {
        console.log('Last node executed:', resultData.lastNodeExecuted)
        console.log()
      }

      if (resultData.runData) {
        console.log('Run Data (nodes executed):')
        const nodes = Object.keys(resultData.runData)
        nodes.forEach((nodeName, idx) => {
          console.log(`  ${idx + 1}. ${nodeName}`)
        })
        console.log()

        // Check each node for errors
        console.log('Checking each node for errors...')
        nodes.forEach(nodeName => {
          const nodeData = resultData.runData[nodeName]
          if (nodeData && nodeData.length > 0) {
            const lastRun = nodeData[nodeData.length - 1]
            if (lastRun.error) {
              console.log()
              console.log(`❌ ERROR in node "${nodeName}":`)
              console.log(JSON.stringify(lastRun.error, null, 2))
            }
          }
        })
        console.log()
      }
    }

    // Print everything for debugging
    console.log('═'.repeat(70))
    console.log('FULL EXECUTION OBJECT')
    console.log('═'.repeat(70))
    console.log(JSON.stringify(exec, null, 2).substring(0, 5000))
    console.log()
  }
}

deepCheck().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
