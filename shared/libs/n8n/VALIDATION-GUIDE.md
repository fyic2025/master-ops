# n8n Workflow Validation Guide

**Comprehensive pre-deployment validation for 100% confidence**

---

## Quick Start

### Validate a Workflow

```bash
# Validate from n8n (requires N8N_BASE_URL and N8N_API_KEY in .env)
npx tsx validate-workflow.ts wf-12345

# Validate from JSON file
npx tsx validate-workflow.ts ./workflows/my-workflow.json

# Validate production workflow backup
npx tsx validate-workflow.ts backup-wf-12345-1234567890.json
```

### Understanding Results

- **Score 90-100**: ✅ Excellent - Ready for production
- **Score 70-89**: 🟡 Good - Minor improvements recommended
- **Score <70**: 🔴 Needs work - Address critical issues

### Exit Codes

- `0` - Validation passed (no errors)
- `1` - Validation failed (has errors)

Use in CI/CD:
```bash
npx tsx validate-workflow.ts workflow.json || exit 1
```

---

## Validation Categories

The validator performs **60+ checks** across 8 categories:

### 1. Structure & Composition (10 checks)

**What it validates:**
- Workflow has a name ✅
- Workflow has nodes ✅
- Connections object exists ✅
- Has trigger node (cron, webhook, manual) ✅
- All nodes have unique names ✅
- All nodes have type and typeVersion ✅
- All nodes have position [x, y] ⚠️
- Workflow not too simple (> 1 node) ⚠️
- Workflow not too complex (< 50 nodes) ⚠️
- No unintentionally disabled nodes ℹ️

**Common Issues:**
- Missing trigger node → Add scheduleTrigger, webhook, or cron node
- Duplicate node names → Rename nodes to be unique
- No nodes defined → Add processing nodes to workflow

**Best Fix:**
```typescript
// Ensure workflow has:
workflow.nodes = [
  { name: 'Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger', ... },
  { name: 'Process Data', type: 'n8n-nodes-base.code', ... },
  // ... more nodes
]
```

---

### 2. Naming Conventions (5 checks)

**What it validates:**
- Name is descriptive (>= 5 characters) ⚠️
- Not generic ("workflow", "test", "untitled") ⚠️
- Appropriate case (not ALL CAPS) ℹ️
- Node names are descriptive ⚠️
- Has tags for organization ℹ️

**Common Issues:**
- Generic names like "My Workflow" → Use "Sync Orders to Unleashed"
- Node names like "Node1", "Set" → Use "Prepare Order Data", "Transform JSON"
- ALL CAPS names → Use Title Case or sentence case

**Best Practices:**
```typescript
// Good workflow names
"Sync Shopify Orders to Unleashed"
"Monitor Failed Tasks - Daily Cleanup"
"Process Customer Onboarding - Send Welcome Email"

// Good node names
"Fetch Ready Orders from Google Sheets"
"Transform Shopify to Unleashed Format"
"Send to Unleashed API"
"Update Sheet Status"

// Good tags
workflow.tags = ['automation', 'orders', 'integration']
```

---

### 3. Node Connections (8 checks)

**What it validates:**
- All connection sources reference existing nodes ✅
- All connection targets reference existing nodes ✅
- No orphaned nodes (unconnected) ⚠️
- Trigger has outgoing connections ✅
- No circular dependencies ⚠️
- IF nodes have both true/false paths ⚠️
- Loop nodes have proper connections ⚠️
- Connection structure is valid ✅

**Common Issues:**
- Orphaned nodes → Connect to workflow or remove
- Trigger not connected → Add connection from trigger to first node
- IF node missing false path → Add else branch
- Invalid connection targets → Fix or remove broken connections

**Connection Structure:**
```typescript
connections: {
  "Source Node": {
    "main": [
      [
        { "node": "Target Node", "type": "main", "index": 0 }
      ]
    ]
  },
  "IF Node": {
    "main": [
      [{ "node": "True Path", "type": "main", "index": 0 }],   // Output 0
      [{ "node": "False Path", "type": "main", "index": 0 }]    // Output 1
    ]
  }
}
```

