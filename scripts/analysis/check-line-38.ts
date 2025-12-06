import { n8nClient } from '../../shared/libs/n8n'

async function checkLine38() {
  const workflow = await n8nClient.getWorkflow('lj35rsDvrz5LK9Ox')
  const node = workflow.nodes.find(n => n.name === 'Prepare Signature String')
  const code = (node?.parameters as any)?.jsCode || ''
  const lines = code.split('\n')

  console.log('Total lines:', lines.length)
  console.log()
  console.log('Line 38:', lines[37])
  console.log()
  console.log('Lines 35-42:')
  lines.slice(34, 42).forEach((line: string, i: number) => {
    console.log(`${35+i}: ${line}`)
  })
  console.log()
  console.log('Searching for "crypto" references:')
  lines.forEach((line: string, i: number) => {
    if (line.toLowerCase().includes('crypto')) {
      console.log(`Line ${i+1}: ${line}`)
    }
  })
}

checkLine38()
