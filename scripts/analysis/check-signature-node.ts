import { n8nClient } from '../../shared/libs/n8n'

async function checkNode() {
  const workflow = await n8nClient.getWorkflow('lj35rsDvrz5LK9Ox')
  const signatureNode = workflow.nodes.find(n => n.name === 'Prepare Signature String')

  console.log('═'.repeat(70))
  console.log('SIGNATURE NODE DETAILS')
  console.log('═'.repeat(70))
  console.log('Type:', signatureNode?.type)
  console.log()
  console.log('Code:')
  console.log('═'.repeat(70))
  console.log((signatureNode?.parameters as any)?.jsCode || 'No code found')
  console.log('═'.repeat(70))
}

checkNode()
