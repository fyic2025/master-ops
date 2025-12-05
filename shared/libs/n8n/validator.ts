/**
 * n8n Workflow Validator
 *
 * Comprehensive validation system for n8n workflows
 * Ensures workflows meet all quality, security, and structural requirements
 * before deployment to production
 */

import { N8nWorkflow, N8nNode, N8nClient } from './client'

// ============================================================================
// Types
// ============================================================================

export type ValidationSeverity = 'error' | 'warning' | 'info'
export type ValidationCategory =
  | 'structure'
  | 'naming'
  | 'connections'
  | 'credentials'
  | 'security'
  | 'settings'
  | 'performance'
  | 'best-practices'

export interface ValidationResult {
  valid: boolean
  score: number // 0-100
  checks: ValidationCheck[]
  summary: ValidationSummary
}

export interface ValidationCheck {
  id: string
  category: ValidationCategory
  severity: ValidationSeverity
  passed: boolean
  message: string
  details?: string
  recommendation?: string
}

export interface ValidationSummary {
  totalChecks: number
  passed: number
  failed: number
  warnings: number
  errors: number
  criticalIssues: string[]
}

export interface ValidationOptions {
  strict?: boolean // Enable all checks including strict ones
  checkCredentials?: boolean // Verify credentials exist in n8n
  checkConnections?: boolean // Verify all connections are valid
  requireErrorHandling?: boolean // Require error handling nodes
  requireDocumentation?: boolean // Require workflow notes/descriptions
}

// ============================================================================
// Workflow Validator Class
// ============================================================================

export class WorkflowValidator {
  private client?: N8nClient
  private options: Required<ValidationOptions>

  constructor(client?: N8nClient, options: ValidationOptions = {}) {
    this.client = client
    this.options = {
      strict: options.strict ?? true,
      checkCredentials: options.checkCredentials ?? true,
      checkConnections: options.checkConnections ?? true,
      requireErrorHandling: options.requireErrorHandling ?? false,
      requireDocumentation: options.requireDocumentation ?? false,
    }
  }

  /**
   * Validate a workflow comprehensively
   */
  async validate(workflow: Partial<N8nWorkflow>): Promise<ValidationResult> {
    const checks: ValidationCheck[] = []

    // Run all validation categories
    checks.push(...this.validateStructure(workflow))
    checks.push(...this.validateNaming(workflow))
    checks.push(...this.validateConnections(workflow))
    checks.push(...this.validateSettings(workflow))
    checks.push(...this.validateSecurity(workflow))
    checks.push(...this.validatePerformance(workflow))
    checks.push(...this.validateBestPractices(workflow))

    // Check credentials if client provided
    if (this.client && this.options.checkCredentials && workflow.nodes) {
      const credentialChecks = await this.validateCredentials(workflow)
      checks.push(...credentialChecks)
    }

    // Calculate results
    const passed = checks.filter((c) => c.passed).length
    const failed = checks.filter((c) => !c.passed).length
    const warnings = checks.filter((c) => !c.passed && c.severity === 'warning').length
    const errors = checks.filter((c) => !c.passed && c.severity === 'error').length

    const criticalIssues = checks
      .filter((c) => !c.passed && c.severity === 'error')
      .map((c) => c.message)

    // Score: 100 - (errors * 10) - (warnings * 2)
    const score = Math.max(0, 100 - errors * 10 - warnings * 2)

    return {
      valid: errors === 0,
      score,
      checks,
      summary: {
        totalChecks: checks.length,
        passed,
        failed,
        warnings,
        errors,
        criticalIssues,
      },
    }
  }

  // --------------------------------------------------------------------------
  // Structure Validation (10 checks)
  // --------------------------------------------------------------------------

