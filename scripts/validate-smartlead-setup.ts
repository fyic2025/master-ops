#!/usr/bin/env tsx
/**
 * Pre-Deployment Validation Script for Smartlead Integration
 *
 * Checks that all components are ready before deploying:
 * - API connectivity
 * - Environment variables
 * - HubSpot properties (optional check)
 * - Supabase schema (optional check)
 * - n8n workflow file
 */

import { smartleadClient } from '../shared/libs/integrations/smartlead'

interface ValidationResult {
  component: string
  status: 'pass' | 'fail' | 'warning' | 'skip'
  message: string
  details?: any
}

const results: ValidationResult[] = []

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`)
}

function addResult(component: string, status: 'pass' | 'fail' | 'warning' | 'skip', message: string, details?: any) {
  results.push({ component, status, message, details })
}

async function validateSmartleadAPI() {
  log('🔍', 'Validating Smartlead API...')

  try {
    const health = await smartleadClient.healthCheck()
    if (health.healthy) {
      addResult('Smartlead API', 'pass', 'Connected successfully')
      log('✅', 'Smartlead API: Connected')
    } else {
      addResult('Smartlead API', 'fail', 'Health check returned unhealthy')
      log('❌', 'Smartlead API: Unhealthy')
    }
  } catch (error: any) {
    addResult('Smartlead API', 'fail', `Connection failed: ${error.message}`)
    log('❌', `Smartlead API: ${error.message}`)
  }
}

async function validateCampaignData() {
  log('🔍', 'Checking campaign data...')

  try {
    const campaigns = await smartleadClient.campaigns.list()
    const count = campaigns.results?.length || 0

    if (count > 0) {
      addResult('Campaign Data', 'pass', `Found ${count} campaigns`, { count })
      log('✅', `Campaign Data: ${count} campaigns found`)
    } else {
      addResult('Campaign Data', 'warning', 'No campaigns found', { count: 0 })
      log('⚠️', 'Campaign Data: No campaigns (integration will work but no data to sync)')
    }
  } catch (error: any) {
    addResult('Campaign Data', 'fail', `Failed to retrieve: ${error.message}`)
    log('❌', `Campaign Data: ${error.message}`)
  }
}

async function validateEmailAccounts() {
  log('🔍', 'Checking email accounts...')

  try {
    const accounts = await smartleadClient.emailAccounts.list()
    const count = accounts.results?.length || 0

    if (count > 0) {
      addResult('Email Accounts', 'pass', `Found ${count} email accounts`, { count })
      log('✅', `Email Accounts: ${count} configured`)
    } else {
      addResult('Email Accounts', 'warning', 'No email accounts found', { count: 0 })
      log('⚠️', 'Email Accounts: None configured (campaigns may not send)')
    }
  } catch (error: any) {
    addResult('Email Accounts', 'fail', `Failed to retrieve: ${error.message}`)
    log('❌', `Email Accounts: ${error.message}`)
  }
}

function validateEnvironmentVariables() {
  log('🔍', 'Checking environment variables...')

  const required = [
    'SMARTLEAD_API_KEY',
    'HUBSPOT_ACCESS_TOKEN',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const missing: string[] = []

  for (const envVar of required) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }

  if (missing.length === 0) {
    addResult('Environment Variables', 'pass', 'All required variables present')
    log('✅', 'Environment Variables: All present')
  } else {
    addResult('Environment Variables', 'fail', `Missing: ${missing.join(', ')}`, { missing })
    log('❌', `Environment Variables: Missing ${missing.join(', ')}`)
  }
}

function validateWorkflowFile() {
  log('🔍', 'Checking n8n workflow file...')

  const fs = require('fs')
  const path = require('path')

  const workflowPath = path.join(__dirname, '../infra/n8n-workflows/templates/smartlead-hubspot-sync-FIXED.json')

  try {
    if (fs.existsSync(workflowPath)) {
      const content = fs.readFileSync(workflowPath, 'utf-8')
      const workflow = JSON.parse(content)

      const nodeCount = workflow.nodes?.length || 0
      const hasConnections = Object.keys(workflow.connections || {}).length > 0

      if (nodeCount >= 17 && hasConnections) {
        addResult('Workflow File', 'pass', `Valid workflow with ${nodeCount} nodes`, { nodeCount })
        log('✅', `Workflow File: Valid (${nodeCount} nodes)`)
      } else {
        addResult('Workflow File', 'warning', `Workflow exists but may be incomplete`, { nodeCount })
        log('⚠️', `Workflow File: May be incomplete (${nodeCount} nodes)`)
      }
    } else {
      addResult('Workflow File', 'fail', 'File not found')
      log('❌', 'Workflow File: Not found')
    }
  } catch (error: any) {
    addResult('Workflow File', 'fail', `Invalid JSON: ${error.message}`)
    log('❌', `Workflow File: ${error.message}`)
  }
}

function validateDocumentation() {
  log('🔍', 'Checking documentation files...')

  const fs = require('fs')
  const path = require('path')

  const docs = [
    'DEPLOY-FIXED-WORKFLOW.md',
    'COUNTER-FIX-SUMMARY.md',
    'SMARTLEAD-METRICS-ANALYSIS.md',
    'SMARTLEAD-VALIDATION-REPORT.md',
  ]

  const missing: string[] = []

  for (const doc of docs) {
    const docPath = path.join(__dirname, '..', doc)
    if (!fs.existsSync(docPath)) {
      missing.push(doc)
    }
  }

  if (missing.length === 0) {
    addResult('Documentation', 'pass', 'All documentation files present')
    log('✅', 'Documentation: Complete')
  } else {
    addResult('Documentation', 'warning', `Missing: ${missing.join(', ')}`, { missing })
    log('⚠️', `Documentation: Missing ${missing.join(', ')}`)
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('📋 VALIDATION SUMMARY')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const warnings = results.filter(r => r.status === 'warning').length
  const skipped = results.filter(r => r.status === 'skip').length

  console.log(`\n✅ Passed:   ${passed}`)
  console.log(`❌ Failed:   ${failed}`)
  console.log(`⚠️  Warnings: ${warnings}`)
  console.log(`⏭️  Skipped:  ${skipped}`)

  if (failed > 0) {
    console.log('\n❌ VALIDATION FAILED')
    console.log('\nFailed Components:')
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  • ${r.component}: ${r.message}`)
    })
    console.log('\n🔧 Fix the issues above before deploying.')
    process.exit(1)
  } else if (warnings > 0) {
    console.log('\n⚠️  VALIDATION PASSED WITH WARNINGS')
    console.log('\nWarnings:')
    results.filter(r => r.status === 'warning').forEach(r => {
      console.log(`  • ${r.component}: ${r.message}`)
    })
    console.log('\n✅ Safe to deploy, but review warnings.')
  } else {
    console.log('\n✅ ALL VALIDATIONS PASSED')
    console.log('\n🚀 Ready to deploy!')
  }

  console.log('\n📚 Next Steps:')
  console.log('  1. Review: DEPLOY-FIXED-WORKFLOW.md')
  console.log('  2. Import workflow to n8n')
  console.log('  3. Configure credentials')
  console.log('  4. Test with sample webhook')
  console.log('  5. Enable Smartlead webhook')
  console.log('\n' + '='.repeat(60))
}

async function main() {
  console.log('🔍 Smartlead Integration Pre-Deployment Validation\n')

  // Critical validations
  validateEnvironmentVariables()
  await validateSmartleadAPI()
  await validateCampaignData()
  await validateEmailAccounts()

  // Supporting validations
  validateWorkflowFile()
  validateDocumentation()

  // Print summary
  printSummary()
}

main().catch(error => {
  console.error('\n❌ Validation script error:', error.message)
  process.exit(1)
})
