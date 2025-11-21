# n8n Library for Master-Ops

Comprehensive TypeScript library for interacting with n8n workflows and automation.

---

## Features

- ✅ **Full n8n API Coverage** - Complete type-safe client for all n8n operations
- ✅ **Workflow Templates** - Pre-built templates for common automation patterns
- ✅ **Node Builders** - Easy-to-use builders for creating workflow nodes
- ✅ **Utilities** - Helper functions for cron, validation, and analysis
- ✅ **Type Safety** - Full TypeScript support with comprehensive types

---

## Installation

The library is already part of the master-ops monorepo. Just import and use:

```typescript
import { n8nClient, createCronWorkflow, CRON_SCHEDULES } from '@/shared/libs/n8n'
```

---

## Quick Start

### 1. Basic Usage

```typescript
import { n8nClient } from '@/shared/libs/n8n'

// List all workflows
const { data: workflows } = await n8nClient.listWorkflows()

// Get a specific workflow
const workflow = await n8nClient.getWorkflow('workflow-id')

// Execute a workflow
const execution = await n8nClient.executeWorkflow('workflow-id')

// Check connection
const isHealthy = await n8nClient.healthCheck()
```

### 2. Create a Workflow

```typescript
import { n8nClient, createCronWorkflow, createSupabaseNode, CRON_SCHEDULES } from '@/shared/libs/n8n'

// Create a simple monitoring workflow
const workflow = createCronWorkflow({
  name: 'Daily Task Monitor',
  schedule: CRON_SCHEDULES.DAILY_9AM,
  nodes: [
    createSupabaseNode({
      name: 'Get Failed Tasks',
      operation: 'select',
      table: 'tasks',
      position: [450, 300],
      filters: { status: { eq: 'failed' } },
    }),
  ],
  timezone: 'Australia/Melbourne',
})

// Upload to n8n
const created = await n8nClient.createWorkflow(workflow)
console.log(`Created workflow: ${created.id}`)
```

### 3. Manage Workflows

```typescript
import { n8nClient } from '@/shared/libs/n8n'

// Find workflows by name
const fitworkflows = await n8nClient.findWorkflowsByName('fitness')

// Get only active workflows
const active = await n8nClient.getActiveWorkflows()

// Clone a workflow
const cloned = await n8nClient.cloneWorkflow('original-id', 'New Workflow Name')

// Activate/deactivate
await n8nClient.activateWorkflow('workflow-id')
await n8nClient.deactivateWorkflow('workflow-id')

// Import from file
const imported = await n8nClient.importWorkflowFromFile('./workflows/my-workflow.json')

// Export to file
await n8nClient.exportWorkflowToFile('workflow-id', './backup/workflow.json')
```

### 4. Monitor Executions

```typescript
import { n8nClient, calculateSuccessRate, analyzeExecutionPatterns } from '@/shared/libs/n8n'

// Get recent executions
const executions = await n8nClient.getRecentExecutions('workflow-id', 50)

// Calculate success rate
const successRate = calculateSuccessRate(executions)
console.log(`Success rate: ${successRate.toFixed(2)}%`)

// Get detailed statistics
const stats = await n8nClient.getWorkflowStats('workflow-id')
console.log(`Total: ${stats.total}, Success: ${stats.success}, Errors: ${stats.error}`)

// Analyze patterns
const analysis = analyzeExecutionPatterns(executions)
console.log(`Peak hours: ${analysis.peakHours.join(', ')}`)
```

---

## API Reference

### N8nClient

The main client for interacting with n8n.

#### Workflow Methods

```typescript
// List workflows
listWorkflows(options?: { active?: boolean; tags?: string[] }): Promise<{ data: N8nWorkflow[] }>

// Get workflow by ID
getWorkflow(workflowId: string): Promise<N8nWorkflow>

// Create workflow
createWorkflow(workflow: Omit<N8nWorkflow, 'id'>): Promise<N8nWorkflow>

// Update workflow
updateWorkflow(workflowId: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow>

// Delete workflow
deleteWorkflow(workflowId: string): Promise<void>

// Activate/deactivate
activateWorkflow(workflowId: string): Promise<N8nWorkflow>
deactivateWorkflow(workflowId: string): Promise<N8nWorkflow>
```

