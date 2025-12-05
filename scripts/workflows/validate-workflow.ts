#!/usr/bin/env tsx
/**
 * n8n Workflow Validation CLI
 *
 * Comprehensive pre-deployment validation tool
 * Usage: npx tsx validate-workflow.ts <workflow-id-or-file>
 */

import { n8nClient } from '../../shared/libs/n8n'
import { WorkflowValidator } from '../../shared/libs/n8n/validator'
import type { N8nWorkflow } from '../../shared/libs/n8n/client'
import * as fs from 'fs'
import * as path from 'path'

// ============================================================================
// CLI Configuration
// ============================================================================

const args = process.argv.slice(2)
const target = args[0]

if (!target) {
  console.error('❌ Error: No workflow specified')
  console.log()
  console.log('Usage:')
  console.log('  npx tsx validate-workflow.ts <workflow-id>')
  console.log('  npx tsx validate-workflow.ts <workflow-file.json>')
  console.log()
  console.log('Examples:')
  console.log('  npx tsx validate-workflow.ts wf-test-001')
  console.log('  npx tsx validate-workflow.ts ./workflows/my-workflow.json')
  process.exit(1)
}

// ============================================================================
// Main Validation Function
// ============================================================================

async function validateWorkflow() {
  console.log('🔍 n8n Workflow Validator')
  console.log('═'.repeat(70))
  console.log()

  let workflow: N8nWorkflow

  try {
    // Determine if target is file or workflow ID
    if (fs.existsSync(target)) {
      // Load from file
      console.log(`📄 Loading workflow from file: ${target}`)
      const fileContent = fs.readFileSync(target, 'utf-8')
      workflow = JSON.parse(fileContent)
      console.log(`   ✅ Loaded: ${workflow.name || 'Unnamed Workflow'}`)
    } else {
      // Load from n8n API
      console.log(`🌐 Fetching workflow from n8n: ${target}`)
      workflow = await n8nClient.getWorkflow(target)
      console.log(`   ✅ Loaded: ${workflow.name}`)
    }

    console.log()
  } catch (error) {
    console.error('❌ Error loading workflow:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    } else {
      console.error(`   ${String(error)}`)
    }
    process.exit(1)
  }

  // Display workflow info
  console.log('📋 Workflow Information')
  console.log('─'.repeat(70))
  console.log(`Name:         ${workflow.name}`)
  console.log(`ID:           ${workflow.id || 'N/A'}`)
  console.log(`Status:       ${workflow.active ? '🟢 Active' : '⚫ Inactive'}`)
  console.log(`Nodes:        ${workflow.nodes.length}`)
  console.log(`Created:      ${workflow.createdAt || 'N/A'}`)
  console.log(`Updated:      ${workflow.updatedAt || 'N/A'}`)
  console.log()

  // Run validation
  console.log('🔎 Running Validation Checks...')
  console.log()

  const validator = new WorkflowValidator(n8nClient, {
    strict: true,
    checkCredentials: true,
    checkConnections: true,
    requireErrorHandling: false,
    requireDocumentation: false,
  })

  const result = await validator.validate(workflow)

  // Display results by category
  const categories = [
    'structure',
    'naming',
    'connections',
    'credentials',
    'security',
    'settings',
    'performance',
    'best-practices',
  ] as const

  type ValidationCheck = { category: string; passed: boolean; severity?: string; message?: string; details?: string; recommendation?: string }

  categories.forEach((category) => {
    const categoryChecks = result.checks.filter((c: ValidationCheck) => c.category === category)
    if (categoryChecks.length === 0) return

    const passed = categoryChecks.filter((c: ValidationCheck) => c.passed).length
    const failed = categoryChecks.filter((c: ValidationCheck) => !c.passed).length
    const icon =
      failed === 0 ? '✅' : categoryChecks.some((c: ValidationCheck) => !c.passed && c.severity === 'error') ? '❌' : '⚠️'

    console.log(`${icon} ${getCategoryName(category)} (${passed}/${categoryChecks.length} passed)`)
    console.log('─'.repeat(70))

    // Show failed checks first
    const failedChecks = categoryChecks.filter((c: ValidationCheck) => !c.passed)
    failedChecks.forEach((check: ValidationCheck) => {
      const severityIcon =
        check.severity === 'error' ? '❌' : check.severity === 'warning' ? '⚠️' : 'ℹ️'
      console.log(`  ${severityIcon} ${check.message}`)
      console.log(`     ${check.details}`)
      if (check.recommendation) {
        console.log(`     💡 ${check.recommendation}`)
      }
      console.log()
    })

    // Show passed checks (condensed)
    const passedChecks = categoryChecks.filter((c: ValidationCheck) => c.passed)
    if (passedChecks.length > 0) {
      console.log(`  ✅ ${passedChecks.length} check(s) passed`)
      console.log()
    }
  })

  // Overall summary
  console.log('═'.repeat(70))
  console.log('📊 VALIDATION SUMMARY')
  console.log('═'.repeat(70))
  console.log()

  const scoreColor = result.score >= 90 ? '🟢' : result.score >= 70 ? '🟡' : '🔴'
  console.log(`${scoreColor} Overall Score: ${result.score}/100`)
  console.log()

  console.log(`Total Checks:       ${result.summary.totalChecks}`)
  console.log(`✅ Passed:          ${result.summary.passed}`)
  console.log(`❌ Failed:          ${result.summary.failed}`)
  console.log(`⚠️  Warnings:        ${result.summary.warnings}`)
  console.log(`❌ Errors:          ${result.summary.errors}`)
  console.log()

  if (result.valid) {
    console.log('✅ VALIDATION PASSED')
    console.log()
    console.log('This workflow meets all critical requirements and is ready for deployment.')

    if (result.summary.warnings > 0) {
      console.log()
      console.log(`⚠️  Note: ${result.summary.warnings} warning(s) found. Consider addressing them for best practices.`)
    }
  } else {
    console.log('❌ VALIDATION FAILED')
    console.log()
    console.log('This workflow has critical issues that must be fixed before deployment:')
    console.log()
    result.summary.criticalIssues.forEach((issue: string, i: number) => {
      console.log(`  ${i + 1}. ${issue}`)
    })
  }

  console.log()

  // Recommendations
  const allRecommendations = result.checks
    .filter((c: ValidationCheck) => !c.passed && c.recommendation)
    .map((c: ValidationCheck) => c.recommendation)

  if (allRecommendations.length > 0 && allRecommendations.length <= 10) {
    console.log('═'.repeat(70))
    console.log('💡 TOP RECOMMENDATIONS')
    console.log('═'.repeat(70))
    console.log()

    allRecommendations.forEach((rec: string | undefined, i: number) => {
      console.log(`${i + 1}. ${rec}`)
    })

    console.log()
  }

  // Export detailed report
  const reportPath = `validation-report-${workflow.id || 'workflow'}-${Date.now()}.json`
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2))
  console.log(`📄 Detailed report saved to: ${reportPath}`)
  console.log()

  // Exit code
  process.exit(result.valid ? 0 : 1)
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    structure: 'Structure & Composition',
    naming: 'Naming Conventions',
    connections: 'Node Connections',
    credentials: 'Credentials & Authentication',
    security: 'Security',
    settings: 'Workflow Settings',
    performance: 'Performance',
    'best-practices': 'Best Practices',
  }
  return names[category] || category
}

// ============================================================================
// Run
// ============================================================================

validateWorkflow().catch((error) => {
  console.error('❌ Unexpected error:')
  console.error(error)
  process.exit(1)
})