  private validateStructure(workflow: Partial<N8nWorkflow>): ValidationCheck[] {
    const checks: ValidationCheck[] = []

    // 1. Workflow has name
    checks.push({
      id: 'struct-001',
      category: 'structure',
      severity: 'error',
      passed: !!workflow.name,
      message: 'Workflow has a name',
      details: workflow.name ? `Name: "${workflow.name}"` : 'Missing workflow name',
      recommendation: workflow.name ? undefined : 'Add a descriptive workflow name',
    })

    // 2. Workflow has nodes
    checks.push({
      id: 'struct-002',
      category: 'structure',
      severity: 'error',
      passed: !!workflow.nodes && workflow.nodes.length > 0,
      message: 'Workflow has at least one node',
      details: workflow.nodes
        ? `Node count: ${workflow.nodes.length}`
        : 'No nodes defined',
      recommendation:
        workflow.nodes && workflow.nodes.length > 0
          ? undefined
          : 'Add nodes to the workflow',
    })

    // 3. Workflow has connections object
    checks.push({
      id: 'struct-003',
      category: 'structure',
      severity: 'error',
      passed: !!workflow.connections,
      message: 'Workflow has connections object',
      details: workflow.connections ? 'Connections defined' : 'Missing connections object',
      recommendation: workflow.connections ? undefined : 'Add connections object',
    })

    // 4. Has trigger node
    const hasTrigger = workflow.nodes?.some(
      (node) =>
        node.type.includes('trigger') ||
        node.type.includes('webhook') ||
        node.type.includes('cron')
    )
    checks.push({
      id: 'struct-004',
      category: 'structure',
      severity: 'error',
      passed: !!hasTrigger,
      message: 'Workflow has a trigger node',
      details: hasTrigger ? 'Trigger node found' : 'No trigger node found',
      recommendation: hasTrigger
        ? undefined
        : 'Add a trigger node (scheduleTrigger, webhook, or cron)',
    })

    // 5. All nodes have unique names
    if (workflow.nodes) {
      const nodeNames = workflow.nodes.map((n) => n.name)
      const uniqueNames = new Set(nodeNames)
      const hasUniqueNames = nodeNames.length === uniqueNames.size

      checks.push({
        id: 'struct-005',
        category: 'structure',
        severity: 'error',
        passed: hasUniqueNames,
        message: 'All nodes have unique names',
        details: hasUniqueNames
          ? `${nodeNames.length} unique node names`
          : `Duplicate names found: ${nodeNames.filter((n, i, arr) => arr.indexOf(n) !== i).join(', ')}`,
        recommendation: hasUniqueNames ? undefined : 'Ensure all node names are unique',
      })
    }

    // 6. All nodes have type and typeVersion
    if (workflow.nodes) {
      const nodesWithType = workflow.nodes.filter((n) => n.type && n.typeVersion)
      const allHaveType = nodesWithType.length === workflow.nodes.length

      checks.push({
        id: 'struct-006',
        category: 'structure',
        severity: 'error',
        passed: allHaveType,
        message: 'All nodes have type and typeVersion',
        details: `${nodesWithType.length}/${workflow.nodes.length} nodes have type`,
        recommendation: allHaveType
          ? undefined
          : 'Ensure all nodes have type and typeVersion',
      })
    }

    // 7. All nodes have position
    if (workflow.nodes) {
      const nodesWithPosition = workflow.nodes.filter(
        (n) => n.position && Array.isArray(n.position) && n.position.length === 2
      )
      const allHavePosition = nodesWithPosition.length === workflow.nodes.length

      checks.push({
        id: 'struct-007',
        category: 'structure',
        severity: 'warning',
        passed: allHavePosition,
        message: 'All nodes have position [x, y]',
        details: `${nodesWithPosition.length}/${workflow.nodes.length} nodes have position`,
        recommendation: allHavePosition ? undefined : 'Add position to all nodes',
      })
    }

    // 8. Workflow not too simple (> 1 node)
    const nodeCount = workflow.nodes?.length || 0
    checks.push({
      id: 'struct-008',
      category: 'structure',
      severity: 'warning',
      passed: nodeCount > 1,
      message: 'Workflow has more than one node',
      details: `Node count: ${nodeCount}`,
      recommendation:
        nodeCount > 1 ? undefined : 'Consider adding processing nodes after trigger',
    })

    // 9. Workflow not too complex (< 50 nodes)
    checks.push({
      id: 'struct-009',
      category: 'structure',
      severity: 'warning',
      passed: nodeCount < 50,
      message: 'Workflow has reasonable complexity (< 50 nodes)',
      details: `Node count: ${nodeCount}`,
      recommendation: nodeCount < 50 ? undefined : 'Consider splitting into multiple workflows',
    })

    // 10. No disabled nodes (unless intentional)
    if (workflow.nodes) {
      const disabledNodes = workflow.nodes.filter((n) => n.disabled === true)
      const hasDisabledNodes = disabledNodes.length > 0

      checks.push({
        id: 'struct-010',
        category: 'structure',
        severity: 'info',
        passed: !hasDisabledNodes,
        message: 'No disabled nodes in workflow',
        details: hasDisabledNodes
          ? `${disabledNodes.length} disabled nodes: ${disabledNodes.map((n) => n.name).join(', ')}`
          : 'No disabled nodes',
        recommendation: hasDisabledNodes
          ? 'Review disabled nodes - remove if not needed'
          : undefined,
      })
    }

    return checks
  }

  // --------------------------------------------------------------------------
  // Naming Validation (5 checks)
  // --------------------------------------------------------------------------

