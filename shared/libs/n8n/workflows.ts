/**
 * n8n Workflow Utilities
 *
 * Helper functions for common workflow operations and patterns
 */

import { N8nClient, N8nWorkflow, N8nNode } from './client'

// ============================================================================
// Workflow Templates
// ============================================================================

/**
 * Create a basic cron-triggered workflow
 */
export function createCronWorkflow(options: {
  name: string
  schedule: string
  nodes: N8nNode[]
  timezone?: string
}): Omit<N8nWorkflow, 'id' | 'createdAt' | 'updatedAt'> {
  const cronTrigger: N8nNode = {
    name: 'Cron Trigger',
    type: 'n8n-nodes-base.cron',
    typeVersion: 1,
    position: [250, 300],
    parameters: {
      triggerTimes: {
        item: [
          {
            mode: 'custom',
            cronExpression: options.schedule,
          },
        ],
      },
    },
  }

  return {
    name: options.name,
    nodes: [cronTrigger, ...options.nodes],
    connections: {},
    active: false,
    settings: {
      timezone: options.timezone || 'Australia/Melbourne',
      saveDataErrorExecution: 'all',
      saveDataSuccessExecution: 'all',
    },
  }
}

/**
 * Create a webhook-triggered workflow
 */
export function createWebhookWorkflow(options: {
  name: string
  webhookPath: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  nodes: N8nNode[]
}): Omit<N8nWorkflow, 'id' | 'createdAt' | 'updatedAt'> {
  const webhookTrigger: N8nNode = {
    name: 'Webhook',
    type: 'n8n-nodes-base.webhook',
    typeVersion: 1,
    position: [250, 300],
    parameters: {
      path: options.webhookPath,
      httpMethod: options.method || 'POST',
      responseMode: 'onReceived',
      options: {},
    },
    webhookId: options.webhookPath,
  }

  return {
    name: options.name,
    nodes: [webhookTrigger, ...options.nodes],
    connections: {},
    active: false,
    settings: {
      saveDataErrorExecution: 'all',
      saveDataSuccessExecution: 'all',
    },
  }
}

// ============================================================================
// Node Builders
// ============================================================================

/**
 * Create a Supabase query node
 */
export function createSupabaseNode(options: {
  name: string
  operation: 'select' | 'insert' | 'update' | 'delete'
  table: string
  position: [number, number]
  filters?: Record<string, any>
  data?: Record<string, any>
}): N8nNode {
  return {
    name: options.name,
    type: 'n8n-nodes-base.supabase',
    typeVersion: 1,
    position: options.position,
    parameters: {
      operation: options.operation,
      tableId: options.table,
      filterType: options.filters ? 'manual' : undefined,
      filters: options.filters,
      fieldsUi: options.data,
    },
    credentials: {
      supabaseApi: {
        id: 'supabase',
        name: 'Supabase account',
      },
    },
  }
}

/**
 * Create an HTTP request node
 */
export function createHttpNode(options: {
  name: string
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  position: [number, number]
  headers?: Record<string, string>
  body?: any
}): N8nNode {
  return {
    name: options.name,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4,
    position: options.position,
    parameters: {
      url: options.url,
      method: options.method || 'GET',
      sendHeaders: options.headers ? true : false,
      headerParameters: options.headers
        ? {
            parameters: Object.entries(options.headers).map(([name, value]) => ({
              name,
              value,
            })),
          }
        : undefined,
      sendBody: options.body ? true : false,
      bodyParameters: options.body,
    },
  }
}

/**
 * Create a Code node (JavaScript)
 */
export function createCodeNode(options: {
  name: string
  code: string
  position: [number, number]
}): N8nNode {
  return {
    name: options.name,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: options.position,
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: options.code,
    },
  }
}

/**
 * Create an IF node for conditional logic
 */
export function createIfNode(options: {
  name: string
  position: [number, number]
  conditions: Array<{
    field: string
    operation: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan'
    value: any
  }>
}): N8nNode {
  return {
    name: options.name,
    type: 'n8n-nodes-base.if',
    typeVersion: 1,
    position: options.position,
    parameters: {
      conditions: {
        conditions: options.conditions.map((cond) => ({
          leftValue: `={{ $json.${cond.field} }}`,
          operation: cond.operation,
          rightValue: cond.value,
        })),
      },
    },
  }
}

/**
 * Create a Set node to transform data
 */
export function createSetNode(options: {
  name: string
  position: [number, number]
  values: Record<string, any>
}): N8nNode {
  return {
    name: options.name,
    type: 'n8n-nodes-base.set',
    typeVersion: 3,
    position: options.position,
    parameters: {
      mode: 'manual',
      duplicateItem: false,
      assignments: {
        assignments: Object.entries(options.values).map(([name, value]) => ({
          name,
          value,
          type: typeof value === 'number' ? 'number' : 'string',
        })),
      },
    },
  }
}

