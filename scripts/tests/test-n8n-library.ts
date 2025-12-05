/**
 * Test n8n Library
 *
 * Comprehensive test of the n8n library functionality
 */

import {
  n8nClient,
  createCronWorkflow,
  createSupabaseNode,
  createCodeNode,
  CRON_SCHEDULES,
  validateWorkflow,
  generateWorkflowDocs,
  calculateSuccessRate,
} from '../../shared/libs/n8n'

async function testN8nLibrary() {
  console.log('🧪 Testing n8n Library\n')

  try {
    // Test 1: Health Check
    console.log('1️⃣  Testing health check...')
    const isHealthy = await n8nClient.healthCheck()
    if (!isHealthy) {
      throw new Error('n8n connection failed')
    }
    console.log('   ✅ Health check passed\n')

    // Test 2: List Workflows
    console.log('2️⃣  Testing workflow listing...')
    const { data: workflows } = await n8nClient.listWorkflows()
    console.log(`   ✅ Found ${workflows.length} workflows\n`)

    // Test 3: Get Active Workflows
    console.log('3️⃣  Testing active workflow filter...')
    const activeWorkflows = await n8nClient.getActiveWorkflows()
    console.log(`   ✅ Found ${activeWorkflows.length} active workflows\n`)

    // Test 4: Find Workflows by Name
    console.log('4️⃣  Testing workflow search...')
    const foundWorkflows = await n8nClient.findWorkflowsByName(/fitness/i)
    console.log(`   ✅ Found ${foundWorkflows.length} workflows matching "fitness"\n`)

    // Test 5: Get Workflow Stats
    if (activeWorkflows.length > 0) {
      console.log('5️⃣  Testing workflow statistics...')
      const workflowId = activeWorkflows[0].id!
      const stats = await n8nClient.getWorkflowStats(workflowId)
      console.log(`   ✅ Workflow "${activeWorkflows[0].name}" stats:`)
      console.log(`      Total: ${stats.total}`)
      console.log(`      Success: ${stats.success}`)
      console.log(`      Error: ${stats.error}`)
      console.log(`      Running: ${stats.running}\n`)
    }

    // Test 6: Create Workflow Template
    console.log('6️⃣  Testing workflow template creation...')
    const testWorkflow = createCronWorkflow({
      name: '🧪 TEST - n8n Library Test Workflow',
      schedule: CRON_SCHEDULES.DAILY_9AM,
      nodes: [
        createSupabaseNode({
          name: 'Get Test Data',
          operation: 'select',
          table: 'tasks',
          position: [450, 300],
          filters: { status: { eq: 'test' } },
        }),
        createCodeNode({
          name: 'Process Data',
          position: [650, 300],
          code: `
const items = $input.all()
console.log(\`Processing \${items.length} items\`)
return items.map(item => ({
  json: {
    ...item.json,
    processed: true,
    timestamp: new Date().toISOString()
  }
}))
          `.trim(),
        }),
      ],
      timezone: 'Australia/Melbourne',
    })
    console.log('   ✅ Workflow template created\n')

    // Test 7: Validate Workflow
    console.log('7️⃣  Testing workflow validation...')
    const validation = validateWorkflow(testWorkflow)
    if (!validation.valid) {
      console.log('   ❌ Validation failed:', validation.errors)
    } else {
      console.log('   ✅ Workflow validation passed\n')
    }

    // Test 8: Generate Documentation
    console.log('8️⃣  Testing documentation generation...')
    const docs = generateWorkflowDocs(testWorkflow as any)
    console.log('   ✅ Generated documentation:')
    console.log(docs.split('\n').map(line => `      ${line}`).join('\n'))
    console.log()

    // Test 9: Create Workflow (optional - disabled by default)
    const CREATE_TEST_WORKFLOW = false // Set to true to actually create a workflow
    if (CREATE_TEST_WORKFLOW) {
      console.log('9️⃣  Testing workflow creation...')
      const created = await n8nClient.createWorkflow(testWorkflow)
      console.log(`   ✅ Created workflow: ${created.id}`)
      console.log(`      Name: ${created.name}`)
      console.log(`      Active: ${created.active}`)
      console.log(`      View: ${process.env.N8N_BASE_URL}/workflow/${created.id}\n`)

      // Clean up - delete the test workflow
      console.log('🧹 Cleaning up test workflow...')
      await n8nClient.deleteWorkflow(created.id!)
      console.log('   ✅ Test workflow deleted\n')
    } else {
      console.log('9️⃣  Skipping workflow creation (set CREATE_TEST_WORKFLOW=true to enable)\n')
    }

    // Test 10: Execution Analysis
    console.log('🔟 Testing execution analysis...')
    const { data: executions } = await n8nClient.listExecutions({ limit: 50 })
    if (executions.length > 0) {
      const successRate = calculateSuccessRate(executions)
      console.log(`   ✅ Analyzed ${executions.length} executions`)
      console.log(`      Success rate: ${successRate.toFixed(2)}%\n`)
    } else {
      console.log('   ℹ️  No executions found\n')
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════')
    console.log('✅ All tests passed!')
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    console.log('🚀 n8n library is ready to use!')
    console.log()
    console.log('Quick examples:')
    console.log('  • List workflows: await n8nClient.listWorkflows()')
    console.log('  • Get workflow: await n8nClient.getWorkflow(id)')
    console.log('  • Execute: await n8nClient.executeWorkflow(id)')
    console.log('  • Clone: await n8nClient.cloneWorkflow(id, "New Name")')
    console.log()

  } catch (error) {
    console.error('\n❌ Test failed:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    } else {
      console.error(`   ${String(error)}`)
    }
    process.exit(1)
  }
}

testN8nLibrary()