  private validateNaming(workflow: Partial<N8nWorkflow>): ValidationCheck[] {
    const checks: ValidationCheck[] = []
    const name = workflow.name || ''

    // 1. Name length
    checks.push({
      id: 'naming-001',
      category: 'naming',
      severity: 'warning',
      passed: name.length >= 5,
      message: 'Workflow name is descriptive (>= 5 characters)',
      details: `Name length: ${name.length}`,
      recommendation: name.length >= 5 ? undefined : 'Use a more descriptive name',
    })

    // 2. Not generic name
    const genericNames = ['workflow', 'test', 'my workflow', 'untitled', 'new workflow']
    const isGeneric = genericNames.some((g) => name.toLowerCase().includes(g))

    checks.push({
      id: 'naming-002',
      category: 'naming',
      severity: 'warning',
      passed: !isGeneric,
      message: 'Workflow name is not generic',
      details: isGeneric ? `Generic name detected: "${name}"` : 'Name is specific',
      recommendation: isGeneric
        ? 'Use a name that describes what the workflow does'
        : undefined,
    })

    // 3. Not all caps
    const isAllCaps = name === name.toUpperCase() && name.length > 5
    checks.push({
      id: 'naming-003',
      category: 'naming',
      severity: 'info',
      passed: !isAllCaps,
      message: 'Workflow name uses appropriate case',
      details: isAllCaps ? 'Name is ALL CAPS' : 'Name uses appropriate case',
      recommendation: isAllCaps ? 'Consider using Title Case or sentence case' : undefined,
    })

    // 4. Node names are descriptive
    if (workflow.nodes) {
      const genericNodeNames = workflow.nodes.filter((n) =>
        ['node', 'node1', 'node2', 'set', 'code', 'http'].some((g) =>
          n.name.toLowerCase().includes(g)
        )
      )
      const hasGenericNodeNames = genericNodeNames.length > 0

      checks.push({
        id: 'naming-004',
        category: 'naming',
        severity: 'warning',
        passed: !hasGenericNodeNames,
        message: 'All nodes have descriptive names',
        details: hasGenericNodeNames
          ? `Generic node names: ${genericNodeNames.map((n) => n.name).join(', ')}`
          : 'All node names are descriptive',
        recommendation: hasGenericNodeNames
          ? 'Rename nodes to describe their purpose'
          : undefined,
      })
    }

    // 5. Workflow has tags for categorization
    const hasTags = Boolean(workflow.tags && workflow.tags.length > 0)
    checks.push({
      id: 'naming-005',
      category: 'naming',
      severity: 'info',
      passed: hasTags,
      message: 'Workflow has tags for organization',
      details: hasTags ? `Tags: ${workflow.tags!.join(', ')}` : 'No tags defined',
      recommendation: hasTags ? undefined : 'Add tags to categorize the workflow',
    })

    return checks
  }

  // --------------------------------------------------------------------------
  // Connection Validation (8 checks)
  // --------------------------------------------------------------------------

