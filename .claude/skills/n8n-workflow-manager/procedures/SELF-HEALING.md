# Self-Healing Procedures - n8n Workflow Manager

> Automated recovery procedures for common n8n workflow failures.

---

## Automation Levels

| Level | Description | Human Intervention |
|-------|-------------|-------------------|
| L0 | Fully automated, no alerts | None |
| L1 | Automated with alerts | Monitor only |
| L2 | Automated with approval | Confirm before action |
| L3 | Manual with guidance | Execute manually |

---

## Self-Healing Orchestrator

```typescript
// scripts/n8n-self-healing.ts
import { N8nClient } from '../shared/libs/n8n/client'

interface HealingResult {
  success: boolean
  action: string
  details: string
  level: 'L0' | 'L1' | 'L2' | 'L3'
}

interface FailedExecution {
  id: string
  workflowId: string
  workflowName: string
  errorMessage: string
  startedAt: string
}

class N8nSelfHealer {
  private client: N8nClient
  private maxRetries = 3
  private retryDelayMs = 5000

  constructor() {
    this.client = new N8nClient()
  }

  async diagnose(execution: FailedExecution): Promise<string> {
    const error = execution.errorMessage.toLowerCase()

    if (error.includes('401') || error.includes('unauthorized')) {
      return 'AUTH_EXPIRED'
    }
    if (error.includes('429') || error.includes('rate limit')) {
      return 'RATE_LIMITED'
    }
    if (error.includes('econnrefused') || error.includes('etimedout')) {
      return 'CONNECTION_FAILED'
    }
    if (error.includes('eai_again') || error.includes('dns')) {
      return 'DNS_FAILURE'
    }
    if (error.includes('hmac') || error.includes('signature')) {
      return 'HMAC_ERROR'
    }
    if (error.includes('credential')) {
      return 'CREDENTIAL_MISSING'
    }

    return 'UNKNOWN'
  }

  async heal(execution: FailedExecution): Promise<HealingResult> {
    const diagnosis = await this.diagnose(execution)

    switch (diagnosis) {
      case 'RATE_LIMITED':
        return this.healRateLimit(execution)
      case 'CONNECTION_FAILED':
        return this.healConnection(execution)
      case 'DNS_FAILURE':
        return this.healDns(execution)
      case 'AUTH_EXPIRED':
        return this.healAuth(execution)
      case 'HMAC_ERROR':
        return this.healHmac(execution)
      case 'CREDENTIAL_MISSING':
        return this.healCredential(execution)
      default:
        return {
          success: false,
          action: 'manual_review',
          details: `Unknown error pattern: ${execution.errorMessage.substring(0, 100)}`,
          level: 'L3'
        }
    }
  }

  // L0: Automatic retry with backoff
  private async healRateLimit(execution: FailedExecution): Promise<HealingResult> {
    console.log(`Rate limit detected for ${execution.workflowName}, waiting...`)

    // Wait for rate limit window to reset
    await this.delay(60000) // 1 minute

    try {
      await this.client.executeWorkflow(execution.workflowId)
      return {
        success: true,
        action: 'retry_after_delay',
        details: 'Workflow retried after 60s delay',
        level: 'L0'
      }
    } catch (error) {
      return {
        success: false,
        action: 'retry_failed',
        details: `Retry failed: ${error}`,
        level: 'L1'
      }
    }
  }

  // L0: Automatic retry with exponential backoff
  private async healConnection(execution: FailedExecution): Promise<HealingResult> {
    console.log(`Connection failure for ${execution.workflowName}, retrying...`)

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
      await this.delay(delay)

      try {
        await this.client.executeWorkflow(execution.workflowId)
        return {
          success: true,
          action: 'retry_with_backoff',
          details: `Succeeded on attempt ${attempt}`,
          level: 'L0'
        }
      } catch (error) {
        console.log(`Attempt ${attempt} failed: ${error}`)
      }
    }

    return {
      success: false,
      action: 'escalate',
      details: `Connection failure persisted after ${this.maxRetries} retries`,
      level: 'L2'
    }
  }

  // L0: DNS retry with longer delays
  private async healDns(execution: FailedExecution): Promise<HealingResult> {
    console.log(`DNS failure for ${execution.workflowName}, waiting for DNS...`)

    // DNS issues often resolve within minutes
    await this.delay(120000) // 2 minutes

    try {
      await this.client.executeWorkflow(execution.workflowId)
      return {
        success: true,
        action: 'dns_retry',
        details: 'Workflow retried after DNS stabilization',
        level: 'L0'
      }
    } catch (error) {
      return {
        success: false,
        action: 'dns_escalate',
        details: 'DNS failure persists - check network configuration',
        level: 'L2'
      }
    }
  }

  // L2: Auth issues require human intervention
  private async healAuth(execution: FailedExecution): Promise<HealingResult> {
    // Cannot auto-fix auth issues - need new credentials
    return {
      success: false,
      action: 'credential_refresh_needed',
      details: `Workflow ${execution.workflowName} needs credential refresh. Visit n8n credentials page.`,
      level: 'L2'
    }
  }

  // L3: HMAC issues need code review
  private async healHmac(execution: FailedExecution): Promise<HealingResult> {
    return {
      success: false,
      action: 'hmac_review',
      details: 'HMAC signature error - review Code node implementation. See ERROR-PATTERNS.md HMAC-001.',
      level: 'L3'
    }
  }

  // L2: Missing credentials need reconfiguration
  private async healCredential(execution: FailedExecution): Promise<HealingResult> {
    return {
      success: false,
      action: 'reconfigure_credential',
      details: `Credential missing for workflow ${execution.workflowName}. Open workflow in n8n and re-select credentials.`,
      level: 'L2'
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export { N8nSelfHealer }
```