#### Execution Methods

```typescript
// List executions
listExecutions(options?: { workflowId?: string; status?: string; limit?: number }): Promise<{ data: N8nExecution[] }>

// Get execution
getExecution(executionId: string): Promise<N8nExecution>

// Execute workflow
executeWorkflow(workflowId: string): Promise<N8nExecution>

// Delete execution
deleteExecution(executionId: string): Promise<void>
```

#### Utility Methods

```typescript
// Find by name pattern
findWorkflowsByName(pattern: string | RegExp): Promise<N8nWorkflow[]>

// Get active workflows
getActiveWorkflows(): Promise<N8nWorkflow[]>

// Clone workflow
cloneWorkflow(workflowId: string, newName?: string): Promise<N8nWorkflow>

// Import/export
importWorkflowFromFile(filePath: string): Promise<N8nWorkflow>
exportWorkflowToFile(workflowId: string, outputPath: string): Promise<void>

// Health check
healthCheck(): Promise<boolean>
```

---

## Workflow Templates

### Cron Workflow

```typescript
import { createCronWorkflow, CRON_SCHEDULES } from '@/shared/libs/n8n'

const workflow = createCronWorkflow({
  name: 'My Scheduled Task',
  schedule: CRON_SCHEDULES.EVERY_15_MINUTES,
  nodes: [/* your nodes */],
  timezone: 'Australia/Melbourne',
})
```

### Webhook Workflow

```typescript
import { createWebhookWorkflow } from '@/shared/libs/n8n'

const workflow = createWebhookWorkflow({
  name: 'API Endpoint',
  webhookPath: 'my-webhook',
  method: 'POST',
  nodes: [/* your nodes */],
})
```

---

## Node Builders

### Supabase Node

```typescript
import { createSupabaseNode } from '@/shared/libs/n8n'

const node = createSupabaseNode({
  name: 'Query Tasks',
  operation: 'select',
  table: 'tasks',
  position: [450, 300],
  filters: {
    status: { eq: 'pending' },
    created_at: { gte: '2025-01-01' },
  },
})
```

### HTTP Request Node

```typescript
import { createHttpNode } from '@/shared/libs/n8n'

const node = createHttpNode({
  name: 'Call External API',
  url: 'https://api.example.com/data',
  method: 'POST',
  position: [650, 300],
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json',
  },
  body: { key: 'value' },
})
```

### Code Node

```typescript
import { createCodeNode } from '@/shared/libs/n8n'

const node = createCodeNode({
  name: 'Transform Data',
  position: [850, 300],
  code: `
    const items = $input.all()
    return items.map(item => ({
      json: {
        ...item.json,
        processed: true,
        timestamp: new Date().toISOString()
      }
    }))
  `,
})
```

### IF Node

```typescript
import { createIfNode } from '@/shared/libs/n8n'

const node = createIfNode({
  name: 'Check Status',
  position: [1050, 300],
  conditions: [
    { field: 'status', operation: 'equals', value: 'active' },
    { field: 'count', operation: 'greaterThan', value: 0 },
  ],
})
```

### Set Node

```typescript
import { createSetNode } from '@/shared/libs/n8n'

const node = createSetNode({
  name: 'Add Fields',
  position: [1250, 300],
  values: {
    processed_at: '{{ $now }}',
    status: 'completed',
    user_id: '{{ $json.userId }}',
  },
})
```

---

## Utilities

### Cron Schedules

```typescript
import { CRON_SCHEDULES, parseCronExpression } from '@/shared/libs/n8n'

// Use predefined schedules
const schedule = CRON_SCHEDULES.DAILY_9AM // '0 9 * * *'

// Parse to human-readable
const readable = parseCronExpression('*/5 * * * *') // "Every 5 minutes"
```

### Workflow Validation