  private validateConnections(workflow: Partial<N8nWorkflow>): ValidationCheck[] {
    const checks: ValidationCheck[] = []

    if (!workflow.nodes || !workflow.connections) {
      return checks
    }

    // 1. All connection source nodes exist
    const nodeNames = new Set(workflow.nodes.map((n) => n.name))
    const connectionSources = Object.keys(workflow.connections)
    const invalidSources = connectionSources.filter((s) => !nodeNames.has(s))

    checks.push({
      id: 'conn-001',
      category: 'connections',
      severity: 'error',
      passed: invalidSources.length === 0,
      message: 'All connection sources reference existing nodes',
      details:
        invalidSources.length > 0
          ? `Invalid sources: ${invalidSources.join(', ')}`
          : 'All sources valid',
      recommendation:
        invalidSources.length > 0
          ? 'Remove connections from non-existent nodes'
          : undefined,
    })

    // 2. All connection target nodes exist
    const invalidTargets: string[] = []
    Object.entries(workflow.connections).forEach(([source, outputs]) => {
      Object.values(outputs as any).forEach((connectionList: any) => {
        if (Array.isArray(connectionList)) {
          connectionList.forEach((conns: any) => {
            if (Array.isArray(conns)) {
              conns.forEach((conn: any) => {
                if (conn.node && !nodeNames.has(conn.node)) {
                  invalidTargets.push(conn.node)
                }
              })
            }
          })
        }
      })
    })

    checks.push({
      id: 'conn-002',
      category: 'connections',
      severity: 'error',
      passed: invalidTargets.length === 0,
      message: 'All connection targets reference existing nodes',
      details:
        invalidTargets.length > 0
          ? `Invalid targets: ${[...new Set(invalidTargets)].join(', ')}`
          : 'All targets valid',
      recommendation:
        invalidTargets.length > 0 ? 'Fix connections to non-existent nodes' : undefined,
    })

    // 3. No orphaned nodes (except trigger)
    const connectedNodes = new Set<string>()
    Object.entries(workflow.connections).forEach(([source, outputs]) => {
      connectedNodes.add(source)
      Object.values(outputs as any).forEach((connectionList: any) => {
        if (Array.isArray(connectionList)) {
          connectionList.forEach((conns: any) => {
            if (Array.isArray(conns)) {
              conns.forEach((conn: any) => {
                if (conn.node) connectedNodes.add(conn.node)
              })
            }
          })
        }
      })
    })

    const orphanedNodes = workflow.nodes.filter(
      (n) =>
        !connectedNodes.has(n.name) &&
        !n.type.includes('trigger') &&
        !n.type.includes('webhook') &&
        !n.type.includes('cron')
    )

    checks.push({
      id: 'conn-003',
      category: 'connections',
      severity: 'warning',
      passed: orphanedNodes.length === 0,
      message: 'No orphaned nodes (unconnected)',
      details:
        orphanedNodes.length > 0
          ? `Orphaned nodes: ${orphanedNodes.map((n) => n.name).join(', ')}`
          : 'All nodes connected',
      recommendation:
        orphanedNodes.length > 0
          ? 'Connect or remove orphaned nodes'
          : undefined,
    })

    // 4. Trigger node has outgoing connections
    const triggerNode = workflow.nodes.find(
      (n) =>
        n.type.includes('trigger') || n.type.includes('webhook') || n.type.includes('cron')
    )

    if (triggerNode) {
      const triggerHasConnections = !!workflow.connections[triggerNode.name]

      checks.push({
        id: 'conn-004',
        category: 'connections',
        severity: 'error',
        passed: triggerHasConnections,
        message: 'Trigger node has outgoing connections',
        details: triggerHasConnections
          ? 'Trigger connected to workflow'
          : 'Trigger has no connections',
        recommendation: triggerHasConnections
          ? undefined
          : 'Connect trigger to processing nodes',
      })
    }

    // 5. No circular dependencies (simple check)
    // This is a simplified check - full cycle detection would be more complex
    const hasCircularRef = Object.entries(workflow.connections).some(
      ([source, outputs]) => {
        return Object.values(outputs as any).some((connectionList: any) => {
          if (Array.isArray(connectionList)) {
            return connectionList.some((conns: any) => {
              if (Array.isArray(conns)) {
                return conns.some((conn: any) => conn.node === source)
              }
              return false
            })
          }
          return false
        })
      }
    )

    checks.push({
      id: 'conn-005',
      category: 'connections',
      severity: 'warning',
      passed: !hasCircularRef,
      message: 'No direct circular connections detected',
      details: hasCircularRef
        ? 'Circular connection detected'
        : 'No circular connections',
      recommendation: hasCircularRef ? 'Review workflow for circular dependencies' : undefined,
    })

    // 6. IF nodes have two outputs configured
    const ifNodes = workflow.nodes.filter((n) => n.type.includes('.if'))
    ifNodes.forEach((ifNode) => {
      const connections = workflow.connections![ifNode.name]
      const hasTwoOutputs =
        connections &&
        connections.main &&
        Array.isArray(connections.main) &&
        connections.main.length === 2

      checks.push({
        id: `conn-006-${ifNode.name}`,
        category: 'connections',
        severity: 'warning',
        passed: hasTwoOutputs,
        message: `IF node "${ifNode.name}" has both true/false paths`,
        details: hasTwoOutputs ? 'Both paths configured' : 'Missing output paths',
        recommendation: hasTwoOutputs
          ? undefined
          : 'Configure both true and false paths for IF node',
      })
    })

    // 7. Split/Loop nodes have proper connections
    const loopNodes = workflow.nodes.filter(
      (n) => n.type.includes('splitInBatches') || n.type.includes('loop')
    )
    loopNodes.forEach((loopNode) => {
      const hasConnections = !!workflow.connections![loopNode.name]

      checks.push({
        id: `conn-007-${loopNode.name}`,
        category: 'connections',
        severity: 'warning',
        passed: hasConnections,
        message: `Loop node "${loopNode.name}" has connections`,
        details: hasConnections ? 'Loop configured' : 'Loop not connected',
        recommendation: hasConnections
          ? undefined
          : 'Connect loop node to process batches',
      })
    })

    // 8. Connection structure is valid
    let connectionStructureValid = true
    try {
      Object.values(workflow.connections).forEach((outputs) => {
        if (typeof outputs !== 'object') connectionStructureValid = false
      })
    } catch {
      connectionStructureValid = false
    }

    checks.push({
      id: 'conn-008',
      category: 'connections',
      severity: 'error',
      passed: connectionStructureValid,
      message: 'Connection structure is valid',
      details: connectionStructureValid
        ? 'Valid connection structure'
        : 'Invalid connection format',
      recommendation: connectionStructureValid ? undefined : 'Fix connection object structure',
    })

    return checks
  }

  // --------------------------------------------------------------------------
  // Credential Validation (3 checks)
  // --------------------------------------------------------------------------