---

## Procedure 1: AUTO-RETRY RATE LIMITS (L0)

### Trigger
Execution fails with 429 status code

### Automated Actions
1. Detect rate limit error
2. Wait for rate limit window to reset (1-5 minutes)
3. Retry workflow execution
4. If still failing, add 10-second delay between requests
5. Log outcome

### Implementation

```javascript
// n8n Code node for rate limit handling
const MAX_RETRIES = 3
let retryCount = $input.item.json.retryCount || 0

async function executeWithRetry() {
  try {
    // Your API call here
    const response = await $http.request({
      method: 'GET',
      url: 'https://api.example.com/data'
    })
    return response.data
  } catch (error) {
    if (error.response?.status === 429 && retryCount < MAX_RETRIES) {
      // Wait for rate limit reset
      const retryAfter = error.response.headers['retry-after'] || 60
      await new Promise(r => setTimeout(r, retryAfter * 1000))

      // Increment retry counter and loop back
      return {
        json: {
          ...$input.item.json,
          retryCount: retryCount + 1,
          _retry: true
        }
      }
    }
    throw error
  }
}

return await executeWithRetry()
```

---

## Procedure 2: AUTO-RETRY CONNECTION FAILURES (L0)

### Trigger
ECONNREFUSED, ETIMEDOUT, or network errors

### Automated Actions
1. Wait 2 seconds
2. Retry with exponential backoff (2s, 4s, 8s)
3. After 3 failures, deactivate workflow and alert
4. Log all attempts

### Implementation

```typescript
// Integrated into workflow with IF node + Loop Back

// Code node: checkConnectionError
const error = $input.item.json.error
const isConnectionError = error?.includes('ECONNREFUSED') ||
                          error?.includes('ETIMEDOUT') ||
                          error?.includes('ENOTFOUND')

return [{ json: { isConnectionError, ...($input.item.json) } }]

// After IF (true branch) - Wait node with expression:
// Delay: {{ Math.pow(2, $node["Set Retry Count"].json.retryCount) }} seconds
```

---

## Procedure 3: STALE WORKFLOW DETECTION (L1)

### Trigger
Workflow hasn't executed in expected window

### Expected Schedules

| Workflow Type | Expected Frequency |
|--------------|-------------------|
| sys-health-check | Every 5 minutes |
| *-order-sync | Every 15 minutes |
| *-product-sync | Daily |
| *-daily | Daily |
| *-weekly | Weekly |

### Monitoring Script

