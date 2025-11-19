/**
 * n8n Workflow Importer
 *
 * Imports workflow JSON files to an n8n instance via REST API.
 *
 * Usage:
 *   npx tsx infra/n8n-workflows/importWorkflow.ts <workflow-file.json>
 *
 * Environment Variables Required:
 *   N8N_BASE_URL - Your n8n instance URL (e.g., https://n8n.example.com)
 *   N8N_API_KEY - Your n8n API key
 *
 * Example:
 *   npx tsx infra/n8n-workflows/importWorkflow.ts supervisor-analyze-tasks.json
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

interface N8nWorkflow {
  name: string
  nodes: any[]
  connections: any
  active?: boolean
  settings?: any
  [key: string]: any
}

interface N8nApiResponse {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Validate required environment variables
 */
function validateEnvironment(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.N8N_BASE_URL
  const apiKey = process.env.N8N_API_KEY

  if (!baseUrl) {
    throw new Error(
      'N8N_BASE_URL environment variable is required.\n' +
      'Set it in your .env file: N8N_BASE_URL=https://your-n8n-instance.com'
    )
  }

  if (!apiKey) {
    throw new Error(
      'N8N_API_KEY environment variable is required.\n' +
      'Generate an API key in n8n: Settings → API → Create API Key\n' +
      'Then add to .env file: N8N_API_KEY=your-api-key'
    )
  }

  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey }
}

/**
 * Read and parse workflow JSON file
 */
function readWorkflowFile(filename: string): N8nWorkflow {
  const filePath = path.resolve(__dirname, filename)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Workflow file not found: ${filePath}`)
  }

  console.log(`📄 Reading workflow from: ${filePath}`)

  const fileContent = fs.readFileSync(filePath, 'utf-8')

  try {
    const workflow = JSON.parse(fileContent) as N8nWorkflow
    return workflow
  } catch (error) {
    throw new Error(`Failed to parse workflow JSON: ${error}`)
  }
}

/**
 * Import workflow to n8n via API
 */
async function importWorkflow(
  workflow: N8nWorkflow,
  baseUrl: string,
  apiKey: string
): Promise<N8nApiResponse> {
  const url = `${baseUrl}/api/v1/workflows`

  console.log(`🚀 Importing workflow to: ${url}`)
  console.log(`   Workflow name: ${workflow.name}`)
  console.log(`   Number of nodes: ${workflow.nodes.length}`)

  // Prepare workflow data
  // Remove fields that shouldn't be sent on import
  const workflowData = {
    ...workflow,
  }
  delete workflowData.id // Let n8n assign new ID
  delete workflowData.createdAt
  delete workflowData.updatedAt

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': apiKey,
    },
    body: JSON.stringify(workflowData),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to import workflow (${response.status} ${response.statusText}):\n${errorText}`
    )
  }

  const result = (await response.json()) as N8nApiResponse
  return result
}

/**
 * Main execution
 */
async function main() {
  try {
    // Get workflow filename from command line argument
    const filename = process.argv[2]

    if (!filename) {
      console.error('❌ Error: Workflow filename is required\n')
      console.log('Usage:')
      console.log('  npx tsx infra/n8n-workflows/importWorkflow.ts <workflow-file.json>\n')
      console.log('Example:')
      console.log('  npx tsx infra/n8n-workflows/importWorkflow.ts supervisor-analyze-tasks.json')
      process.exit(1)
    }

    // Validate environment
    const { baseUrl, apiKey } = validateEnvironment()

    // Read workflow file
    const workflow = readWorkflowFile(filename)

    // Import workflow
    const result = await importWorkflow(workflow, baseUrl, apiKey)

    // Success!
    console.log('\n✅ Workflow imported successfully!')
    console.log(`   Workflow ID: ${result.id}`)
    console.log(`   Workflow Name: ${result.name}`)
    console.log(`   Active: ${result.active}`)
    console.log(`   Created: ${result.createdAt}`)
    console.log(`\n   View in n8n: ${baseUrl}/workflow/${result.id}`)

    if (!result.active) {
      console.log('\n⚠️  Note: Workflow is inactive. Activate it in n8n to start execution.')
    }

  } catch (error) {
    console.error('\n❌ Import failed:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    } else {
      console.error(`   ${String(error)}`)
    }
    process.exit(1)
  }
}

// Run the script
main()