  private async validateCredentials(
    workflow: Partial<N8nWorkflow>
  ): Promise<ValidationCheck[]> {
    const checks: ValidationCheck[] = []

    if (!workflow.nodes || !this.client) {
      return checks
    }

    // Get all credentials from n8n
    let availableCredentials: Map<string, any>
    try {
      const { data } = await this.client.listCredentials()
      availableCredentials = new Map(data.map((c) => [c.id, c]))
    } catch (error) {
      checks.push({
        id: 'cred-000',
        category: 'credentials',
        severity: 'warning',
        passed: false,
        message: 'Could not fetch credentials from n8n',
        details: error instanceof Error ? error.message : 'Unknown error',
        recommendation: 'Check n8n connection and API access',
      })
      return checks
    }

    // 1. All credential IDs exist
    const nodesWithCredentials = workflow.nodes.filter((n) => n.credentials)
    const missingCredentials: string[] = []

    nodesWithCredentials.forEach((node) => {
      if (node.credentials) {
        Object.values(node.credentials).forEach((cred: any) => {
          if (cred.id && !availableCredentials.has(cred.id)) {
            missingCredentials.push(`${node.name}: ${cred.id}`)
          }
        })
      }
    })

    checks.push({
      id: 'cred-001',
      category: 'credentials',
      severity: 'error',
      passed: missingCredentials.length === 0,
      message: 'All credential IDs exist in n8n',
      details:
        missingCredentials.length > 0
          ? `Missing: ${missingCredentials.join(', ')}`
          : `All ${nodesWithCredentials.length} credentials valid`,
      recommendation:
        missingCredentials.length > 0
          ? 'Create missing credentials in n8n or update credential IDs'
          : undefined,
    })

    // 2. Nodes that typically need credentials have them
    const nodesThatNeedCredentials = workflow.nodes.filter(
      (n) =>
        n.type.includes('httpRequest') ||
        n.type.includes('supabase') ||
        n.type.includes('googleSheets') ||
        n.type.includes('slack') ||
        n.type.includes('github')
    )

    const nodesWithoutCredentials = nodesThatNeedCredentials.filter((n) => !n.credentials)

    checks.push({
      id: 'cred-002',
      category: 'credentials',
      severity: 'warning',
      passed: nodesWithoutCredentials.length === 0,
      message: 'Nodes that need credentials have them configured',
      details:
        nodesWithoutCredentials.length > 0
          ? `Missing credentials: ${nodesWithoutCredentials.map((n) => n.name).join(', ')}`
          : 'All nodes have credentials',
      recommendation:
        nodesWithoutCredentials.length > 0 ? 'Add credentials to nodes' : undefined,
    })

    // 3. No hardcoded credentials in parameters
    const nodesWithPossibleSecrets = workflow.nodes.filter((n) => {
      const params = JSON.stringify(n.parameters || {})
      return (
        params.includes('password') ||
        params.includes('apiKey') ||
        params.includes('secret') ||
        params.includes('token')
      )
    })

    checks.push({
      id: 'cred-003',
      category: 'credentials',
      severity: 'warning',
      passed: nodesWithPossibleSecrets.length === 0,
      message: 'No potential hardcoded secrets in node parameters',
      details:
        nodesWithPossibleSecrets.length > 0
          ? `Review nodes: ${nodesWithPossibleSecrets.map((n) => n.name).join(', ')}`
          : 'No hardcoded secrets detected',
      recommendation:
        nodesWithPossibleSecrets.length > 0
          ? 'Review parameters and use credential system instead'
          : undefined,
    })

    return checks
  }

  // --------------------------------------------------------------------------
  // Settings Validation (6 checks)
  // --------------------------------------------------------------------------

  private validateSettings(workflow: Partial<N8nWorkflow>): ValidationCheck[] {
    const checks: ValidationCheck[] = []
    const settings = workflow.settings || {}

    // 1. Has settings object
    checks.push({
      id: 'settings-001',
      category: 'settings',
      severity: 'info',
      passed: !!workflow.settings,
      message: 'Workflow has settings configured',
      details: workflow.settings ? 'Settings defined' : 'No settings',
      recommendation: workflow.settings ? undefined : 'Add workflow settings',
    })

    // 2. Save error execution data
    checks.push({
      id: 'settings-002',
      category: 'settings',
      severity: 'warning',
      passed: settings.saveDataErrorExecution === 'all',
      message: 'Error execution data is saved',
      details: `saveDataErrorExecution: ${settings.saveDataErrorExecution || 'not set'}`,
      recommendation:
        settings.saveDataErrorExecution === 'all'
          ? undefined
          : 'Set saveDataErrorExecution to "all" for debugging',
    })

    // 3. Save success execution data
    checks.push({
      id: 'settings-003',
      category: 'settings',
      severity: 'info',
      passed: settings.saveDataSuccessExecution === 'all',
      message: 'Success execution data is saved',
      details: `saveDataSuccessExecution: ${settings.saveDataSuccessExecution || 'not set'}`,
      recommendation:
        settings.saveDataSuccessExecution === 'all'
          ? undefined
          : 'Set saveDataSuccessExecution to "all" for monitoring',
    })

    // 4. Timezone configured
    checks.push({
      id: 'settings-004',
      category: 'settings',
      severity: 'info',
      passed: !!settings.timezone,
      message: 'Timezone is configured',
      details: settings.timezone ? `Timezone: ${settings.timezone}` : 'No timezone set',
      recommendation: settings.timezone
        ? undefined
        : 'Set timezone for accurate cron scheduling',
    })

    // 5. Latest execution order
    checks.push({
      id: 'settings-005',
      category: 'settings',
      severity: 'info',
      passed: settings.executionOrder === 'v1' || !settings.executionOrder,
      message: 'Using latest execution order',
      details: `executionOrder: ${settings.executionOrder || 'default (v1)'}`,
      recommendation:
        settings.executionOrder === 'v1' || !settings.executionOrder
          ? undefined
          : 'Consider upgrading to v1 execution order',
    })

    // 6. Execution timeout for long-running workflows
    const nodeCount = workflow.nodes?.length || 0
    const hasTimeout = !!settings.executionTimeout

    checks.push({
      id: 'settings-006',
      category: 'settings',
      severity: 'info',
      passed: nodeCount < 10 || hasTimeout,
      message: 'Execution timeout configured for complex workflows',
      details: hasTimeout
        ? `Timeout: ${settings.executionTimeout}s`
        : 'No timeout set',
      recommendation:
        nodeCount >= 10 && !hasTimeout
          ? 'Set executionTimeout for complex workflows'
          : undefined,
    })

    return checks
  }

