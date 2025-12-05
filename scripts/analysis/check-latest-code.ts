import { n8nClient } from '../../shared/libs/n8n'

async function checkCode() {
  const workflow = await n8nClient.getWorkflow('lj35rsDvrz5LK9Ox')
  const signatureNode = workflow.nodes.find(n => n.name === 'Prepare Signature String')

  console.log('Current code in workflow:')
  console.log('═'.repeat(70))
  console.log((signatureNode?.parameters as any)?.jsCode || 'No code')
  console.log('═'.repeat(70))
}

checkCode()