```typescript
// scripts/check-stale-workflows.ts
import { N8nClient } from '../shared/libs/n8n/client'

interface StaleWorkflow {
  id: string
  name: string
  lastExecution: string
  expectedFrequency: string
  hoursOverdue: number
}

async function checkStaleWorkflows(): Promise<StaleWorkflow[]> {
  const client = new N8nClient()
  const { data: workflows } = await client.listWorkflows({ active: true })
  const stale: StaleWorkflow[] = []

  const now = new Date()

  for (const workflow of workflows) {
    // Get expected frequency from name pattern
    let expectedHours = 24 // default daily

    if (workflow.name.includes('health-check')) expectedHours = 0.5
    else if (workflow.name.includes('-15min')) expectedHours = 0.5
    else if (workflow.name.includes('-hourly')) expectedHours = 2
    else if (workflow.name.includes('-daily')) expectedHours = 26
    else if (workflow.name.includes('-weekly')) expectedHours = 170

    // Get last execution
    const { data: executions } = await client.listExecutions({
      workflowId: workflow.id!,
      limit: 1
    })

    if (executions.length === 0) {
      stale.push({
        id: workflow.id!,
        name: workflow.name,
        lastExecution: 'never',
        expectedFrequency: `${expectedHours}h`,
        hoursOverdue: Infinity
      })
      continue
    }

    const lastExec = new Date(executions[0].startedAt)
    const hoursSince = (now.getTime() - lastExec.getTime()) / 1000 / 60 / 60

    if (hoursSince > expectedHours) {
      stale.push({
        id: workflow.id!,
        name: workflow.name,
        lastExecution: executions[0].startedAt,
        expectedFrequency: `${expectedHours}h`,
        hoursOverdue: Math.round(hoursSince - expectedHours)
      })
    }
  }

  return stale
}

// Auto-healing action
async function healStaleWorkflow(workflow: StaleWorkflow): Promise<void> {
  const client = new N8nClient()

  console.log(`Attempting to restart stale workflow: ${workflow.name}`)

  try {
    // Deactivate and reactivate to reset trigger
    await client.deactivateWorkflow(workflow.id)
    await new Promise(r => setTimeout(r, 2000))
    await client.activateWorkflow(workflow.id)

    // Force execution
    await client.executeWorkflow(workflow.id)

    console.log(`Successfully restarted: ${workflow.name}`)
  } catch (error) {
    console.error(`Failed to restart ${workflow.name}: ${error}`)
  }
}

export { checkStaleWorkflows, healStaleWorkflow }
```

---

## Procedure 4: FAILED EXECUTION RETRY (L0)

### Trigger
Workflow execution failed with retryable error

### Retryable Errors
- 429 Rate Limit
- 502 Bad Gateway
- 503 Service Unavailable
- 504 Gateway Timeout
- ECONNREFUSED
- ETIMEDOUT
- EAI_AGAIN

### Non-Retryable Errors
- 401 Unauthorized
- 403 Forbidden
- 400 Bad Request
- HMAC errors
- Credential missing

### Implementation

```typescript
// scripts/retry-failed-executions.ts
import { N8nClient } from '../shared/libs/n8n/client'

const RETRYABLE_PATTERNS = [
  /429/,
  /502/,
  /503/,
  /504/,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /EAI_AGAIN/i,
  /network error/i
]

async function retryFailedExecutions(): Promise<void> {
  const client = new N8nClient()

  // Get recent failures
  const { data: failures } = await client.listExecutions({
    status: 'error',
    limit: 50
  })

  for (const failure of failures) {
    const errorMessage = failure.data?.resultData?.error?.message || ''

    // Check if retryable
    const isRetryable = RETRYABLE_PATTERNS.some(p => p.test(errorMessage))

    if (!isRetryable) {
      console.log(`Skipping non-retryable error: ${failure.id}`)
      continue
    }

    // Check if already retried recently
    const retryOf = failure.retryOf
    if (retryOf) {
      console.log(`Already a retry, skipping: ${failure.id}`)
      continue
    }

    console.log(`Retrying execution: ${failure.id}`)

    try {
      // Use n8n's built-in retry
      const response = await fetch(
        `${process.env.N8N_BASE_URL}/api/v1/executions/${failure.id}/retry`,
        {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': process.env.N8N_API_KEY || ''
          }
        }
      )

      if (response.ok) {
        console.log(`Retry queued: ${failure.id}`)
      }
    } catch (error) {
      console.error(`Retry failed: ${failure.id} - ${error}`)
    }

    // Rate limit our retry attempts
    await new Promise(r => setTimeout(r, 1000))
  }
}

retryFailedExecutions()
```

---

## Procedure 5: CIRCUIT BREAKER (L1)

### Purpose
Prevent cascading failures by temporarily disabling problematic workflows

### Trigger
- 5+ consecutive failures within 30 minutes
- Same error pattern repeated

### Implementation