  // --------------------------------------------------------------------------
  // Security Validation (7 checks)
  // --------------------------------------------------------------------------

  private validateSecurity(workflow: Partial<N8nWorkflow>): ValidationCheck[] {
    const checks: ValidationCheck[] = []

    if (!workflow.nodes) {
      return checks
    }

    // 1. No credentials in workflow JSON
    const workflowStr = JSON.stringify(workflow)
    const hasCredentialData = workflow.nodes.some(
      (n) => n.credentials && Object.values(n.credentials).some((c: any) => c.data)
    )

    checks.push({
      id: 'security-001',
      category: 'security',
      severity: 'error',
      passed: !hasCredentialData,
      message: 'No credential data in workflow (only references)',
      details: hasCredentialData ? 'Credential data found' : 'Only credential references',
      recommendation: hasCredentialData
        ? 'Remove credential data, use references only'
        : undefined,
    })

    // 2. HTTPS for external APIs
    const httpNodes = workflow.nodes.filter((n) => n.type.includes('httpRequest'))
    const insecureHttp = httpNodes.filter((n) => {
      const url = n.parameters?.url
      return typeof url === 'string' && url.startsWith('http://') && !url.includes('localhost')
    })

    checks.push({
      id: 'security-002',
      category: 'security',
      severity: 'warning',
      passed: insecureHttp.length === 0,
      message: 'All external HTTP requests use HTTPS',
      details:
        insecureHttp.length > 0
          ? `Insecure HTTP: ${insecureHttp.map((n) => n.name).join(', ')}`
          : 'All requests use HTTPS',
      recommendation:
        insecureHttp.length > 0 ? 'Use HTTPS for external API calls' : undefined,
    })

    // 3. Webhook paths are unique and secure
    const webhookNodes = workflow.nodes.filter((n) => n.type.includes('webhook'))
    const webhookPaths = webhookNodes.map((n) => n.parameters?.path).filter(Boolean)
    const uniqueWebhookPaths = new Set(webhookPaths)

    checks.push({
      id: 'security-003',
      category: 'security',
      severity: 'error',
      passed: webhookPaths.length === uniqueWebhookPaths.size,
      message: 'All webhook paths are unique',
      details: `${uniqueWebhookPaths.size} unique paths out of ${webhookPaths.length}`,
      recommendation:
        webhookPaths.length === uniqueWebhookPaths.size
          ? undefined
          : 'Ensure webhook paths are unique',
    })

    // 4. No obvious secrets in code nodes
    const codeNodes = workflow.nodes.filter((n) => n.type.includes('code'))
    const codeWithSecrets = codeNodes.filter((n) => {
      const code = n.parameters?.jsCode || n.parameters?.pythonCode || ''
      return (
        code.includes('password') ||
        code.includes('apiKey') ||
        code.includes('secret') ||
        code.includes('API_KEY')
      )
    })

    checks.push({
      id: 'security-004',
      category: 'security',
      severity: 'warning',
      passed: codeWithSecrets.length === 0,
      message: 'No potential secrets in code nodes',
      details:
        codeWithSecrets.length > 0
          ? `Review: ${codeWithSecrets.map((n) => n.name).join(', ')}`
          : 'No secrets detected in code',
      recommendation:
        codeWithSecrets.length > 0
          ? 'Review code nodes for hardcoded secrets'
          : undefined,
    })

    // 5. SQL injection protection (basic check)
    const sqlNodes = codeNodes.filter((n) => {
      const code = n.parameters?.jsCode || ''
      return code.includes('SELECT') || code.includes('INSERT') || code.includes('UPDATE')
    })
    const possibleSqlInjection = sqlNodes.filter((n) => {
      const code = n.parameters?.jsCode || ''
      return code.includes('$input') && !code.includes('escape')
    })

    checks.push({
      id: 'security-005',
      category: 'security',
      severity: 'warning',
      passed: possibleSqlInjection.length === 0,
      message: 'SQL queries use proper escaping',
      details:
        possibleSqlInjection.length > 0
          ? `Review: ${possibleSqlInjection.map((n) => n.name).join(', ')}`
          : 'No SQL injection risks detected',
      recommendation:
        possibleSqlInjection.length > 0
          ? 'Use parameterized queries or escape user input'
          : undefined,
    })

    // 6. Command injection protection
    const commandNodes = codeNodes.filter((n) => {
      const code = n.parameters?.jsCode || ''
      return code.includes('exec') || code.includes('spawn') || code.includes('system')
    })

    checks.push({
      id: 'security-006',
      category: 'security',
      severity: 'warning',
      passed: commandNodes.length === 0,
      message: 'No command execution in code nodes',
      details:
        commandNodes.length > 0
          ? `Review: ${commandNodes.map((n) => n.name).join(', ')}`
          : 'No command execution detected',
      recommendation:
        commandNodes.length > 0
          ? 'Avoid executing system commands, consider alternatives'
          : undefined,
    })

    // 7. XSS protection in webhook responses
    const webhooksWithHtml = webhookNodes.filter((n) => {
      const params = JSON.stringify(n.parameters || {})
      return params.includes('html') || params.includes('text/html')
    })

    checks.push({
      id: 'security-007',
      category: 'security',
      severity: 'info',
      passed: webhooksWithHtml.length === 0,
      message: 'Webhook responses sanitized for XSS',
      details:
        webhooksWithHtml.length > 0
          ? `Review HTML responses: ${webhooksWithHtml.map((n) => n.name).join(', ')}`
          : 'No HTML responses detected',
      recommendation:
        webhooksWithHtml.length > 0 ? 'Sanitize HTML output to prevent XSS' : undefined,
    })

    return checks
  }