---

### 4. Credentials & Authentication (3 checks)

**What it validates:**
- All credential IDs exist in n8n ✅
- Nodes that need credentials have them ⚠️
- No hardcoded secrets in parameters ⚠️

**Common Issues:**
- Missing credentials → Create in n8n UI or via API
- Hardcoded API keys → Move to credentials system
- HTTP nodes without auth → Add credential reference

**Secure Credentials:**
```typescript
// ❌ BAD - Hardcoded
node.parameters = {
  url: 'https://api.example.com',
  headers: {
    'X-API-Key': 'secret-key-12345'  // DON'T DO THIS
  }
}

// ✅ GOOD - Use credentials
node.credentials = {
  httpHeaderAuth: {
    id: 'cred-12345',
    name: 'API Credentials'
  }
}
```

---

### 5. Security (7 checks)

**What it validates:**
- No credential data in workflow (only references) ✅
- All external HTTP requests use HTTPS ⚠️
- Webhook paths are unique ✅
- No secrets in code nodes ⚠️
- SQL queries use proper escaping ⚠️
- No command execution (exec, spawn) ⚠️
- Webhook responses sanitized for XSS ℹ️

**Common Issues:**
- HTTP instead of HTTPS → Change to HTTPS
- Hardcoded passwords in code → Use environment variables or credentials
- SQL injection risk → Use parameterized queries
- Command injection → Avoid exec(), use safer alternatives

**Security Best Practices:**
```typescript
// ✅ HTTPS for external APIs
url: 'https://api.example.com'  // Good
url: 'http://api.example.com'   // Bad (unless localhost)

// ✅ SQL escaping
const query = `SELECT * FROM users WHERE id = ${db.escape(userId)}`

// ✅ No command execution
// Avoid: exec(), spawn(), system()
// Use: HTTP APIs, native Node.js libraries
```

---

### 6. Workflow Settings (6 checks)

**What it validates:**
- Has settings object ℹ️
- Saves error execution data ⚠️
- Saves success execution data ℹ️
- Timezone configured ℹ️
- Using latest execution order (v1) ℹ️
- Timeout set for complex workflows ℹ️

**Common Issues:**
- No error data saved → Can't debug failures
- Missing timezone → Cron schedules may be incorrect
- No timeout on long workflows → May run indefinitely

**Recommended Settings:**
```typescript
settings: {
  timezone: 'Australia/Melbourne',           // For accurate cron
  saveDataErrorExecution: 'all',             // Essential for debugging
  saveDataSuccessExecution: 'all',           // Useful for monitoring
  executionOrder: 'v1',                      // Latest execution model
  executionTimeout: 300,                     // 5 minutes (for complex workflows)
  saveManualExecutions: true                 // Save manual test runs
}
```

---

### 7. Performance (5 checks)

**What it validates:**
- Reasonable size (<= 30 nodes) ℹ️
- HTTP requests in loops are rate-limited ℹ️
- Code nodes are concise (< 1000 chars) ℹ️
- Efficient data transformation strategy ℹ️
- Cron frequency not too high (not every minute) ⚠️

**Common Issues:**
- Too many nodes → Split into multiple workflows
- Every-minute cron → Reduce to every 5-15 minutes
- Large code blocks → Split into multiple code nodes
- Uncontrolled loop HTTP requests → Add delays/batching

**Performance Tips:**
```typescript
// ✅ Reasonable cron frequency
"*/15 * * * *"  // Every 15 minutes - Good
"*/5 * * * *"   // Every 5 minutes - OK
"* * * * *"     // Every minute - Usually too frequent

// ✅ Rate limiting in loops
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
for (const item of items) {
  await processItem(item)
  await delay(100)  // 100ms delay between requests
}

// ✅ Batch processing
// Process in chunks of 10
for (let i = 0; i < items.length; i += 10) {
  const batch = items.slice(i, i + 10)
  await processBatch(batch)
}
```

---

### 8. Best Practices (8 checks)