```typescript
import { validateWorkflow, checkNamingConvention } from '@/shared/libs/n8n'

// Validate workflow structure
const validation = validateWorkflow(workflow)
if (!validation.valid) {
  console.error('Errors:', validation.errors)
}

// Check naming convention
const naming = checkNamingConvention('my-workflow')
if (!naming.valid) {
  console.log('Issues:', naming.issues)
  console.log('Suggestions:', naming.suggestions)
}
```

### Execution Analysis

```typescript
import {
  calculateSuccessRate,
  analyzeExecutionPatterns,
  getExecutionDuration
} from '@/shared/libs/n8n'

const executions = await n8nClient.listExecutions()

// Success rate
const rate = calculateSuccessRate(executions.data)

// Detailed analysis
const analysis = analyzeExecutionPatterns(executions.data)
console.log({
  successRate: analysis.successRate,
  averageDuration: analysis.averageDuration,
  peakHours: analysis.peakHours,
  failureReasons: analysis.failureReasons,
})
```

### Workflow Documentation

```typescript
import { generateWorkflowDocs, sanitizeWorkflow } from '@/shared/libs/n8n'

// Generate markdown documentation
const workflow = await n8nClient.getWorkflow('workflow-id')
const docs = generateWorkflowDocs(workflow)
console.log(docs)

// Sanitize before export (remove sensitive data)
const sanitized = sanitizeWorkflow(workflow)
```

---

## Advanced Patterns

### Task Monitoring Workflow

```typescript
import { n8nClient, createTaskMonitoringWorkflow } from '@/shared/libs/n8n'

// Create a task monitoring workflow
const workflow = await createTaskMonitoringWorkflow(n8nClient, {
  schedule: '*/5 * * * *', // Every 5 minutes
  taskTable: 'tasks',
})

console.log(`Created task monitor: ${workflow.id}`)
```

### Data Sync Workflow

```typescript
import { n8nClient, createDataSyncWorkflow } from '@/shared/libs/n8n'

// Create a data sync workflow
const workflow = await createDataSyncWorkflow(n8nClient, {
  name: 'Supabase to HubSpot Sync',
  sourceTable: 'businesses',
  targetUrl: 'https://api.hubspot.com/crm/v3/objects/companies',
  schedule: '0 */4 * * *', // Every 4 hours
  transform: `
    const items = $input.all()
    return items.map(item => ({
      json: {
        name: item.json.business_name,
        domain: item.json.website,
        phone: item.json.phone,
      }
    }))
  `,
})

console.log(`Created sync workflow: ${workflow.id}`)
```

---

## Environment Variables

Required environment variables (set in `.env`):

```bash
N8N_BASE_URL=https://automation.growthcohq.com
N8N_API_KEY=your-api-key-here
```

---

## Error Handling

All methods throw descriptive errors:

```typescript
try {
  const workflow = await n8nClient.getWorkflow('invalid-id')
} catch (error) {
  console.error('Error:', error.message)
  // "n8n API Error (404 Not Found): Workflow not found"
}
```

---

## Best Practices

1. **Always use environment variables** for API credentials
2. **Validate workflows** before creating them
3. **Use workflow templates** for common patterns
4. **Monitor execution statistics** regularly
5. **Export workflows** for backup and version control
6. **Use descriptive names** for workflows and nodes
7. **Add error handling** in complex workflows
8. **Test in inactive mode** before activating

---

## Examples

See the following files for complete examples:

- [test-n8n-connection.ts](../../../test-n8n-connection.ts) - Connection testing
- [infra/n8n-workflows/importWorkflow.ts](../../../infra/n8n-workflows/importWorkflow.ts) - Import workflows
- [infra/n8n-workflows/README.md](../../../infra/n8n-workflows/README.md) - Workflow management guide

---

## Support

For issues or questions:
- Check the [n8n API Documentation](https://docs.n8n.io/api/)
- Review workflow examples in [infra/n8n-workflows/](../../../infra/n8n-workflows/)
- Test connection with `npx tsx test-n8n-connection.ts`

---

**Last Updated**: 2025-11-19