```typescript
// scripts/circuit-breaker.ts
import { N8nClient } from '../shared/libs/n8n/client'

interface CircuitState {
  workflowId: string
  failureCount: number
  lastFailure: Date
  state: 'closed' | 'open' | 'half-open'
}

const circuits: Map<string, CircuitState> = new Map()
const FAILURE_THRESHOLD = 5
const RESET_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

async function checkCircuit(workflowId: string, executionFailed: boolean): Promise<void> {
  const client = new N8nClient()

  let circuit = circuits.get(workflowId) || {
    workflowId,
    failureCount: 0,
    lastFailure: new Date(0),
    state: 'closed'
  }

  if (executionFailed) {
    circuit.failureCount++
    circuit.lastFailure = new Date()

    if (circuit.failureCount >= FAILURE_THRESHOLD) {
      circuit.state = 'open'

      // Trip circuit - deactivate workflow
      console.log(`Circuit OPEN for workflow ${workflowId} - deactivating`)
      await client.deactivateWorkflow(workflowId)

      // Schedule half-open check
      setTimeout(async () => {
        circuit.state = 'half-open'
        circuits.set(workflowId, circuit)

        // Attempt single execution
        console.log(`Circuit half-open for ${workflowId} - testing`)
        await client.activateWorkflow(workflowId)
        await client.executeWorkflow(workflowId)
      }, RESET_TIMEOUT_MS)
    }
  } else {
    // Success - reset circuit
    if (circuit.state === 'half-open') {
      console.log(`Circuit CLOSED for workflow ${workflowId} - recovered`)
    }
    circuit.failureCount = 0
    circuit.state = 'closed'
  }

  circuits.set(workflowId, circuit)
}

export { checkCircuit }
```

---

## Procedure 6: AUTOMATIC CREDENTIAL REFRESH ALERT (L2)

### Trigger
- 401/403 errors
- OAuth token expired
- "invalid_grant" errors

### Automated Actions
1. Detect auth failure
2. Log affected workflows
3. Send alert to Slack/email
4. Deactivate affected workflows to prevent noise

### Implementation

```typescript
// scripts/credential-refresh-alert.ts
async function alertCredentialRefresh(
  workflowName: string,
  credentialType: string,
  errorMessage: string
): Promise<void> {
  // Deactivate workflow to stop error spam
  // (done by self-healer)

  // Send alert
  const slackWebhook = process.env.SLACK_WEBHOOK_URL

  if (slackWebhook) {
    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🔐 Credential Refresh Required`,
        attachments: [{
          color: 'warning',
          fields: [
            { title: 'Workflow', value: workflowName, short: true },
            { title: 'Credential Type', value: credentialType, short: true },
            { title: 'Error', value: errorMessage.substring(0, 200) },
            { title: 'Action Required', value: 'Re-authenticate in n8n credentials page' }
          ]
        }]
      })
    })
  }

  // Log to Supabase
  // (implement if needed)
}

export { alertCredentialRefresh }
```

---

## Scheduled Self-Healing Jobs

### n8n Workflow: Self-Healing Orchestrator

```json
{
  "name": "Self-Healing Orchestrator",
  "nodes": [
    {
      "name": "Schedule",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": { "interval": [{ "field": "minutes", "minutesInterval": 5 }] }
      }
    },
    {
      "name": "Get Failed Executions",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{ $env.N8N_BASE_URL }}/api/v1/executions",
        "qs": { "status": "error", "limit": "50" },
        "headers": { "X-N8N-API-KEY": "={{ $env.N8N_API_KEY }}" }
      }
    },
    {
      "name": "Filter Retryable",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const RETRYABLE = [/429/, /502/, /503/, /ETIMEDOUT/i]\nconst failures = $input.all()\nreturn failures.filter(f => {\n  const err = f.json?.error?.message || ''\n  return RETRYABLE.some(p => p.test(err))\n})"
      }
    },
    {
      "name": "Retry Each",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "={{ $env.N8N_BASE_URL }}/api/v1/executions/{{ $json.id }}/retry",
        "headers": { "X-N8N-API-KEY": "={{ $env.N8N_API_KEY }}" }
      }
    }
  ]
}
```

---

## Monitoring Dashboard Metrics

| Metric | Query | Alert Threshold |
|--------|-------|-----------------|
| Self-healing success rate | healed / total failures | < 60% |
| L2+ escalations per day | count where level >= L2 | > 5 |
| Circuit breaker trips | count open circuits | > 2 |
| Retry attempts per hour | count retries | > 50 |
| Stale workflows | count overdue | > 3 |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