**What it validates:**
- Workflow has error handling ⚠️/ℹ️
- Workflow has documentation ⚠️/ℹ️
- Consistent naming convention ℹ️
- Workflow inactive by default ℹ️
- Update operations are idempotent ℹ️
- Includes logging for debugging ℹ️
- Validates input data ℹ️
- Complex workflows use v1 execution ℹ️

**Common Issues:**
- No error handling → Workflow fails completely on any error
- No documentation → Hard to maintain
- Inconsistent naming → Confusion
- Active on import → May execute unexpectedly

**Best Practice Patterns:**
```typescript
// ✅ Error handling
nodes: [
  { name: 'Try Operation', type: 'n8n-nodes-base.code', ... },
  { name: 'On Error', type: 'n8n-nodes-base.errorTrigger', ... },
  { name: 'Log Error', type: 'n8n-nodes-base.code', ... }
]

// ✅ Logging
const code = `
  console.log('Processing items:', items.length)
  const results = items.map(item => {
    console.log('Processing:', item.id)
    return processItem(item)
  })
  console.log('Completed:', results.length)
  return results
`

// ✅ Input validation
nodes: [
  { name: 'Validate Input', type: 'n8n-nodes-base.if', ... },
  // If valid → continue
  // If invalid → log and exit
]

// ✅ Idempotent updates
// Use upsert instead of insert
// Check before update
// Use unique identifiers
```

---

## Severity Levels

### ✅ Error (Critical)
- **Must fix before deployment**
- Workflow will fail or behave incorrectly
- Examples:
  - Missing trigger node
  - Broken connections
  - Missing credentials
  - Invalid structure

### ⚠️ Warning
- **Should fix for production**
- May cause issues or sub-optimal behavior
- Examples:
  - Missing error handling
  - Generic naming
  - No timezone set
  - HTTPS not used

### ℹ️ Info
- **Nice to have**
- Improves maintainability and robustness
- Examples:
  - No tags
  - No documentation
  - Could add logging
  - Missing input validation

---

## Scoring System

**Formula**: `100 - (errors × 10) - (warnings × 2)`

**Examples:**
- 0 errors, 0 warnings = 100 points ✅
- 0 errors, 5 warnings = 90 points 🟢
- 1 error, 2 warnings = 86 points 🟡
- 2 errors, 5 warnings = 70 points 🟡
- 3 errors, 10 warnings = 50 points 🔴

**Target Scores:**
- **Production**: >= 90 (excellent)
- **Staging**: >= 80 (good)
- **Development**: >= 70 (acceptable)

---

## Validation Options

### Programmatic Usage

```typescript
import { WorkflowValidator } from './shared/libs/n8n/validator'
import { n8nClient } from './shared/libs/n8n'

const validator = new WorkflowValidator(n8nClient, {
  strict: true,                    // Enable strict checking
  checkCredentials: true,          // Verify credentials in n8n
  checkConnections: true,          // Deep connection validation
  requireErrorHandling: false,     // Make error handling mandatory
  requireDocumentation: false,     // Make documentation mandatory
})

const workflow = await n8nClient.getWorkflow('wf-12345')
const result = await validator.validate(workflow)

if (result.valid) {
  console.log('✅ Validation passed!')
  console.log(`Score: ${result.score}/100`)
} else {
  console.log('❌ Validation failed')
  console.log('Critical issues:', result.summary.criticalIssues)
}
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Validate n8n Workflows
  run: |
    for file in workflows/*.json; do
      npx tsx validate-workflow.ts "$file" || exit 1
    done
```

```bash
# Pre-commit hook
#!/bin/bash
for file in $(git diff --cached --name-only | grep '\.json$'); do
  if [[ $file == workflows/* ]]; then
    npx tsx validate-workflow.ts "$file" || exit 1
  fi
done
```

---

## Common Workflow Issues & Fixes

### Issue: "No trigger node found"
**Cause**: Workflow has no trigger to start execution
**Fix**: Add a trigger node
```typescript
{
  name: 'Schedule',
  type: 'n8n-nodes-base.scheduleTrigger',
  typeVersion: 1.1,
  position: [240, 300],
  parameters: {
    rule: {
      interval: [{ field: 'minutes', minutesInterval: 15 }]
    }
  }
}
```