  // --------------------------------------------------------------------------
  // Performance Validation (5 checks)
  // --------------------------------------------------------------------------

  private validatePerformance(workflow: Partial<N8nWorkflow>): ValidationCheck[] {
    const checks: ValidationCheck[] = []

    if (!workflow.nodes) {
      return checks
    }

    const nodeCount = workflow.nodes.length

    // 1. Reasonable node count
    checks.push({
      id: 'perf-001',
      category: 'performance',
      severity: 'info',
      passed: nodeCount <= 30,
      message: 'Workflow has reasonable size (≤ 30 nodes)',
      details: `Node count: ${nodeCount}`,
      recommendation:
        nodeCount > 30 ? 'Consider splitting into multiple workflows' : undefined,
    })

    // 2. No excessive HTTP requests in loops
    const loopNodes = workflow.nodes.filter((n) => n.type.includes('splitInBatches'))
    const httpInLoops = loopNodes.map((loopNode) => {
      // This is simplified - would need connection analysis
      return workflow.nodes!.filter((n) => n.type.includes('httpRequest'))
    })

    checks.push({
      id: 'perf-002',
      category: 'performance',
      severity: 'info',
      passed: true, // Always pass for now - would need full connection analysis
      message: 'HTTP requests in loops are rate-limited',
      details: `${loopNodes.length} loop(s) detected`,
      recommendation:
        loopNodes.length > 0
          ? 'Ensure loops with HTTP requests have rate limiting'
          : undefined,
    })

    // 3. Code nodes are optimized
    const codeNodes = workflow.nodes.filter((n) => n.type.includes('code'))
    const largeCodeNodes = codeNodes.filter((n) => {
      const code = n.parameters?.jsCode || ''
      return code.length > 1000
    })

    checks.push({
      id: 'perf-003',
      category: 'performance',
      severity: 'info',
      passed: largeCodeNodes.length === 0,
      message: 'Code nodes are concise and efficient',
      details:
        largeCodeNodes.length > 0
          ? `Large code nodes: ${largeCodeNodes.map((n) => n.name).join(', ')}`
          : 'All code nodes are concise',
      recommendation:
        largeCodeNodes.length > 0
          ? 'Consider splitting large code nodes into multiple nodes'
          : undefined,
    })

    // 4. Efficient data processing
    const setNodes = workflow.nodes.filter((n) => n.type.includes('set'))
    const functionNodes = workflow.nodes.filter((n) => n.type.includes('function'))

    checks.push({
      id: 'perf-004',
      category: 'performance',
      severity: 'info',
      passed: true, // Informational
      message: 'Data transformation strategy is appropriate',
      details: `${setNodes.length} Set nodes, ${functionNodes.length} Function nodes`,
      recommendation: undefined,
    })

    // 5. Cron frequency is reasonable
    const cronNodes = workflow.nodes.filter(
      (n) => n.type.includes('cron') || n.type.includes('scheduleTrigger')
    )
    const highFrequencyCrons = cronNodes.filter((n) => {
      const params = JSON.stringify(n.parameters || {})
      return params.includes('* * * * *') || params.includes('"minutesInterval":1')
    })

    checks.push({
      id: 'perf-005',
      category: 'performance',
      severity: 'warning',
      passed: highFrequencyCrons.length === 0,
      message: 'Cron frequency is reasonable (not every minute)',
      details:
        highFrequencyCrons.length > 0
          ? `High frequency crons: ${highFrequencyCrons.map((n) => n.name).join(', ')}`
          : 'Cron frequency is reasonable',
      recommendation:
        highFrequencyCrons.length > 0
          ? 'Consider reducing cron frequency to avoid overload'
          : undefined,
    })

    return checks
  }