// ============================================================================
// Workflow Patterns
// ============================================================================

/**
 * Create a Supabase task monitoring workflow
 */
export async function createTaskMonitoringWorkflow(
  client: N8nClient,
  options: {
    schedule?: string
    taskTable?: string
  } = {}
): Promise<N8nWorkflow> {
  const schedule = options.schedule || '*/5 * * * *' // Every 5 minutes
  const taskTable = options.taskTable || 'tasks'

  const nodes: N8nNode[] = [
    createSupabaseNode({
      name: 'Get Failed Tasks',
      operation: 'select',
      table: taskTable,
      position: [450, 300],
      filters: {
        status: { eq: 'failed' },
      },
    }),
    createIfNode({
      name: 'Has Failed Tasks?',
      position: [650, 300],
      conditions: [
        {
          field: 'length',
          operation: 'greaterThan',
          value: 0,
        },
      ],
    }),
    createCodeNode({
      name: 'Process Task Failures',
      position: [850, 300],
      code: `
// Process failed tasks
const failedTasks = $input.all()
console.log(\`Found \${failedTasks.length} failed tasks\`)

return failedTasks.map(task => ({
  json: {
    task_id: task.json.id,
    task_name: task.json.name,
    error: task.json.error,
    timestamp: new Date().toISOString()
  }
}))
      `.trim(),
    }),
  ]

  const workflow = createCronWorkflow({
    name: 'Task Monitoring - Failed Tasks',
    schedule,
    nodes,
    timezone: 'Australia/Melbourne',
  })

  return client.createWorkflow(workflow)
}

/**
 * Create a data sync workflow between systems
 */
export async function createDataSyncWorkflow(
  client: N8nClient,
  options: {
    name: string
    sourceTable: string
    targetUrl: string
    schedule?: string
    transform?: string
  }
): Promise<N8nWorkflow> {
  const schedule = options.schedule || '0 */4 * * *' // Every 4 hours

  const nodes: N8nNode[] = [
    createSupabaseNode({
      name: 'Fetch Data from Supabase',
      operation: 'select',
      table: options.sourceTable,
      position: [450, 300],
    }),
  ]

  if (options.transform) {
    nodes.push(
      createCodeNode({
        name: 'Transform Data',
        position: [650, 300],
        code: options.transform,
      })
    )
  }

  nodes.push(
    createHttpNode({
      name: 'Send to Target',
      url: options.targetUrl,
      method: 'POST',
      position: [850, 300],
    })
  )

  const workflow = createCronWorkflow({
    name: options.name,
    schedule,
    nodes,
  })

  return client.createWorkflow(workflow)
}

// ============================================================================
// Workflow Analysis
// ============================================================================

/**
 * Analyze workflow complexity
 */
export function analyzeWorkflow(workflow: N8nWorkflow): {
  nodeCount: number
  triggerType: string | null
  hasErrorHandling: boolean
  estimatedExecutionTime: string
  complexity: 'simple' | 'moderate' | 'complex'
} {
  const nodeCount = workflow.nodes.length
  const triggerNode = workflow.nodes.find((n) =>
    n.type.toLowerCase().includes('trigger') || n.type.toLowerCase().includes('webhook') || n.type.toLowerCase().includes('cron')
  )

  const hasErrorHandling = workflow.nodes.some(
    (n) => n.type.includes('error') || n.name.toLowerCase().includes('error')
  )

  let complexity: 'simple' | 'moderate' | 'complex' = 'simple'
  if (nodeCount > 10) complexity = 'complex'
  else if (nodeCount > 5) complexity = 'moderate'

  return {
    nodeCount,
    triggerType: triggerNode?.type || null,
    hasErrorHandling,
    estimatedExecutionTime: nodeCount > 10 ? '> 30s' : nodeCount > 5 ? '10-30s' : '< 10s',
    complexity,
  }
}

/**
 * Find unused nodes in a workflow
 */
export function findUnusedNodes(workflow: N8nWorkflow): N8nNode[] {
  // Track both source nodes (connection keys) and target nodes
  const connectedNodeNames = new Set<string>()

  // Add source nodes (nodes that have outgoing connections)
  Object.keys(workflow.connections).forEach((sourceName) => {
    connectedNodeNames.add(sourceName)
  })

  // Add target nodes (nodes that receive connections)
  Object.values(workflow.connections).forEach((connections) => {
    Object.values(connections).forEach((connectionList: any) => {
      connectionList.forEach((conn: any) => {
        conn.forEach((c: any) => {
          if (c.node) connectedNodeNames.add(c.node)
        })
      })
    })
  })

  return workflow.nodes.filter((node) => !connectedNodeNames.has(node.name))
}