### Issue: "All nodes have unique names"
**Cause**: Multiple nodes with same name
**Fix**: Rename nodes
```typescript
// ❌ Bad
{ name: 'Set', ... }
{ name: 'Set', ... }  // Duplicate!

// ✅ Good
{ name: 'Set Order Data', ... }
{ name: 'Set Customer Info', ... }
```

### Issue: "Orphaned nodes (unconnected)"
**Cause**: Nodes not connected to workflow
**Fix**: Connect or remove
```typescript
connections: {
  'Trigger': {
    main: [[{ node: 'Orphaned Node', type: 'main', index: 0 }]]
  }
}
```

### Issue: "Missing credential ID: cred-12345"
**Cause**: Credential doesn't exist in n8n
**Fix**: Create credential in n8n UI or update ID

### Issue: "Cron frequency too high"
**Cause**: Workflow runs every minute
**Fix**: Reduce frequency
```typescript
// ❌ Too frequent
"*/1 * * * *"  // Every minute

// ✅ Better
"*/15 * * * *"  // Every 15 minutes
"0 * * * *"     // Hourly
"0 */4 * * *"   // Every 4 hours
```

---

## Advanced Topics

### Custom Validation Rules

```typescript
// Add custom checks
const customChecks: ValidationCheck[] = []

// Check for specific node type
const hasSlackNode = workflow.nodes.some(n => n.type.includes('slack'))
customChecks.push({
  id: 'custom-001',
  category: 'best-practices',
  severity: 'info',
  passed: hasSlackNode,
  message: 'Workflow sends Slack notifications',
  recommendation: hasSlackNode ? undefined : 'Add Slack notification for failures'
})

// Merge with validation result
result.checks.push(...customChecks)
```

### Batch Validation

```typescript
// Validate all workflows
const workflows = await n8nClient.listWorkflows()

for (const workflow of workflows.data) {
  const fullWorkflow = await n8nClient.getWorkflow(workflow.id!)
  const result = await validator.validate(fullWorkflow)

  console.log(`${workflow.name}: ${result.score}/100`)

  if (!result.valid) {
    console.log('Issues:', result.summary.criticalIssues)
  }
}
```

### Pre-Deployment Checklist

Use this before deploying any workflow:

- [ ] Run `npx tsx validate-workflow.ts <workflow>` ✅
- [ ] Score >= 90 ✅
- [ ] All errors fixed ✅
- [ ] Credentials exist and valid ✅
- [ ] Test execution successful ✅
- [ ] Error handling tested ✅
- [ ] Documentation added ✅
- [ ] Code review complete ✅
- [ ] Deploy as inactive first ✅
- [ ] Manual test in production ✅
- [ ] Activate workflow ✅
- [ ] Monitor first 24 hours ✅

---

## Validation Report

The validator generates a detailed JSON report:

```json
{
  "valid": false,
  "score": 86,
  "checks": [
    {
      "id": "struct-001",
      "category": "structure",
      "severity": "error",
      "passed": true,
      "message": "Workflow has a name",
      "details": "Name: \"Sync Orders to Unleashed\""
    }
    // ... 60+ checks
  ],
  "summary": {
    "totalChecks": 49,
    "passed": 40,
    "failed": 9,
    "warnings": 2,
    "errors": 1,
    "criticalIssues": [
      "Workflow has a trigger node"
    ]
  }
}
```

Use this report for:
- CI/CD metrics
- Quality tracking over time
- Team dashboards
- Compliance auditing

---

## Next Steps

1. **Run validation** on all existing workflows
2. **Fix critical errors** (score < 90)
3. **Address warnings** for production workflows
4. **Add to CI/CD** pipeline
5. **Monitor scores** over time
6. **Customize rules** for your team's standards

---

**Congratulations!** You now have a comprehensive validation system for n8n workflows. Use it before every deployment to ensure 100% confidence. 🚀