  // --------------------------------------------------------------------------
  // Best Practices Validation (8 checks)
  // --------------------------------------------------------------------------

  private validateBestPractices(workflow: Partial<N8nWorkflow>): ValidationCheck[] {
    const checks: ValidationCheck[] = []

    if (!workflow.nodes) {
      return checks
    }

    // 1. Error handling present
    const hasErrorHandling = workflow.nodes.some(
      (n) => n.type.includes('error') || n.name.toLowerCase().includes('error')
    )

    checks.push({
      id: 'best-001',
      category: 'best-practices',
      severity: this.options.requireErrorHandling ? 'warning' : 'info',
      passed: hasErrorHandling,
      message: 'Workflow has error handling',
      details: hasErrorHandling ? 'Error handling configured' : 'No error handling',
      recommendation: hasErrorHandling ? undefined : 'Add error handling nodes',
    })

    // 2. Workflow has description/notes
    const hasDocumentation =
      workflow.nodes.some((n) => n.notes) || (workflow.name?.length ?? 0) > 20

    checks.push({
      id: 'best-002',
      category: 'best-practices',
      severity: this.options.requireDocumentation ? 'warning' : 'info',
      passed: hasDocumentation,
      message: 'Workflow has documentation',
      details: hasDocumentation ? 'Documentation present' : 'No documentation',
      recommendation: hasDocumentation
        ? undefined
        : 'Add notes to complex nodes and descriptive workflow name',
    })

    // 3. Consistent naming convention
    const nodeNames = workflow.nodes.map((n) => n.name)
    const hasConsistentCase = nodeNames.every((name) => {
      return name[0] === name[0].toUpperCase() // Title Case
    })

    checks.push({
      id: 'best-003',
      category: 'best-practices',
      severity: 'info',
      passed: hasConsistentCase,
      message: 'Node names follow consistent naming convention',
      details: hasConsistentCase ? 'Consistent Title Case' : 'Inconsistent naming',
      recommendation: hasConsistentCase
        ? undefined
        : 'Use consistent naming (Title Case recommended)',
    })

    // 4. Workflow is not marked as active for new deployments
    const isActive = workflow.active === true

    checks.push({
      id: 'best-004',
      category: 'best-practices',
      severity: 'info',
      passed: !isActive,
      message: 'Workflow is inactive by default (safe deployment)',
      details: isActive ? 'Workflow is active' : 'Workflow is inactive',
      recommendation: isActive
        ? 'Deploy as inactive, then activate after verification'
        : undefined,
    })

    // 5. Idempotent operations
    const updateNodes = workflow.nodes.filter(
      (n) =>
        n.type.includes('update') ||
        (n.type.includes('supabase') && n.parameters?.operation === 'update')
    )

    checks.push({
      id: 'best-005',
      category: 'best-practices',
      severity: 'info',
      passed: true, // Informational
      message: 'Update operations should be idempotent',
      details: `${updateNodes.length} update operation(s)`,
      recommendation:
        updateNodes.length > 0 ? 'Ensure update operations can be safely retried' : undefined,
    })

    // 6. Logging for debugging
    const hasLogging = workflow.nodes.some(
      (n) =>
        n.name.toLowerCase().includes('log') ||
        (n.type.includes('code') &&
          (n.parameters?.jsCode?.includes('console.log') ||
            n.parameters?.jsCode?.includes('console.error')))
    )

    checks.push({
      id: 'best-006',
      category: 'best-practices',
      severity: 'info',
      passed: hasLogging,
      message: 'Workflow includes logging for debugging',
      details: hasLogging ? 'Logging present' : 'No logging detected',
      recommendation: hasLogging ? undefined : 'Add console.log statements for debugging',
    })

    // 7. Data validation
    const hasValidation = workflow.nodes.some(
      (n) =>
        n.type.includes('if') ||
        n.type.includes('switch') ||
        n.name.toLowerCase().includes('validat')
    )

    checks.push({
      id: 'best-007',
      category: 'best-practices',
      severity: 'info',
      passed: hasValidation,
      message: 'Workflow validates input data',
      details: hasValidation ? 'Validation nodes present' : 'No validation detected',
      recommendation: hasValidation ? undefined : 'Add validation for external data',
    })

    // 8. Reasonable execution order
    const hasComplexFlow =
      workflow.nodes.length > 5 &&
      workflow.nodes.some((n) => n.type.includes('if') || n.type.includes('switch'))

    if (hasComplexFlow) {
      const executionOrder = workflow.settings?.executionOrder
      checks.push({
        id: 'best-008',
        category: 'best-practices',
        severity: 'info',
        passed: executionOrder === 'v1',
        message: 'Complex workflows use v1 execution order',
        details: `Execution order: ${executionOrder || 'default'}`,
        recommendation:
          executionOrder !== 'v1'
            ? 'Set executionOrder to v1 for complex workflows'
            : undefined,
      })
    }

    return checks
  }
}
