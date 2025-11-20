#!/usr/bin/env tsx
/**
 * n8n Workflow Credential Tester
 *
 * Tests if credentials used in a workflow actually work
 * Prevents deploying workflows with invalid/expired credentials
 *
 * Usage: npx tsx test-workflow-credentials.ts <workflow-id-or-file>
 */

import { n8nClient } from './shared/libs/n8n'
import type { N8nWorkflow, N8nNode } from './shared/libs/n8n/client'
import { bearerAuth, apiKeyAuth, hmacAuth, basicAuth } from './.claude/skills/integration-tester/scripts/auth-strategies'
import * as fs from 'fs'

// ============================================================================
// Types
// ============================================================================

interface CredentialTest {
  nodeId: string
  nodeName: string
  nodeType: string
  credentialType: string
  credentialId: string
  credentialName: string
  status: 'pass' | 'fail' | 'skip' | 'unknown'
  statusCode?: number
  message: string
  recommendation?: string
  testEndpoint?: string
}

interface CredentialTestResult {
  workflowName: string
  workflowId?: string
  totalCredentials: number
  tested: number
  passed: number
  failed: number
  skipped: number
  tests: CredentialTest[]
}

// ============================================================================
// Credential Test Strategies
// ============================================================================

const CREDENTIAL_TESTERS: Record<string, (cred: any, node: N8nNode) => Promise<CredentialTest>> = {
  /**
   * Test Google Sheets OAuth2 credential
   */
  async googleSheetsOAuth2Api(cred: any, node: N8nNode): Promise<CredentialTest> {
    try {
      // Try to list a spreadsheet (using the one from the node if available)
      const spreadsheetId = node.parameters?.documentId?.value ||
                           '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' // Google's example sheet

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        {
          headers: {
            'Authorization': `Bearer ${cred.oauthTokenData?.access_token || 'invalid'}`,
          }
        }
      )

      return {
        nodeId: node.id || node.name,
        nodeName: node.name,
        nodeType: node.type,
        credentialType: 'googleSheetsOAuth2Api',
        credentialId: cred.id,
        credentialName: cred.name,
        status: response.ok ? 'pass' : 'fail',
        statusCode: response.status,
        message: response.ok
          ? 'OAuth token valid, can access Google Sheets'
          : `Failed: ${response.status} ${response.statusText}`,
        recommendation: response.ok ? undefined : 'Refresh OAuth token in n8n credentials',
        testEndpoint: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`
      }
    } catch (error) {
      return {
        nodeId: node.id || node.name,
        nodeName: node.name,
        nodeType: node.type,
        credentialType: 'googleSheetsOAuth2Api',
        credentialId: cred.id,
        credentialName: cred.name,
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        recommendation: 'Check OAuth token and re-authenticate in n8n'
      }
    }
  },

  /**
   * Test HTTP Basic Auth credential
   */
  async httpBasicAuth(cred: any, node: N8nNode): Promise<CredentialTest> {
    try {
      const url = node.parameters?.url as string || 'https://httpbin.org/basic-auth/user/pass'
      const headers = basicAuth(cred.user || 'user', cred.password || 'pass')

      const response = await fetch(url, { headers })

      return {
        nodeId: node.id || node.name,
        nodeName: node.name,
        nodeType: node.type,
        credentialType: 'httpBasicAuth',
        credentialId: cred.id,
        credentialName: cred.name,
        status: response.ok ? 'pass' : 'fail',
        statusCode: response.status,
        message: response.ok
          ? 'Basic auth credentials valid'
          : `Authentication failed: ${response.status}`,
        recommendation: response.ok ? undefined : 'Verify username and password',
        testEndpoint: url
      }
    } catch (error) {
      return {
        nodeId: node.id || node.name,
        nodeName: node.name,
        nodeType: node.type,
        credentialType: 'httpBasicAuth',
        credentialId: cred.id,
        credentialName: cred.name,
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        recommendation: 'Check credentials and endpoint URL'
      }
    }
  },

  /**
   * Test HTTP Header Auth (API Key, Bearer Token)
   */
  async httpHeaderAuth(cred: any, node: N8nNode): Promise<CredentialTest> {
    try {
      const url = node.parameters?.url as string
      if (!url) {
        return {
          nodeId: node.id || node.name,
          nodeName: node.name,
          nodeType: node.type,
          credentialType: 'httpHeaderAuth',
          credentialId: cred.id,
          credentialName: cred.name,
          status: 'skip',
          message: 'No URL configured in node, cannot test',
          recommendation: 'Test manually or add URL to node'
        }
      }

      const headers: Record<string, string> = {}
      headers[cred.name || 'Authorization'] = cred.value || ''

      const response = await fetch(url, { headers })

      return {
        nodeId: node.id || node.name,
        nodeName: node.name,
        nodeType: node.type,
        credentialType: 'httpHeaderAuth',
        credentialId: cred.id,
        credentialName: cred.name,
        status: response.ok ? 'pass' : 'fail',
        statusCode: response.status,
        message: response.ok
          ? 'API key/header auth valid'
          : `Authentication failed: ${response.status}`,
        recommendation: response.ok ? undefined : 'Verify API key and header name',
        testEndpoint: url
      }
    } catch (error) {
      return {
        nodeId: node.id || node.name,
        nodeName: node.name,
        nodeType: node.type,
        credentialType: 'httpHeaderAuth',
        credentialId: cred.id,
        credentialName: cred.name,
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        recommendation: 'Check credential configuration'
      }
    }
  },

  /**
   * Test Supabase credential
   */
  async supabaseApi(cred: any, node: N8nNode): Promise<CredentialTest> {
    try {
      const url = `${cred.host || 'https://your-project.supabase.co'}/rest/v1/`
      const headers = {
        'apikey': cred.serviceRole || cred.apiKey || '',
        'Authorization': `Bearer ${cred.serviceRole || cred.apiKey || ''}`
      }

      const response = await fetch(url, { headers })

      return {
        nodeId: node.id || node.name,
        nodeName: node.name,
        nodeType: node.type,
        credentialType: 'supabaseApi',
        credentialId: cred.id,
        credentialName: cred.name,
        status: response.ok || response.status === 404 ? 'pass' : 'fail', // 404 is OK, means auth worked
        statusCode: response.status,
        message: response.ok || response.status === 404
          ? 'Supabase credentials valid'
          : `Authentication failed: ${response.status}`,
        recommendation: response.ok || response.status === 404
          ? undefined
          : 'Verify Supabase URL and API key',
        testEndpoint: url
      }
    } catch (error) {
      return {
        nodeId: node.id || node.name,
        nodeName: node.name,
        nodeType: node.type,
        credentialType: 'supabaseApi',
        credentialId: cred.id,
        credentialName: cred.name,
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        recommendation: 'Check Supabase URL and credentials'
      }
    }
  },

  /**
   * Generic fallback for unknown credential types
   */
  async default(cred: any, node: N8nNode): Promise<CredentialTest> {
    return {
      nodeId: node.id || node.name,
      nodeName: node.name,
      nodeType: node.type,
      credentialType: cred.type || 'unknown',
      credentialId: cred.id,
      credentialName: cred.name,
      status: 'skip',
      message: `No tester implemented for credential type: ${cred.type}`,
      recommendation: 'Test manually or implement credential tester'
    }
  }
}

// ============================================================================
// Main Test Function
// ============================================================================

async function testWorkflowCredentials() {
  const args = process.argv.slice(2)
  const target = args[0]

  if (!target) {
    console.error('❌ Error: No workflow specified')
    console.log()
    console.log('Usage:')
    console.log('  npx tsx test-workflow-credentials.ts <workflow-id>')
    console.log('  npx tsx test-workflow-credentials.ts <workflow-file.json>')
    console.log()
    process.exit(1)
  }

  console.log('🔑 n8n Credential Tester')
  console.log('═'.repeat(70))
  console.log()

  // Load workflow
  let workflow: N8nWorkflow
  try {
    if (fs.existsSync(target)) {
      console.log(`📄 Loading workflow from file: ${target}`)
      const fileContent = fs.readFileSync(target, 'utf-8')
      workflow = JSON.parse(fileContent)
      console.log(`   ✅ Loaded: ${workflow.name || 'Unnamed Workflow'}`)
    } else {
      console.log(`🌐 Fetching workflow from n8n: ${target}`)
      workflow = await n8nClient.getWorkflow(target)
      console.log(`   ✅ Loaded: ${workflow.name}`)
    }
    console.log()
  } catch (error) {
    console.error('❌ Error loading workflow:')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }

  // Extract nodes with credentials
  const nodesWithCredentials = workflow.nodes.filter(n => n.credentials)

  if (nodesWithCredentials.length === 0) {
    console.log('ℹ️  No credentials found in workflow')
    console.log('   This workflow does not use any credentials.')
    console.log()
    process.exit(0)
  }

  console.log(`🔍 Found ${nodesWithCredentials.length} node(s) with credentials`)
  console.log()

  // Fetch all credentials from n8n
  let credentialsMap: Map<string, any>
  try {
    const { data } = await n8nClient.listCredentials()
    credentialsMap = new Map(data.map(c => [c.id, c]))
    console.log(`📋 Loaded ${data.length} credential(s) from n8n`)
    console.log()
  } catch (error) {
    console.error('⚠️  Warning: Could not fetch credentials from n8n')
    console.error('   Will test with limited information')
    console.log()
    credentialsMap = new Map()
  }

  // Test each credential
  const tests: CredentialTest[] = []

  console.log('🧪 Testing Credentials...')
  console.log('─'.repeat(70))
  console.log()

  for (const node of nodesWithCredentials) {
    if (!node.credentials) continue

    for (const [credType, credRef] of Object.entries(node.credentials)) {
      const credId = (credRef as any).id
      const credential = credentialsMap.get(credId)

      console.log(`Testing: ${node.name} (${credType})`)

      let test: CredentialTest

      if (!credential) {
        test = {
          nodeId: node.id || node.name,
          nodeName: node.name,
          nodeType: node.type,
          credentialType: credType,
          credentialId: credId,
          credentialName: (credRef as any).name || 'Unknown',
          status: 'fail',
          message: 'Credential not found in n8n',
          recommendation: 'Create credential or update credential ID in workflow'
        }
      } else {
        // Test credential
        const tester = CREDENTIAL_TESTERS[credType] || CREDENTIAL_TESTERS.default
        test = await tester(credential, node)
      }

      tests.push(test)

      // Display result
      const icon = test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : test.status === 'skip' ? '⏭️' : '❓'
      console.log(`${icon} ${test.message}`)
      if (test.testEndpoint) {
        console.log(`   Endpoint: ${test.testEndpoint}`)
      }
      if (test.statusCode) {
        console.log(`   Status: ${test.statusCode}`)
      }
      if (test.recommendation) {
        console.log(`   💡 ${test.recommendation}`)
      }
      console.log()
    }
  }

  // Summary
  const result: CredentialTestResult = {
    workflowName: workflow.name,
    workflowId: workflow.id,
    totalCredentials: tests.length,
    tested: tests.filter(t => t.status !== 'skip').length,
    passed: tests.filter(t => t.status === 'pass').length,
    failed: tests.filter(t => t.status === 'fail').length,
    skipped: tests.filter(t => t.status === 'skip').length,
    tests
  }

  console.log('═'.repeat(70))
  console.log('📊 CREDENTIAL TEST SUMMARY')
  console.log('═'.repeat(70))
  console.log()

  console.log(`Workflow: ${result.workflowName}`)
  console.log(`Total Credentials: ${result.totalCredentials}`)
  console.log(`✅ Passed: ${result.passed}`)
  console.log(`❌ Failed: ${result.failed}`)
  console.log(`⏭️  Skipped: ${result.skipped}`)
  console.log()

  if (result.failed > 0) {
    console.log('❌ CREDENTIAL TEST FAILED')
    console.log()
    console.log('The following credentials need attention:')
    console.log()

    tests.filter(t => t.status === 'fail').forEach((test, i) => {
      console.log(`${i + 1}. ${test.nodeName} (${test.credentialType})`)
      console.log(`   ${test.message}`)
      if (test.recommendation) {
        console.log(`   💡 ${test.recommendation}`)
      }
      console.log()
    })
  } else if (result.passed === result.totalCredentials) {
    console.log('✅ ALL CREDENTIALS VALID')
    console.log()
    console.log('All credentials tested successfully. Workflow is ready for deployment.')
  } else {
    console.log('⚠️  PARTIAL VALIDATION')
    console.log()
    console.log(`${result.passed} credential(s) valid, ${result.skipped} could not be tested.`)
    console.log('Review skipped credentials manually.')
  }

  console.log()

  // Save report
  const reportPath = `credential-test-report-${workflow.id || 'workflow'}-${Date.now()}.json`
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2))
  console.log(`📄 Detailed report saved to: ${reportPath}`)
  console.log()

  // Exit code
  process.exit(result.failed > 0 ? 1 : 0)
}

// ============================================================================
// Run
// ============================================================================

testWorkflowCredentials().catch((error) => {
  console.error('❌ Unexpected error:')
  console.error(error)
  process.exit(1)
})
